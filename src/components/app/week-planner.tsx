"use client";

import { useState, useTransition } from "react";
import { scheduleDraft } from "@/server/actions";
import { statusTone, formatTime, DAY_MS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DraftWithSource } from "@/server/queries";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const HOURS = [8, 10, 12, 14, 16, 18];

type Props = {
  weekStart: number;
  scheduled: DraftWithSource[];
  queue: DraftWithSource[];
  suggestion: { day: number; hour: number; minute: number };
};

/**
 * Vue hebdomadaire. Chaque cellule est une cible de dépôt : y relâcher un
 * brouillon le programme à ce créneau via l'action serveur.
 */
export function WeekPlanner({ weekStart, scheduled, queue, suggestion }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function slotTime(dayIndex: number, hour: number) {
    return weekStart + dayIndex * DAY_MS + hour * 3600_000;
  }

  function drop(dayIndex: number, hour: number) {
    if (!dragging) return;
    const at = slotTime(dayIndex, hour);
    setHovered(null);

    const formData = new FormData();
    formData.set("id", dragging);
    formData.set("scheduled_at", String(at));
    setDragging(null);

    startTransition(async () => {
      const result = await scheduleDraft(formData);
      setMessage(result?.error ?? result?.ok ?? null);
    });
  }

  // Un brouillon occupe le créneau dont l'heure est la plus proche en dessous.
  function draftsAt(dayIndex: number, hour: number) {
    return scheduled.filter((draft) => {
      if (!draft.scheduled_at) return false;
      const offset = draft.scheduled_at - weekStart;
      const day = Math.floor(offset / DAY_MS);
      if (day !== dayIndex) return false;

      const draftHour = new Date(draft.scheduled_at).getHours();
      const slot = [...HOURS].reverse().find((candidate) => draftHour >= candidate) ?? HOURS[0];
      return slot === hour;
    });
  }

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* File d'attente : source du glisser-déposer */}
      <aside className="xl:w-72 xl:shrink-0">
        <h2 className="mb-3 font-display text-[15px] font-semibold">
          File d&apos;attente ({queue.length})
        </h2>

        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-5 text-[13px] text-muted">
            Approuvez des brouillons pour les faire apparaître ici, puis glissez-les dans un
            créneau libre.
          </p>
        ) : (
          <ul className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
            {queue.map((draft) => (
              <li
                key={draft.id}
                draggable
                onDragStart={() => setDragging(draft.id)}
                onDragEnd={() => {
                  setDragging(null);
                  setHovered(null);
                }}
                className={cn(
                  "cursor-grab rounded-xl border border-[var(--line)] bg-ink-850 p-3",
                  "transition-opacity active:cursor-grabbing",
                  dragging === draft.id && "opacity-40",
                )}
              >
                <span className="font-mono text-[9.5px] text-faint">
                  {draft.framework} · {draft.credit_cost} cr.
                </span>
                <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-muted">
                  {draft.content}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-[12.5px] text-amber-300">
          Coach IA — meilleur créneau : {DAYS[suggestion.day === 0 ? 6 : suggestion.day - 1]} vers{" "}
          {String(suggestion.hour).padStart(2, "0")} h
          {suggestion.minute ? String(suggestion.minute).padStart(2, "0") : ""}
        </p>

        {message ? (
          <p role="status" className="mt-3 text-[12.5px] text-aqua-300">
            {message}
          </p>
        ) : null}
      </aside>

      {/* Grille de la semaine */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className={cn("min-w-[760px]", pending && "opacity-60")}>
          <div className="grid grid-cols-[54px_repeat(7,1fr)] gap-1.5">
            <div />
            {DAYS.map((day, index) => (
              <div key={day} className="pb-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {day.slice(0, 3)}
                </p>
                <p className="text-[12px] text-muted">
                  {new Date(weekStart + index * DAY_MS).getDate()}
                </p>
              </div>
            ))}

            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="pt-2 text-right font-mono text-[10px] text-faint">
                  {String(hour).padStart(2, "0")}h
                </div>

                {DAYS.map((day, dayIndex) => {
                  const key = `${dayIndex}-${hour}`;
                  const items = draftsAt(dayIndex, hour);
                  const isPast = slotTime(dayIndex, hour) < Date.now();

                  return (
                    <div
                      key={key}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setHovered(key);
                      }}
                      onDragLeave={() => setHovered((value) => (value === key ? null : value))}
                      onDrop={() => drop(dayIndex, hour)}
                      className={cn(
                        "flex min-h-16 flex-col gap-1 rounded-lg border p-1.5 transition-colors",
                        hovered === key
                          ? "border-amber-400/60 bg-amber-400/10"
                          : "border-[var(--line)] bg-ink-900/60",
                        isPast && items.length === 0 && "opacity-45",
                      )}
                    >
                      {items.map((draft) => (
                        <div
                          key={draft.id}
                          className={cn(
                            "rounded border px-1.5 py-1 text-left",
                            statusTone(draft.status),
                          )}
                          title={draft.content}
                        >
                          <p className="font-mono text-[8.5px] opacity-80">
                            {formatTime(draft.scheduled_at)}
                          </p>
                          <p className="line-clamp-2 text-[10px] leading-tight">{draft.content}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
