import { NextResponse, type NextRequest } from "next/server";
import { runDueDrafts } from "@/server/publisher";
import { db } from "@/server/db";
import { ingestConnector } from "@/server/rss";
import { generateVariants } from "@/server/ai";
import { computeCost } from "@/server/credits";
import { uid, now } from "@/server/db";
import type { Connector, Workspace } from "@/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boucle de fond : ingère les connecteurs, rédige les brouillons des
 * connecteurs en pilotage automatique, puis diffuse les publications dues.
 * À câbler sur un ordonnanceur (cron Vercel, tâche planifiée…).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const connectors = db()
    .prepare(`SELECT * FROM connectors WHERE active = 1`)
    .all() as Connector[];

  let ingested = 0;
  let drafted = 0;

  for (const connector of connectors) {
    let items;
    try {
      items = await ingestConnector(connector);
    } catch {
      continue; // l'erreur est déjà consignée sur le connecteur
    }
    ingested += items.length;

    if (connector.mode !== "autopilot" || items.length === 0) continue;

    const workspace = db()
      .prepare(`SELECT * FROM workspaces WHERE id = ?`)
      .get(connector.workspace_id) as Workspace;

    for (const item of items) {
      const { variants } = await generateVariants(workspace, item);
      const best = variants[0];
      if (!best) continue;

      db()
        .prepare(
          `INSERT INTO drafts (id, workspace_id, source_item_id, content, framework, status,
            media_kind, credit_cost, attempts, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'approved', 'none', ?, 0, ?, ?)`,
        )
        .run(
          uid("drf"),
          workspace.id,
          item.id,
          best.text,
          workspace.framework,
          computeCost(best.text, "none"),
          now(),
          now(),
        );

      db().prepare(`UPDATE source_items SET processed = 1 WHERE id = ?`).run(item.id);
      drafted += 1;
    }
  }

  const published = await runDueDrafts();

  return NextResponse.json({ ingested, drafted, ...published });
}
