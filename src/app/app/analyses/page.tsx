import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading, Card, EmptyState } from "@/components/app/shell";
import { ActionForm, SubmitButton } from "@/components/app/action-button";
import { listDrafts, overview, ledgerEntries } from "@/server/queries";
import { refreshAnalytics } from "@/server/actions";
import { plan } from "@/server/plans";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AnalyticsPage() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const settings = plan(workspace.plan);
  const [stats, allPublished, ledger] = await Promise.all([
    overview(workspace),
    listDrafts(workspace.id, ["published"]),
    ledgerEntries(workspace.id, 12),
  ]);
  const published = allPublished.slice(0, settings.analyticsSampleSize);

  const measured = stats.engagement.measured || 1;
  const tiles = [
    { label: "Impressions", value: stats.engagement.impressions },
    { label: "J'aime", value: stats.engagement.likes },
    { label: "Reposts", value: stats.engagement.reposts },
    {
      label: "Impressions / publication",
      value: Math.round(stats.engagement.impressions / measured),
    },
  ];

  // Échelle du graphique : la plus forte impression donne 100 % de hauteur.
  const peak = Math.max(1, ...published.map((draft) => draft.impressions ?? 0));

  return (
    <AppShell user={user} workspace={workspace} current="/app/analyses">
      <PageHeading
        title="Analyses"
        subtitle={`Actualisation toutes les ${settings.analyticsRefreshHours} h sur un échantillon de ${settings.analyticsSampleSize} publications — cadence de l'offre ${settings.name}.`}
        actions={
          <ActionForm action={refreshAnalytics}>
            <SubmitButton variant="secondary" className="h-9">
              Actualiser
            </SubmitButton>
          </ActionForm>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="hairline-top">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              {tile.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold">{formatNumber(tile.value)}</p>
          </Card>
        ))}
      </div>

      {published.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Aucune publication mesurée"
            body="Les impressions et l'engagement apparaîtront ici dès qu'une publication aura été diffusée sur X."
          />
        </div>
      ) : (
        <Card className="mt-6">
          <h2 className="mb-5 font-display text-[15px] font-semibold">
            Impressions par publication
          </h2>

          {/* Histogramme : hauteur proportionnelle, valeurs en infobulle. */}
          <div className="flex h-40 items-end gap-1.5 overflow-x-auto">
            {[...published].reverse().map((draft) => {
              const value = draft.impressions ?? 0;
              return (
                <div
                  key={draft.id}
                  className="group flex min-w-3 flex-1 flex-col items-center justify-end gap-1"
                  title={`${formatNumber(value)} impressions — ${draft.content.slice(0, 80)}`}
                >
                  <span className="font-mono text-[9px] text-faint opacity-0 group-hover:opacity-100">
                    {formatNumber(value)}
                  </span>
                  <div
                    className="bg-brand w-full rounded-t transition-opacity hover:opacity-80"
                    style={{ height: `${Math.max(4, (value / peak) * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-[15px] font-semibold">Dernières publications</h2>
          {published.length === 0 ? (
            <p className="text-[13.5px] text-muted">Rien encore.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {published.slice(0, 6).map((draft) => (
                <li key={draft.id} className="rounded-xl border border-[var(--line)] bg-ink-850 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10.5px] text-faint">
                      {formatDateTime(draft.published_at)}
                    </span>
                    <span className="font-mono text-[10.5px] text-aqua-300">
                      {formatNumber(draft.impressions ?? 0)} impr.
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug text-muted">
                    {draft.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-[15px] font-semibold">Mouvements de crédits</h2>
          {ledger.length === 0 ? (
            <p className="text-[13.5px] text-muted">Aucun mouvement pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ledger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--line)]
                    pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{entry.reason}</p>
                    <p className="font-mono text-[10.5px] text-faint">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[13px]",
                      entry.delta < 0 ? "text-coral-300" : "text-aqua-300",
                    )}
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
