import { one, run, uid, now, type Tx } from "./db";
import type { MediaKind, Workspace } from "./types";
import { plan } from "./plans";

/**
 * Barème de crédits, tel qu'annoncé sur la page tarifaire :
 * texte 1 · image 2 · vidéo 4 · lien 10, avec tarif combiné lorsque la
 * publication porte à la fois un lien et un média.
 */
export const COST = { text: 1, image: 2, video: 4, link: 10 } as const;

const URL_PATTERN = /https?:\/\/[^\s<>"]+/i;

export function containsLink(content: string) {
  return URL_PATTERN.test(content);
}

/** Coût d'une publication : les composants se cumulent sur la base texte. */
export function computeCost(content: string, media: MediaKind = "none") {
  let cost = COST.text;
  if (media === "image") cost += COST.image;
  if (media === "video") cost += COST.video;
  if (containsLink(content)) cost += COST.link;
  return cost;
}

export async function ledger(
  workspaceId: string,
  delta: number,
  reason: string,
  draftId?: string,
  tx?: Tx,
) {
  const exec = tx?.run ?? run;
  await exec(
    `INSERT INTO credit_ledger (id, workspace_id, delta, reason, draft_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uid("led"), workspaceId, delta, reason, draftId ?? null, now()],
  );
}

/**
 * Débite les crédits de façon atomique : la mise à jour ne s'applique que si
 * le solde est suffisant, ce qui évite qu'une publication concurrente ne
 * fasse passer le compteur sous zéro.
 */
export async function debit(
  workspaceId: string,
  amount: number,
  reason: string,
  draftId?: string,
) {
  const changed = await run(
    `UPDATE workspaces SET credits_remaining = credits_remaining - ?
     WHERE id = ? AND credits_remaining >= ?`,
    [amount, workspaceId, amount],
  );

  if (changed === 0) return false;
  await ledger(workspaceId, -amount, reason, draftId);
  return true;
}

/** Recrédite — utilisé quand une publication échoue. */
export async function refund(
  workspaceId: string,
  amount: number,
  reason: string,
  draftId?: string,
) {
  await run(`UPDATE workspaces SET credits_remaining = credits_remaining + ? WHERE id = ?`, [
    amount,
    workspaceId,
  ]);
  await ledger(workspaceId, amount, reason, draftId);
}

/**
 * Réinitialise le quota mensuel si la date de renouvellement est passée.
 * La condition est portée par la requête elle-même : deux requêtes
 * simultanées ne peuvent pas créditer deux fois.
 */
export async function ensureCreditCycle(workspace: Workspace): Promise<Workspace> {
  if (Number(workspace.credits_reset_at) > now()) return workspace;

  const monthly = plan(workspace.plan).monthlyCredits;
  const nextReset = now() + 30 * 24 * 60 * 60 * 1000;

  const changed = await run(
    `UPDATE workspaces SET credits_remaining = ?, credits_reset_at = ?
     WHERE id = ? AND credits_reset_at <= ?`,
    [monthly, nextReset, workspace.id, now()],
  );

  if (changed === 0) {
    // Une autre requête a déjà renouvelé : on relit l'état à jour.
    const fresh = await one<Workspace>(`SELECT * FROM workspaces WHERE id = ?`, [workspace.id]);
    return fresh ?? workspace;
  }

  await ledger(workspace.id, monthly, "Renouvellement mensuel du quota");
  return { ...workspace, credits_remaining: monthly, credits_reset_at: nextReset };
}
