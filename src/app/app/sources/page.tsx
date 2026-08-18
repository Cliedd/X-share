import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading, Card, EmptyState } from "@/components/app/shell";
import { ActionForm, SubmitButton } from "@/components/app/action-button";
import { listConnectors, connectorCounts } from "@/server/queries";
import { addConnector, syncConnector, setConnectorMode, deleteConnector } from "@/server/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function SourcesPage() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const connectors = listConnectors(workspace.id);
  const counts = new Map(connectorCounts(workspace.id).map((row) => [row.id, row]));

  return (
    <AppShell user={user} workspace={workspace} current="/app/sources">
      <PageHeading
        title="Sources"
        subtitle="Journal des modifications, flux RSS, blog ou notes de version — les nouvelles entrées sont automatiquement intégrées."
      />

      <Card className="mb-6">
        <h2 className="mb-4 font-display text-[15px] font-semibold">Connecter un flux</h2>
        <ActionForm action={addConnector} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
              Adresse du flux RSS ou Atom
            </span>
            <input
              name="url"
              type="url"
              required
              placeholder="https://exemple.com/changelog.xml"
              className="h-10 rounded-xl border border-[var(--line)] bg-ink-850 px-3.5 text-[14px]
                text-cloud placeholder:text-faint focus:border-amber-400/50 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
              Mode
            </span>
            <select
              name="mode"
              defaultValue="review"
              className="h-10 rounded-xl border border-[var(--line)] bg-ink-850 px-3 text-[14px]
                text-cloud focus:border-amber-400/50 focus:outline-none"
            >
              <option value="review">Révision préalable</option>
              <option value="autopilot">Pilotage automatique</option>
            </select>
          </label>

          <SubmitButton className="h-10">Connecter</SubmitButton>
        </ActionForm>
      </Card>

      {connectors.length === 0 ? (
        <EmptyState
          title="Aucune source connectée"
          body="Ajoutez le flux de votre journal des modifications : CLIEDD y puisera chaque nouvelle entrée pour en faire des publications."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {connectors.map((connector) => {
            const count = counts.get(connector.id);
            return (
              <li key={connector.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-[15px] font-semibold">
                        {connector.title}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase",
                          connector.mode === "autopilot"
                            ? "border-violet-400/30 bg-violet-500/10 text-violet-400"
                            : "border-aqua-400/30 bg-aqua-400/10 text-aqua-300",
                        )}
                      >
                        {connector.mode === "autopilot" ? "Pilote auto" : "Révision"}
                      </span>
                    </div>

                    <p className="mt-1 truncate font-mono text-[11.5px] text-faint">
                      {connector.url}
                    </p>

                    <p className="mt-1.5 text-[12.5px] text-muted">
                      {count?.total ?? 0} entrée(s) · {count?.pending ?? 0} à traiter · dernière
                      lecture {formatDateTime(connector.last_fetched_at)}
                    </p>

                    {connector.last_error ? (
                      <p className="mt-1.5 text-[12.5px] text-coral-300">{connector.last_error}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ActionForm action={syncConnector}>
                      <input type="hidden" name="id" value={connector.id} />
                      <SubmitButton variant="secondary">Récupérer</SubmitButton>
                    </ActionForm>

                    <ActionForm action={setConnectorMode}>
                      <input type="hidden" name="id" value={connector.id} />
                      <input
                        type="hidden"
                        name="mode"
                        value={connector.mode === "autopilot" ? "review" : "autopilot"}
                      />
                      <SubmitButton variant="secondary">
                        {connector.mode === "autopilot" ? "Passer en révision" : "Pilote auto"}
                      </SubmitButton>
                    </ActionForm>

                    <ActionForm
                      action={deleteConnector}
                      confirm={`Supprimer « ${connector.title} » et ses entrées ?`}
                    >
                      <input type="hidden" name="id" value={connector.id} />
                      <SubmitButton variant="danger">Supprimer</SubmitButton>
                    </ActionForm>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
