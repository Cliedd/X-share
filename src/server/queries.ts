import { db } from "./db";
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

export function listConnectors(workspaceId: string): Connector[] {
  return db()
    .prepare(`SELECT * FROM connectors WHERE workspace_id = ? ORDER BY created_at DESC`)
    .all(workspaceId) as Connector[];
}

export function connectorCounts(workspaceId: string) {
  return db()
    .prepare(
      `SELECT c.id, COUNT(s.id) AS total,
              SUM(CASE WHEN s.processed = 0 THEN 1 ELSE 0 END) AS pending
       FROM connectors c LEFT JOIN source_items s ON s.connector_id = c.id
       WHERE c.workspace_id = ? GROUP BY c.id`,
    )
    .all(workspaceId) as Array<{ id: string; total: number; pending: number }>;
}

export function listDrafts(workspaceId: string, statuses?: string[]): DraftWithSource[] {
  if (statuses && statuses.length > 0) {
    const placeholders = statuses.map(() => "?").join(",");
    return db()
      .prepare(
        `${DRAFT_SELECT} WHERE d.workspace_id = ? AND d.status IN (${placeholders})
         ORDER BY COALESCE(d.scheduled_at, d.updated_at) DESC`,
      )
      .all(workspaceId, ...statuses) as DraftWithSource[];
  }

  return db()
    .prepare(`${DRAFT_SELECT} WHERE d.workspace_id = ? ORDER BY d.updated_at DESC`)
    .all(workspaceId) as DraftWithSource[];
}

export function getDraft(workspaceId: string, draftId: string): Draft | null {
  return (
    (db()
      .prepare(`SELECT * FROM drafts WHERE id = ? AND workspace_id = ?`)
      .get(draftId, workspaceId) as Draft | undefined) ?? null
  );
}

/** Publications programmées ou diffusées à l'intérieur d'une fenêtre donnée. */
export function draftsInRange(workspaceId: string, from: number, to: number): DraftWithSource[] {
  return db()
    .prepare(
      `${DRAFT_SELECT}
       WHERE d.workspace_id = ? AND d.scheduled_at IS NOT NULL
         AND d.scheduled_at >= ? AND d.scheduled_at < ?
       ORDER BY d.scheduled_at ASC`,
    )
    .all(workspaceId, from, to) as DraftWithSource[];
}

export function pendingItems(workspaceId: string): Array<SourceItem & { connector_title: string }> {
  return db()
    .prepare(
      `SELECT s.*, c.title AS connector_title FROM source_items s
       JOIN connectors c ON c.id = s.connector_id
       WHERE c.workspace_id = ? AND s.processed = 0
       ORDER BY COALESCE(s.published_at, s.created_at) DESC LIMIT 50`,
    )
    .all(workspaceId) as Array<SourceItem & { connector_title: string }>;
}

export function ledgerEntries(workspaceId: string, limit = 25): LedgerEntry[] {
  return db()
    .prepare(
      `SELECT * FROM credit_ledger WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(workspaceId, limit) as LedgerEntry[];
}

export function overview(workspace: Workspace) {
  const counts = db()
    .prepare(
      `SELECT status, COUNT(*) AS count FROM drafts WHERE workspace_id = ? GROUP BY status`,
    )
    .all(workspace.id) as Array<{ status: string; count: number }>;

  const byStatus = Object.fromEntries(counts.map((row) => [row.status, row.count]));

  const engagement = db()
    .prepare(
      `SELECT COALESCE(SUM(m.impressions), 0) AS impressions,
              COALESCE(SUM(m.likes), 0) AS likes,
              COALESCE(SUM(m.reposts), 0) AS reposts,
              COUNT(m.id) AS measured
       FROM post_metrics m JOIN drafts d ON d.id = m.draft_id
       WHERE d.workspace_id = ?`,
    )
    .get(workspace.id) as {
    impressions: number;
    likes: number;
    reposts: number;
    measured: number;
  };

  const sources = db()
    .prepare(`SELECT COUNT(*) AS count FROM connectors WHERE workspace_id = ? AND active = 1`)
    .get(workspace.id) as { count: number };

  return {
    drafts: byStatus.draft ?? 0,
    approved: byStatus.approved ?? 0,
    scheduled: byStatus.scheduled ?? 0,
    published: byStatus.published ?? 0,
    failed: byStatus.failed ?? 0,
    activeSources: sources.count,
    engagement,
  };
}

export function publishedHistory(workspaceId: string) {
  return db()
    .prepare(
      `SELECT d.published_at, COALESCE(m.impressions, 0) AS impressions,
              COALESCE(m.likes, 0) AS likes
       FROM drafts d LEFT JOIN post_metrics m ON m.draft_id = d.id
       WHERE d.workspace_id = ? AND d.status = 'published'
       ORDER BY d.published_at DESC LIMIT 60`,
    )
    .all(workspaceId) as Array<{ published_at: number | null; impressions: number; likes: number }>;
}
