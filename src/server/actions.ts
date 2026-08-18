"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { one, run, transaction, uid, now } from "./db";
import { requireSession, clearSession, unlinkXAccount } from "./auth";
import { ingestConnector, fetchFeed } from "./rss";
import { generateVariants } from "./ai";
import { publishDraft, refreshMetrics } from "./publisher";
import { computeCost } from "./credits";
import type { Connector, Draft, Framework, MediaKind, SourceItem } from "./types";

async function session() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  return context;
}

function refresh() {
  revalidatePath("/app", "layout");
}

/* ------------------------------ Connecteurs ------------------------------ */

export async function addConnector(formData: FormData) {
  const { workspace } = await session();
  const url = String(formData.get("url") ?? "").trim();
  const mode = String(formData.get("mode") ?? "review") as Connector["mode"];

  if (!url) return { error: "L'adresse du flux est requise." };

  let title = url;
  try {
    const feed = await fetchFeed(url);
    title = feed.title;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Le flux n'a pas pu être lu.",
    };
  }

  await run(
    `INSERT INTO connectors (id, workspace_id, url, title, mode, active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [uid("con"), workspace.id, url, title, mode, now()],
  );

  refresh();
  return { ok: `Connecteur « ${title} » ajouté.` };
}

export async function syncConnector(formData: FormData) {
  const { workspace } = await session();
  const id = String(formData.get("id") ?? "");

  const connector = await one<Connector>(
    `SELECT * FROM connectors WHERE id = ? AND workspace_id = ?`,
    [id, workspace.id],
  );

  if (!connector) return { error: "Connecteur introuvable." };

  try {
    const items = await ingestConnector(connector);
    refresh();
    return {
      ok:
        items.length === 0
          ? "Aucune nouvelle entrée."
          : `${items.length} nouvelle${items.length > 1 ? "s" : ""} entrée${items.length > 1 ? "s" : ""}.`,
    };
  } catch (error) {
    refresh();
    return { error: error instanceof Error ? error.message : "Échec de la récupération." };
  }
}

export async function setConnectorMode(formData: FormData) {
  const { workspace } = await session();
  await run(`UPDATE connectors SET mode = ? WHERE id = ? AND workspace_id = ?`, [
    String(formData.get("mode")),
    String(formData.get("id")),
    workspace.id,
  ]);
  refresh();
  return { ok: "Mode mis à jour." };
}

export async function deleteConnector(formData: FormData) {
  const { workspace } = await session();
  await run(`DELETE FROM connectors WHERE id = ? AND workspace_id = ?`, [
    String(formData.get("id")),
    workspace.id,
  ]);
  refresh();
  return { ok: "Connecteur supprimé." };
}

/* -------------------------------- Brouillons ------------------------------ */

export async function generateDrafts(formData: FormData) {
  const { workspace } = await session();
  const itemId = String(formData.get("item_id") ?? "");

  const item = await one<SourceItem>(
    `SELECT s.* FROM source_items s JOIN connectors c ON c.id = s.connector_id
     WHERE s.id = ? AND c.workspace_id = ?`,
    [itemId, workspace.id],
  );

  if (!item) return { error: "Entrée introuvable." };

  const { variants, simulated } = await generateVariants(workspace, item);

  await transaction(async (tx) => {
    for (const variant of variants) {
      await tx.run(
        `INSERT INTO drafts (id, workspace_id, source_item_id, content, framework, status,
          media_kind, credit_cost, attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', 'none', ?, 0, ?, ?)`,
        [
          uid("drf"),
          workspace.id,
          item.id,
          variant.text,
          workspace.framework,
          computeCost(variant.text, "none"),
          now(),
          now(),
        ],
      );
    }
    await tx.run(`UPDATE source_items SET processed = 1 WHERE id = ?`, [item.id]);
  });

  refresh();
  return {
    ok: simulated
      ? `${variants.length} brouillons créés (rédaction locale — aucune clé Anthropic configurée).`
      : `${variants.length} brouillons rédigés par l'IA.`,
  };
}

export async function updateDraft(formData: FormData) {
  const { workspace } = await session();
  const id = String(formData.get("id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const media = String(formData.get("media_kind") ?? "none") as MediaKind;

  if (!content) return { error: "Le contenu ne peut pas être vide." };
  if (content.length > 280) return { error: "280 caractères maximum." };

  await run(
    `UPDATE drafts SET content = ?, media_kind = ?, credit_cost = ?, updated_at = ?
     WHERE id = ? AND workspace_id = ? AND status NOT IN ('published', 'publishing')`,
    [content, media, computeCost(content, media), now(), id, workspace.id],
  );

  refresh();
  return { ok: "Brouillon enregistré." };
}

export async function approveDraft(formData: FormData) {
  const { workspace } = await session();
  await run(
    `UPDATE drafts SET status = 'approved', updated_at = ?
     WHERE id = ? AND workspace_id = ? AND status = 'draft'`,
    [now(), String(formData.get("id")), workspace.id],
  );
  refresh();
  return { ok: "Brouillon approuvé." };
}

export async function scheduleDraft(formData: FormData) {
  const { workspace } = await session();
  const id = String(formData.get("id") ?? "");
  const at = Number(formData.get("scheduled_at"));

  if (!Number.isFinite(at)) return { error: "Date de programmation invalide." };
  if (at < now() - 60_000) return { error: "Impossible de programmer dans le passé." };

  await run(
    `UPDATE drafts SET status = 'scheduled', scheduled_at = ?, error = NULL, updated_at = ?
     WHERE id = ? AND workspace_id = ? AND status IN ('draft', 'approved', 'scheduled', 'failed')`,
    [at, now(), id, workspace.id],
  );

  refresh();
  return { ok: "Publication programmée." };
}

export async function unscheduleDraft(formData: FormData) {
  const { workspace } = await session();
  await run(
    `UPDATE drafts SET status = 'approved', scheduled_at = NULL, updated_at = ?
     WHERE id = ? AND workspace_id = ? AND status = 'scheduled'`,
    [now(), String(formData.get("id")), workspace.id],
  );
  refresh();
  return { ok: "Retiré de la file d'attente." };
}

export async function publishNow(formData: FormData) {
  const { x, workspace } = await session();
  const id = String(formData.get("id") ?? "");

  const draft = await one<Draft>(`SELECT * FROM drafts WHERE id = ? AND workspace_id = ?`, [
    id,
    workspace.id,
  ]);

  if (!draft) return { error: "Brouillon introuvable." };

  const result = await publishDraft(x, workspace, draft);
  refresh();
  return result.ok ? { ok: result.message } : { error: result.message };
}

export async function deleteDraft(formData: FormData) {
  const { workspace } = await session();
  await run(`DELETE FROM drafts WHERE id = ? AND workspace_id = ? AND status != 'published'`, [
    String(formData.get("id")),
    workspace.id,
  ]);
  refresh();
  return { ok: "Brouillon supprimé." };
}

/* ------------------------------- Paramètres ------------------------------- */

export async function updateSettings(formData: FormData) {
  const { workspace } = await session();
  const framework = String(formData.get("framework") ?? "AIDA") as Framework;

  await run(
    `UPDATE workspaces SET framework = ?, custom_prompt = ?, product_context = ? WHERE id = ?`,
    [
      framework,
      String(formData.get("custom_prompt") ?? "").trim() || null,
      String(formData.get("product_context") ?? "").trim() || null,
      workspace.id,
    ],
  );

  refresh();
  return { ok: "Paramètres enregistrés." };
}

export async function refreshAnalytics() {
  const { x, workspace } = await session();
  const result = await refreshMetrics(x, workspace);
  refresh();
  return {
    ok:
      result.refreshed === 0
        ? "Les analyses sont déjà à jour pour la cadence de votre offre."
        : `${result.refreshed} publication(s) actualisée(s).`,
  };
}

export async function disconnectX() {
  const { user } = await session();
  await unlinkXAccount(user.id);
  refresh();
  return { ok: "Compte X déconnecté. Les publications repassent en simulation." };
}

export async function logout() {
  await clearSession();
  redirect("/");
}
