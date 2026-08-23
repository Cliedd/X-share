import { NextResponse, type NextRequest } from "next/server";
import { runDueDrafts } from "@/server/publisher";
import { query, one, run, uid, now } from "@/server/db";
import { ensureSchema } from "@/server/migrate";
import { ingestConnector } from "@/server/rss";
import { generateVariants } from "@/server/ai";
import { computeCost } from "@/server/credits";
import type { Connector, Workspace } from "@/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Boucle de fond : ingère les connecteurs, rédige les brouillons des
 * connecteurs en pilotage automatique, puis diffuse les publications dues.
 *
 * Déclenchée par l'ordonnanceur de l'hébergeur (cron Vercel, tâche Railway).
 * Vercel envoie `Authorization: Bearer $CRON_SECRET` ; définir CRON_SECRET
 * empêche tout appel non autorisé.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await ensureSchema();

  const connectors = await query<Connector>(`SELECT * FROM connectors WHERE active = 1`);

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

    const workspace = await one<Workspace>(`SELECT * FROM workspaces WHERE id = ?`, [
      connector.workspace_id,
    ]);
    if (!workspace) continue;

    for (const item of items) {
      const { variants } = await generateVariants(workspace, item);
      const best = variants[0];
      if (!best) continue;

      await run(
        `INSERT INTO drafts (id, workspace_id, source_item_id, content, framework, status,
          media_kind, credit_cost, attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'approved', 'none', ?, 0, ?, ?)`,
        [
          uid("drf"),
          workspace.id,
          item.id,
          best.text,
          workspace.framework,
          computeCost(best.text, "none"),
          now(),
          now(),
        ],
      );

      await run(`UPDATE source_items SET processed = 1 WHERE id = ?`, [item.id]);
      drafted += 1;
    }
  }

  const published = await runDueDrafts();

  // Ménage : les états d'autorisation ont une durée de vie courte.
  await run(`DELETE FROM oauth_states WHERE created_at < ?`, [now() - 60 * 60 * 1000]);
  await run(`DELETE FROM sessions WHERE expires_at < ?`, [now()]);

  return NextResponse.json({ ingested, drafted, ...published });
}
