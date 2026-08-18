import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading } from "@/components/app/shell";
import { WeekPlanner } from "@/components/app/week-planner";
import { draftsInRange, listDrafts, publishedHistory } from "@/server/queries";
import { suggestSlot } from "@/server/ai";
import { startOfWeek, WEEK_MS } from "@/lib/format";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const params = await searchParams;
  const offset = Number(params.semaine ?? 0);
  const weekStart = startOfWeek() + (Number.isFinite(offset) ? offset : 0) * WEEK_MS;

  const scheduled = draftsInRange(workspace.id, weekStart, weekStart + WEEK_MS);
  const queue = listDrafts(workspace.id, ["approved"]);
  const suggestion = suggestSlot(publishedHistory(workspace.id));

  const label = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

  return (
    <AppShell user={user} workspace={workspace} current="/app/planificateur">
      <PageHeading
        title="Planificateur"
        subtitle={`Semaine du ${label.format(new Date(weekStart))} au ${label.format(
          new Date(weekStart + 6 * 24 * 3600_000),
        )} — déposez vos ébauches dans les emplacements libres.`}
        actions={
          <div className="flex gap-2">
            <WeekLink offset={offset - 1} label="← Précédente" />
            {offset !== 0 ? <WeekLink offset={0} label="Cette semaine" /> : null}
            <WeekLink offset={offset + 1} label="Suivante →" />
          </div>
        }
      />

      <WeekPlanner
        weekStart={weekStart}
        scheduled={scheduled}
        queue={queue}
        suggestion={suggestion}
      />
    </AppShell>
  );
}

function WeekLink({ offset, label }: { offset: number; label: string }) {
  return (
    <a
      href={`/app/planificateur?semaine=${offset}`}
      className="inline-flex h-9 items-center rounded-full border border-[var(--line-strong)]
        bg-ink-850 px-4 text-[13px] transition-colors hover:border-amber-400/50"
    >
      {label}
    </a>
  );
}
