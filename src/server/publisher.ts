import { one, query, run, transaction, uid, now } from "./db";
import { computeCost, debit, refund } from "./credits";
import { publishPost, fetchMetrics } from "./x-api";
import { getValidXConnection } from "./x-oauth";
import { plan } from "./plans";
import type { Draft, Workspace, XConnection } from "./types";

const MAX_ATTEMPTS = 3;

/**
 * Publie un brouillon : débit préalable, appel X, puis remboursement si la
 * diffusion échoue. Les crédits ne sont donc consommés que par une
 * publication réussie, conformément à la règle annoncée.
 */
export async function publishDraft(
  connection: XConnection | null,
  workspace: Workspace,
  draft: Draft,
): Promise<{ ok: boolean; message: string }> {
  if (draft.status === "published") {
    return { ok: true, message: "Publication déjà diffusée." };
  }

  const cost = computeCost(draft.content, draft.media_kind);

  if (!(await debit(workspace.id, cost, "Publication X", draft.id))) {
    await run(`UPDATE drafts SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`, [
      `Crédits insuffisants : ${cost} requis.`,
      now(),
      draft.id,
    ]);
    return { ok: false, message: `Crédits insuffisants : ${cost} requis.` };
  }

  await run(
    `UPDATE drafts SET status = 'publishing', credit_cost = ?, attempts = attempts + 1,
      updated_at = ? WHERE id = ?`,
    [cost, now(), draft.id],
  );

  const validConnection = connection ? await getValidXConnection(connection) : null;
  const result = await publishPost(validConnection, draft.content);

  if (result.ok) {
    await run(
      `UPDATE drafts SET status = 'published', x_post_id = ?, published_at = ?,
        error = NULL, updated_at = ? WHERE id = ?`,
      [result.postId, now(), now(), draft.id],
    );

    return {
      ok: true,
      message: result.simulated
        ? `Publication simulée (aucun compte X connecté) — ${cost} crédits débités.`
        : `Publié sur X — ${cost} crédits débités.`,
    };
  }

  // Échec : on rembourse systématiquement le débit effectué plus haut.
  await refund(workspace.id, cost, "Remboursement — publication échouée", draft.id);

  const attempts = draft.attempts + 1;
  const giveUp = !result.retryable || attempts >= MAX_ATTEMPTS;

  await run(`UPDATE drafts SET status = ?, error = ?, updated_at = ? WHERE id = ?`, [
    giveUp ? "failed" : "scheduled",
    result.error,
    now(),
    draft.id,
  ]);

  return {
    ok: false,
    message: giveUp
      ? `Échec définitif : ${result.error}`
      : `Échec temporaire, nouvelle tentative programmée : ${result.error}`,
  };
}

/** Traite toutes les publications arrivées à échéance. */
export async function runDueDrafts(): Promise<{ processed: number; published: number }> {
  const due = await query<Draft & { _user_id: string }>(
    `SELECT d.*, w.user_id AS _user_id FROM drafts d
     JOIN workspaces w ON w.id = d.workspace_id
     WHERE d.status = 'scheduled' AND d.scheduled_at IS NOT NULL AND d.scheduled_at <= ?
     ORDER BY d.scheduled_at ASC LIMIT 25`,
    [now()],
  );

  let published = 0;

  for (const row of due) {
    const connection = await one<XConnection>(`SELECT * FROM x_connections WHERE user_id = ?`, [
      row._user_id,
    ]);
    const workspace = await one<Workspace>(`SELECT * FROM workspaces WHERE id = ?`, [
      row.workspace_id,
    ]);
    if (!workspace) continue;

    const result = await publishDraft(connection, workspace, row);
    if (result.ok) published += 1;
  }

  return { processed: due.length, published };
}

/**
 * Rafraîchit les métriques des publications diffusées, dans la limite de
 * l'échantillon et de la cadence propres à l'offre.
 */
export async function refreshMetrics(connection: XConnection | null, workspace: Workspace) {
  const settings = plan(workspace.plan);

  const posts = await query<{ id: string; x_post_id: string; fetched_at: number | null }>(
    `SELECT d.id, d.x_post_id, m.fetched_at FROM drafts d
     LEFT JOIN post_metrics m ON m.draft_id = d.id
     WHERE d.workspace_id = ? AND d.status = 'published' AND d.x_post_id IS NOT NULL
     ORDER BY d.published_at DESC LIMIT ?`,
    [workspace.id, settings.analyticsSampleSize],
  );

  const staleAfter = settings.analyticsRefreshHours * 60 * 60 * 1000;
  const stale = posts.filter(
    (post) => !post.fetched_at || now() - Number(post.fetched_at) > staleAfter,
  );

  if (stale.length === 0) return { refreshed: 0 };

  const metrics = await fetchMetrics(
    connection,
    stale.map((post) => post.x_post_id),
  );

  await transaction(async (tx) => {
    for (const post of stale) {
      const value = metrics.get(post.x_post_id);
      if (!value) continue;
      await tx.run(
        `INSERT INTO post_metrics (id, draft_id, impressions, likes, reposts, replies, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (draft_id) DO UPDATE SET
           impressions = EXCLUDED.impressions, likes = EXCLUDED.likes,
           reposts = EXCLUDED.reposts, replies = EXCLUDED.replies,
           fetched_at = EXCLUDED.fetched_at`,
        [uid("met"), post.id, value.impressions, value.likes, value.reposts, value.replies, now()],
      );
    }
  });

  return { refreshed: stale.length };
}
