import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading, Card } from "@/components/app/shell";
import { ActionForm, SubmitButton } from "@/components/app/action-button";
import { updateSettings, disconnectX } from "@/server/actions";
import { COST } from "@/server/credits";
import { aiConfigured } from "@/server/ai";
import { xConfig } from "@/server/x-oauth";
import { googleConfig } from "@/server/google-oauth";
import { stripeConfigured, stripeMode } from "@/server/stripe";
import { ButtonLink } from "@/components/ui/button";
import { XLogo } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";

const FIELD =
  "w-full rounded-xl border border-[var(--line)] bg-ink-850 px-3.5 py-2.5 text-[14px] " +
  "text-cloud placeholder:text-faint focus:border-amber-400/50 focus:outline-none";

const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint";

export default async function SettingsPage() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace, x } = context;

  return (
    <AppShell user={user} workspace={workspace} current="/app/parametres">
      <PageHeading
        title="Paramètres"
        subtitle="Cadre rédactionnel, contexte produit et offre. Ces réglages pilotent chaque brouillon généré."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <ActionForm action={updateSettings} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className={LABEL}>Cadre rédactionnel</span>
              <select name="framework" defaultValue={workspace.framework} className={FIELD}>
                <option value="AIDA">AIDA — attention, intérêt, désir, action</option>
                <option value="PAS">PAS — problème, agitation, solution</option>
                <option value="custom">Invite personnalisée</option>
              </select>
              <span className="text-[12.5px] text-muted">
                Le cadre choisi structure chaque variante rédigée par l&apos;IA.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className={LABEL}>Invite personnalisée</span>
              <textarea
                name="custom_prompt"
                rows={4}
                defaultValue={workspace.custom_prompt ?? ""}
                placeholder="Ton direct, orienté ingénieur. Pas de superlatif. Toujours nommer la contrainte technique levée."
                className={FIELD}
              />
              <span className="text-[12.5px] text-muted">
                Utilisée uniquement lorsque le cadre « Invite personnalisée » est sélectionné.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className={LABEL}>Contexte produit</span>
              <textarea
                name="product_context"
                rows={4}
                defaultValue={workspace.product_context ?? ""}
                placeholder="CLIEDD est un outil de publication automatique X destiné aux éditeurs de SaaS. Public : fondateurs techniques."
                className={FIELD}
              />
              <span className="text-[12.5px] text-muted">
                Transmis à chaque génération pour ancrer le vocabulaire et le public visé.
              </span>
            </label>

            <SubmitButton className="h-10 self-start">Enregistrer</SubmitButton>
          </ActionForm>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Publication X</h2>
            {x ? (
              <>
                <p className="text-[13.5px]">
                  Relié à <strong>@{x.handle}</strong>
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                  CLIEDD ne publie que les messages que vous approuvez ou programmez.
                </p>
                <ActionForm action={disconnectX} className="mt-4" confirm="Déconnecter le compte X ?">
                  <SubmitButton variant="danger">Déconnecter</SubmitButton>
                </ActionForm>
              </>
            ) : (
              <>
                <p className="text-[13.5px] leading-relaxed text-muted">
                  {xConfig().configured
                    ? "Reliez votre compte X pour diffuser réellement vos publications."
                    : "X n'est pas configuré sur cette instance : les publications sont simulées puis enregistrées."}
                </p>
                {xConfig().configured ? (
                  <ButtonLink href="/api/auth/x/login" className="mt-4 w-full">
                    <XLogo className="size-4" />
                    Relier mon compte X
                  </ButtonLink>
                ) : null}
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Compte</h2>
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <Row label="Identité" value={user.name} />
              <Row label="Adresse" value={user.email ?? "—"} />
              <Row label="Espace" value={workspace.name} />
              <Row
                label="Renouvellement"
                value={formatDateTime(workspace.credits_reset_at)}
              />
              <Row
                label="Fin d'essai"
                value={workspace.trial_ends_at ? formatDateTime(workspace.trial_ends_at) : "—"}
              />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Barème des crédits</h2>
            <dl className="flex flex-col gap-2 text-[13px]">
              <Row label="Texte" value={`${COST.text} crédit`} />
              <Row label="Image" value={`+${COST.image}`} />
              <Row label="Vidéo" value={`+${COST.video}`} />
              <Row label="Lien" value={`+${COST.link}`} />
            </dl>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Les composants se cumulent. Les crédits ne sont débités que par une publication
              réussie ; un échec est remboursé automatiquement.
            </p>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Services</h2>
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <Row label="Connexion" value={googleConfig().configured ? "Google" : "Démonstration"} />
              <Row label="Publication X" value={x ? `@${x.handle}` : "Simulée"} />
              <Row label="Rédaction IA" value={aiConfigured() ? "Claude" : "Locale"} />
              <Row
                label="Paiement"
                value={stripeConfigured() ? `Stripe (${stripeMode()})` : "Non configuré"}
              />
            </dl>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
