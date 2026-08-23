"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./action-button";
import {
  updateDraft,
  approveDraft,
  scheduleDraft,
  unscheduleDraft,
  publishNow,
  deleteDraft,
} from "@/server/actions";
import { statusLabel, statusTone, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DraftWithSource } from "@/server/queries";

/** Convertit un instant en valeur pour <input type="datetime-local"> (heure locale). */
function toLocalInput(value: number) {
  const date = new Date(value - new Date(value).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export function DraftCard({ draft }: { draft: DraftWithSource }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [scheduling, setScheduling] = useState(false);

  const locked = draft.status === "published" || draft.status === "publishing";
  const remaining = 280 - content.length;

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-ink-900 p-5">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            statusTone(draft.status),
          )}
        >
          {statusLabel(draft.status)}
        </span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[9.5px] text-faint">
          {draft.framework}
        </span>
        <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[9.5px] text-faint">
          {draft.credit_cost} crédit{draft.credit_cost > 1 ? "s" : ""}
        </span>
        {draft.scheduled_at ? (
          <span className="font-mono text-[10.5px] text-amber-300">
            {formatDateTime(draft.scheduled_at)}
          </span>
        ) : null}
      </header>

      {draft.source_title ? (
        <p className="mb-2.5 truncate text-[11.5px] text-faint">Source : {draft.source_title}</p>
      ) : null}

      {editing && !locked ? (
        <ActionForm action={updateDraft} onDone={() => setEditing(false)}>
          <input type="hidden" name="id" value={draft.id} />
          <textarea
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            maxLength={280}
            className="w-full resize-y rounded-xl border border-[var(--line)] bg-ink-850 p-3
              text-[14px] leading-relaxed text-cloud focus:border-amber-400/50 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "font-mono text-[11px]",
                remaining < 0 ? "text-coral-300" : "text-faint",
              )}
            >
              {remaining} restants
            </span>
            <select
              name="media_kind"
              defaultValue={draft.media_kind}
              className="h-8 rounded-lg border border-[var(--line)] bg-ink-850 px-2 text-[12px]
                text-cloud focus:outline-none"
            >
              <option value="none">Sans média</option>
              <option value="image">Image (+2)</option>
              <option value="video">Vidéo (+4)</option>
            </select>
            <SubmitButton className="ml-auto">Enregistrer</SubmitButton>
            <button
              type="button"
              onClick={() => {
                setContent(draft.content);
                setEditing(false);
              }}
              className="h-9 rounded-full px-3 text-[13px] text-muted hover:text-cloud"
            >
              Annuler
            </button>
          </div>
        </ActionForm>
      ) : (
        <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{draft.content}</p>
      )}

      {draft.error ? (
        <p className="mt-3 rounded-lg border border-coral-400/25 bg-coral-400/8 px-3 py-2 text-[12.5px] text-coral-300">
          {draft.error}
        </p>
      ) : null}

      {draft.status === "published" && draft.impressions !== null ? (
        <dl className="mt-3 flex flex-wrap gap-4 border-t border-[var(--line)] pt-3">
          {[
            ["Impressions", draft.impressions],
            ["J'aime", draft.likes],
            ["Reposts", draft.reposts],
            ["Réponses", draft.replies],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="font-mono text-[9.5px] uppercase tracking-wider text-faint">
                {label}
              </dt>
              <dd className="font-display text-[15px] font-semibold">{value ?? 0}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!locked ? (
        <footer className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center rounded-full border border-[var(--line-strong)]
                bg-ink-850 px-4 text-[13px] transition-colors hover:border-amber-400/50"
            >
              Modifier
            </button>
          ) : null}

          {draft.status === "draft" ? (
            <ActionForm action={approveDraft}>
              <input type="hidden" name="id" value={draft.id} />
              <SubmitButton variant="secondary">Approuver</SubmitButton>
            </ActionForm>
          ) : null}

          {draft.status === "scheduled" ? (
            <ActionForm action={unscheduleDraft}>
              <input type="hidden" name="id" value={draft.id} />
              <SubmitButton variant="secondary">Retirer de la file</SubmitButton>
            </ActionForm>
          ) : (
            <button
              type="button"
              onClick={() => setScheduling((value) => !value)}
              className="inline-flex h-9 items-center rounded-full border border-[var(--line-strong)]
                bg-ink-850 px-4 text-[13px] transition-colors hover:border-amber-400/50"
            >
              Programmer
            </button>
          )}

          <ActionForm action={publishNow} confirm="Publier immédiatement sur X ?">
            <input type="hidden" name="id" value={draft.id} />
            <SubmitButton>Publier</SubmitButton>
          </ActionForm>

          <ActionForm action={deleteDraft} confirm="Supprimer ce brouillon ?" className="ml-auto">
            <input type="hidden" name="id" value={draft.id} />
            <SubmitButton variant="danger">Supprimer</SubmitButton>
          </ActionForm>
        </footer>
      ) : null}

      {scheduling && !locked ? (
        <ActionForm
          action={scheduleDraft}
          className="mt-3 flex flex-wrap items-end gap-2"
          onDone={() => setScheduling(false)}
        >
          <input type="hidden" name="id" value={draft.id} />
          <ScheduleFields defaultValue={draft.scheduled_at ?? Date.now() + 3600_000} />
          <SubmitButton>Confirmer</SubmitButton>
        </ActionForm>
      ) : null}
    </article>
  );
}

/**
 * L'input datetime-local renvoie une chaîne locale ; on la convertit en
 * horodatage absolu dans un champ caché, seul lu par l'action serveur.
 */
function ScheduleFields({ defaultValue }: { defaultValue: number }) {
  const [local, setLocal] = useState(toLocalInput(defaultValue));

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          Date et heure
        </span>
        <input
          type="datetime-local"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          className="h-9 rounded-lg border border-[var(--line)] bg-ink-850 px-3 text-[13px]
            text-cloud focus:border-amber-400/50 focus:outline-none"
        />
      </label>
      <input type="hidden" name="scheduled_at" value={new Date(local).getTime() || ""} />
    </>
  );
}
