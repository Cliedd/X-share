import { query, one } from "./db";
import type { Connector, Draft, LedgerEntry, SourceItem, Workspace } from "./types";

export type DraftWithSource = Draft & {
  source_title: string | null;
  source_url: string | null;
  impressions: number | null;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
};

const DRAFT_SELECT = `
  SELECT d.*, s.title AS source_title, s.url AS source_url,
         m.impressions, m.likes, m.reposts, m.replies
  FROM drafts d
  LEFT JOIN source_items s ON s.id = d.source_item_id
  LEFT JOIN post_metrics m ON m.draft_id = d.id
`;

export function listConnectors(workspaceId: string) {
  return query<Connector>(
    `SELECT * FROM connectors WHERE workspace_id = ? ORDER BY created_at DESC`,
    [workspaceId],
  );
}

export function connectorCounts(workspaceId: string) {
  return query<{ id: string; total: string; pending: string }>(
    `SELECT c.id, COUNT(s.id) AS total,
            COALESCE(SUM(CASE WHEN s.processed = 0 THEN 1 ELSE 0 END), 0) AS pending
     FROM connectors c LEFT JOIN source_items s ON s.connector_id = c.id
     WHERE c.workspace_id = ? GROUP BY c.id`,
    [workspaceId],
  );
}

export function listDrafts(workspaceId: string, statuses?: string[]) {
  if (statuses && statuses.length > 0) {
    return query<DraftWithSource>(
      `${DRAFT_SELECT} WHERE d.workspace_id = ? AND d.status = ANY(?)
       ORDER BY COALESCE(d.scheduled_at, d.updated_at) DESC`,
      [workspaceId, statuses],
    );
  }

  return query<DraftWithSource>(
    `${DRAFT_SELECT} WHERE d.workspace_id = ? ORDER BY d.updated_at DESC`,
    [workspaceId],
  );
}

export function getDraft(workspaceId: string, draftId: string) {
  return one<Draft>(`SELECT * FROM drafts WHERE id = ? AND workspace_id = ?`, [
    draftId,
    workspaceId,
  ]);
}

/** Publications programmées ou diffusées à l'intérieur d'une fenêtre donnée. */
export function draftsInRange(workspaceId: string, from: number, to: number) {
  return query<DraftWithSource>(
    `${DRAFT_SELECT}
     WHERE d.workspace_id = ? AND d.scheduled_at IS NOT NULL
       AND d.scheduled_at >= ? AND d.scheduled_at < ?
     ORDER BY d.scheduled_at ASC`,
    [workspaceId, from, to],
  );
}

export function pendingItems(workspaceId: string) {
  return query<SourceItem & { connector_title: string }>(
    `SELECT s.*, c.title AS connector_title FROM source_items s
     JOIN connectors c ON c.id = s.connector_id
     WHERE c.workspace_id = ? AND s.processed = 0
     ORDER BY COALESCE(s.published_at, s.created_at) DESC LIMIT 50`,
    [workspaceId],
  );
}

export function ledgerEntries(workspaceId: string, limit = 25) {
  return query<LedgerEntry>(
    `SELECT * FROM credit_ledger WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    [workspaceId, limit],
  );
}

export async function overview(workspace: Workspace) {
  const [counts, engagement, sources] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count FROM drafts WHERE workspace_id = ? GROUP BY status`,
      [workspace.id],
    ),
    one<{ impressions: string; likes: string; reposts: string; measured: string }>(
      `SELECT COALESCE(SUM(m.impressions), 0) AS impressions,
              COALESCE(SUM(m.likes), 0) AS likes,
              COALESCE(SUM(m.reposts), 0) AS reposts,
              COUNT(m.id) AS measured
       FROM post_metrics m JOIN drafts d ON d.id = m.draft_id
       WHERE d.workspace_id = ?`,
      [workspace.id],
    ),
    one<{ count: string }>(
      `SELECT COUNT(*) AS count FROM connectors WHERE workspace_id = ? AND active = 1`,
      [workspace.id],
    ),
  ]);

  // Postgres renvoie les agrégats COUNT/SUM en chaînes (BIGINT/NUMERIC).
  const byStatus = Object.fromEntries(counts.map((row) => [row.status, Number(row.count)]));

  return {
    drafts: byStatus.draft ?? 0,
    approved: byStatus.approved ?? 0,
    scheduled: byStatus.scheduled ?? 0,
    published: byStatus.published ?? 0,
    failed: byStatus.failed ?? 0,
    activeSources: Number(sources?.count ?? 0),
    engagement: {
      impressions: Number(engagement?.impressions ?? 0),
      likes: Number(engagement?.likes ?? 0),
      reposts: Number(engagement?.reposts ?? 0),
      measured: Number(engagement?.measured ?? 0),
    },
  };
}

export function publishedHistory(workspaceId: string) {
  return query<{ published_at: number | null; impressions: number; likes: number }>(
    `SELECT d.published_at, COALESCE(m.impressions, 0) AS impressions,
            COALESCE(m.likes, 0) AS likes
     FROM drafts d LEFT JOIN post_metrics m ON m.draft_id = d.id
     WHERE d.workspace_id = ? AND d.status = 'published'
     ORDER BY d.published_at DESC LIMIT 60`,
    [workspaceId],
  );
}
