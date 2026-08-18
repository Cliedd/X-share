import { db, uid, now } from "./db";
import { computeCost, debit, refund } from "./credits";
import { publishPost, fetchMetrics } from "./x-api";
import { plan } from "./plans";
import type { Draft, User, Workspace } from "./types";

const MAX_ATTEMPTS = 3;

/**
 * Publie un brouillon : débit préalable, appel X, puis remboursement si la
 * diffusion échoue. Les crédits ne sont donc consommés que par une
 * publication réussie, conformément à la règle annoncée.
 */
export async function publishDraft(
  user: User,
  workspace: Workspace,
  draft: Draft,
): Promise<{ ok: boolean; message: string }> {
  if (draft.status === "published") {
    return { ok: true, message: "Publication déjà diffusée." };
  }

  const cost = computeCost(draft.content, draft.media_kind);

  if (!debit(workspace.id, cost, "Publication X", draft.id)) {
    db()
      .prepare(`UPDATE drafts SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`)
      .run(`Crédits insuffisants : ${cost} requis.`, now(), draft.id);
    return { ok: false, message: `Crédits insuffisants : ${cost} requis.` };
  }

  db()
    .prepare(
      `UPDATE drafts SET status = 'publishing', credit_cost = ?, attempts = attempts + 1,
        updated_at = ? WHERE id = ?`,
    )
    .run(cost, now(), draft.id);

  const result = await publishPost(user, draft.content);

  if (result.ok) {
    db()
      .prepare(
        `UPDATE drafts SET status = 'published', x_post_id = ?, published_at = ?,
          error = NULL, updated_at = ? WHERE id = ?`,
      )
      .run(result.postId, now(), now(), draft.id);

    return {
      ok: true,
      message: result.simulated
        ? `Publication simulée (aucun compte X connecté) — ${cost} crédits débités.`
        : `Publié sur X — ${cost} crédits débités.`,
    };
  }

  // Échec : on rembourse systématiquement le débit effectué plus haut.
  refund(workspace.id, cost, "Remboursement — publication échouée", draft.id);

  const attempts = draft.attempts + 1;
  const giveUp = !result.retryable || attempts >= MAX_ATTEMPTS;

  db()
    .prepare(`UPDATE drafts SET status = ?, error = ?, updated_at = ? WHERE id = ?`)
    .run(giveUp ? "failed" : "scheduled", result.error, now(), draft.id);

  return {
    ok: false,
    message: giveUp
      ? `Échec définitif : ${result.error}`
      : `Échec temporaire, nouvelle tentative programmée : ${result.error}`,
  };
}

/** Traite toutes les publications arrivées à échéance. */
export async function runDueDrafts(): Promise<{ processed: number; published: number }> {
  const due = db()
    .prepare(
      `SELECT d.*, u.id AS _user_id FROM drafts d
       JOIN workspaces w ON w.id = d.workspace_id
       JOIN users u ON u.id = w.user_id
       WHERE d.status = 'scheduled' AND d.scheduled_at IS NOT NULL AND d.scheduled_at <= ?
       ORDER BY d.scheduled_at ASC LIMIT 25`,
    )
    .all(now()) as Array<Draft & { _user_id: string }>;

  let published = 0;

  for (const row of due) {
    const user = db().prepare(`SELECT * FROM users WHERE id = ?`).get(row._user_id) as User;
    const workspace = db()
      .prepare(`SELECT * FROM workspaces WHERE id = ?`)
      .get(row.workspace_id) as Workspace;

    const result = await publishDraft(user, workspace, row);
    if (result.ok) published += 1;
  }

  return { processed: due.length, published };
}

/**
 * Rafraîchit les métriques des publications diffusées, dans la limite de
 * l'échantillon et de la cadence propres à l'offre.
 */
export async function refreshMetrics(user: User, workspace: Workspace) {
  const settings = plan(workspace.plan);

  const posts = db()
    .prepare(
      `SELECT d.id, d.x_post_id, m.fetched_at FROM drafts d
       LEFT JOIN post_metrics m ON m.draft_id = d.id
       WHERE d.workspace_id = ? AND d.status = 'published' AND d.x_post_id IS NOT NULL
       ORDER BY d.published_at DESC LIMIT ?`,
    )
    .all(workspace.id, settings.analyticsSampleSize) as Array<{
    id: string;
    x_post_id: string;
    fetched_at: number | null;
  }>;

  const staleAfter = settings.analyticsRefreshHours * 60 * 60 * 1000;
  const stale = posts.filter((post) => !post.fetched_at || now() - post.fetched_at > staleAfter);

  if (stale.length === 0) return { refreshed: 0 };

  const metrics = await fetchMetrics(
    user,
    stale.map((post) => post.x_post_id),
  );

  const upsert = db().prepare(
    `INSERT INTO post_metrics (id, draft_id, impressions, likes, reposts, replies, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(draft_id) DO UPDATE SET
       impressions = excluded.impressions, likes = excluded.likes,
       reposts = excluded.reposts, replies = excluded.replies,
       fetched_at = excluded.fetched_at`,
  );

  const write = db().transaction(() => {
    for (const post of stale) {
      const value = metrics.get(post.x_post_id);
      if (!value) continue;
      upsert.run(
        uid("met"),
        post.id,
        value.impressions,
        value.likes,
        value.reposts,
        value.replies,
        now(),
      );
    }
  });
  write();

  return { refreshed: stale.length };
}
