import { Rss, Sparkles, Check, Drag, XLogo } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Slot = {
  day: number;
  row: number;
  label: string;
  time: string;
  tone: "coral" | "amber" | "aqua" | "violet" | "draft";
};

/** Emplacements de la semaine : `day` = colonne (0-6), `row` = créneau horaire (0-3). */
const slots: Slot[] = [
  { day: 0, row: 0, label: "v2.4 — Webhooks", time: "09:15", tone: "coral" },
  { day: 1, row: 1, label: "Fil : 3 astuces", time: "11:30", tone: "amber" },
  { day: 2, row: 0, label: "Note de version", time: "08:45", tone: "aqua" },
  { day: 3, row: 2, label: "Étude de cas", time: "14:00", tone: "violet" },
  { day: 4, row: 1, label: "Changelog IA", time: "10:20", tone: "coral" },
  { day: 4, row: 3, label: "Brouillon", time: "17:00", tone: "draft" },
  { day: 6, row: 2, label: "Récap hebdo", time: "13:10", tone: "amber" },
];

const tones: Record<Slot["tone"], string> = {
  coral: "border-coral-400/35 bg-coral-400/12 text-coral-300",
  amber: "border-amber-400/35 bg-amber-400/12 text-amber-300",
  aqua: "border-aqua-400/35 bg-aqua-400/12 text-aqua-300",
  violet: "border-violet-400/35 bg-violet-400/12 text-violet-400",
  draft: "border-dashed border-[var(--line-strong)] bg-ink-800/60 text-faint",
};

const sources = [
  { name: "changelog.xml", count: 12, live: true },
  { name: "blog/rss", count: 5, live: true },
  { name: "notes-de-version", count: 3, live: false },
];

const drafts = [
  { text: "Les webhooks sont là. Branchez n'importe quel événement…", framework: "AIDA" },
  { text: "Vous perdiez 40 min par déploiement à écrire le récap…", framework: "PAS" },
];

export function DashboardPreview() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)]
        bg-ink-900 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] @container"
      role="img"
      aria-label="Tableau de bord CLIEDD avec publications programmées, file d'attente de brouillons IA et flux RSS"
    >
      {/* Barre de fenêtre */}
      <div
        className="flex items-center gap-3 border-b border-[var(--line)] bg-ink-850 px-4 py-3"
        aria-hidden="true"
      >
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-coral-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-aqua-400/70" />
        </div>
        <div
          className="ml-2 flex-1 rounded-md bg-ink-800 px-3 py-1 font-mono text-[10px]
            text-faint sm:text-[11px]"
        >
          cliedd.app/planificateur
        </div>
        <span
          className="hidden items-center gap-1.5 rounded-full border border-aqua-400/30
            bg-aqua-400/10 px-2.5 py-1 font-mono text-[10px] text-aqua-300 sm:inline-flex"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-aqua-400" />
          En direct
        </span>
      </div>

      <div className="grid gap-px bg-[var(--line)] @3xl:grid-cols-[190px_1fr_230px]" aria-hidden="true">
        {/* Rail des sources */}
        <aside className="hidden flex-col gap-4 bg-ink-900 p-4 @3xl:flex">
          <Header icon={<Rss className="size-3.5" />} label="Sources" />
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li
                key={source.name}
                className="flex items-center justify-between gap-2 rounded-lg border
                  border-[var(--line)] bg-ink-850 px-2.5 py-2"
              >
                <span className="truncate font-mono text-[10.5px] text-muted">{source.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9.5px]",
                    source.live
                      ? "bg-aqua-400/15 text-aqua-300"
                      : "bg-ink-800 text-faint",
                  )}
                >
                  {source.count}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded-lg border border-[var(--line)] bg-ink-850 p-3">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Sparkles className="size-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Coach IA</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-faint">
              Meilleur créneau : mardi 11 h 30
            </p>
          </div>
        </aside>

        {/* Grille hebdomadaire */}
        <div className="bg-ink-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Header icon={<Drag className="size-3.5" />} label="Semaine 34" />
            <span className="font-mono text-[10px] text-faint">7 publications</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((day) => (
              <div
                key={day}
                className="pb-1.5 text-center font-mono text-[9px] uppercase tracking-wider
                  text-faint sm:text-[10px]"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: 4 }).map((_, row) =>
              days.map((day, col) => {
                const slot = slots.find((s) => s.day === col && s.row === row);
                return (
                  <div
                    key={`${day}-${row}`}
                    className={cn(
                      "flex h-11 flex-col justify-center gap-0.5 overflow-hidden rounded-md border",
                      "px-1 py-1 sm:h-12 sm:px-1.5",
                      slot
                        ? tones[slot.tone]
                        : "border-[var(--line)] bg-ink-850/40",
                    )}
                  >
                    {slot ? (
                      <>
                        <span className="truncate text-[9px] leading-tight font-medium sm:text-[10px]">
                          {slot.label}
                        </span>
                        <span className="font-mono text-[8px] opacity-70 sm:text-[9px]">
                          {slot.time}
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* File d'attente des brouillons */}
        <aside className="hidden flex-col gap-3 bg-ink-900 p-4 @3xl:flex">
          <Header icon={<Sparkles className="size-3.5" />} label="Brouillons IA" />
          {drafts.map((draft) => (
            <div
              key={draft.framework}
              className="rounded-lg border border-[var(--line)] bg-ink-850 p-2.5"
            >
              <span
                className="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-[9px]
                  text-violet-400"
              >
                {draft.framework}
              </span>
              <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted">{draft.text}</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-aqua-400/15 px-2 py-0.5
                    font-mono text-[9px] text-aqua-300"
                >
                  <Check className="size-2.5" />
                  Approuver
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5
                    font-mono text-[9px] text-faint"
                >
                  <XLogo className="size-2" />
                  Éditer
                </span>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function Header({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-faint">
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}
