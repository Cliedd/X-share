import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading, Card } from "@/components/app/shell";
import { ButtonLink } from "@/components/ui/button";
import { CreditCard } from "@/components/ui/icons";
import { PLANS, plan } from "@/server/plans";
import { PRICING, stripeConfigured, stripeMode, listInvoices } from "@/server/stripe";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillingInterval, PlanId } from "@/server/types";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Période d'essai",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  incomplete: "Incomplet",
  unpaid: "Impayé",
};

const STATUS_TONES: Record<string, string> = {
  trialing: "border-violet-400/30 bg-violet-500/10 text-violet-400",
  active: "border-aqua-400/30 bg-aqua-400/10 text-aqua-300",
  past_due: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  canceled: "border-[var(--line-strong)] bg-ink-800 text-muted",
  incomplete: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  unpaid: "border-coral-400/30 bg-coral-400/10 text-coral-300",
};

const MESSAGES: Record<string, { tone: "ok" | "erreur"; text: string }> = {
  succes: { tone: "ok", text: "Paiement confirmé. Votre offre est active." },
  stripe: {
    tone: "erreur",
    text: "Stripe n'est pas configuré sur cette instance : renseignez STRIPE_SECRET_KEY.",
  },
  checkout: {
    tone: "erreur",
    text: "La session de paiement n'a pas pu être ouverte. Vérifiez la clé Stripe et réessayez.",
  },
  portail: {
    tone: "erreur",
    text: "Le portail de facturation est indisponible tant qu'aucun paiement n'a eu lieu.",
  },
};

function price(planId: PlanId, interval: BillingInterval) {
  return (PRICING[planId][interval] / 100).toFixed(2).replace(".", ",");
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string; erreur?: string }>;
}) {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const params = await searchParams;
  const notice = MESSAGES[params.paiement ?? ""] ?? MESSAGES[params.erreur ?? ""];

  const settings = plan(workspace.plan);
  const status = workspace.subscription_status;
  const invoices = await listInvoices(workspace);
  const mode = stripeMode();
  const interval: BillingInterval = workspace.billing_interval ?? "month";

  return (
    <AppShell user={user} workspace={workspace} current="/app/facturation">
      <PageHeading
        title="Facturation"
        subtitle="Offre, crédits, factures et moyen de paiement. Les paiements sont traités par Stripe."
      />

      {notice ? (
        <p
          role="status"
          className={cn(
            "mb-6 rounded-xl border px-4 py-3 text-[13px]",
            notice.tone === "ok"
              ? "border-aqua-400/30 bg-aqua-400/8 text-aqua-300"
              : "border-coral-400/30 bg-coral-400/8 text-coral-300",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      {!stripeConfigured() ? (
        <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Stripe n&apos;est pas configuré : renseignez <code>STRIPE_SECRET_KEY</code> et{" "}
          <code>STRIPE_WEBHOOK_SECRET</code> dans <code>.env.local</code>. Les offres et les
          quotas restent exerçables, sans encaissement.
        </p>
      ) : mode === "test" ? (
        <p className="mb-6 rounded-xl border border-violet-400/30 bg-violet-500/8 px-4 py-3 text-[13px] leading-relaxed text-violet-400">
          Stripe est en <strong>mode test</strong>. Utilisez la carte 4242 4242 4242 4242, une date
          future et n&apos;importe quel CVC. Aucun montant réel n&apos;est débité.
        </p>
      ) : null}

      {/* Abonnement en cours */}
      <Card className="mb-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-semibold">Offre {settings.name}</h2>
              {status ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                    STATUS_TONES[status] ?? STATUS_TONES.canceled,
                  )}
                >
                  {STATUS_LABELS[status] ?? status}
                </span>
              ) : (
                <span className="rounded-full border border-[var(--line-strong)] bg-ink-800 px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted">
                  Aucun abonnement
                </span>
              )}
            </div>

            <p className="mt-2 text-[14px] text-muted">
              {formatNumber(settings.monthlyCredits)} crédits par mois ·{" "}
              {formatNumber(workspace.credits_remaining)} restants
            </p>

            {workspace.current_period_end ? (
              <p className="mt-1 text-[13px] text-faint">
                {workspace.cancel_at_period_end
                  ? `Se termine le ${formatDateTime(workspace.current_period_end)}`
                  : `Prochain renouvellement le ${formatDateTime(workspace.current_period_end)}`}
                {" · facturation "}
                {interval === "year" ? "annuelle" : "mensuelle"}
              </p>
            ) : null}
          </div>

          {workspace.stripe_customer_id ? (
            <ButtonLink href="/api/stripe/portal" variant="secondary" size="lg" className="shrink-0">
              <CreditCard className="size-4" />
              Gérer l&apos;abonnement
            </ButtonLink>
          ) : null}
        </div>
      </Card>

      {/* Choix d'offre */}
      <h2 className="mb-4 font-display text-[15px] font-semibold">
        {workspace.stripe_subscription_id ? "Changer d'offre" : "Choisir une offre"}
      </h2>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(PLANS).map((entry) => {
          const current = workspace.plan === entry.id && Boolean(status);
          return (
            <Card
              key={entry.id}
              className={cn(
                "flex flex-col",
                current ? "border-amber-400/35 bg-ink-850" : undefined,
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{entry.name}</h3>
                {current ? (
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300">
                    Actuelle
                  </span>
                ) : null}
              </div>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold">
                  {price(entry.id, "month")} $
                </span>
                <span className="text-sm text-faint">/ mois</span>
              </p>
              <p className="mt-1 text-[12.5px] text-faint">
                ou {price(entry.id, "year")} $ / an — deux mois offerts
              </p>

              <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-muted">
                <li>{formatNumber(entry.monthlyCredits)} crédits par mois</li>
                <li>Analyses toutes les {entry.analyticsRefreshHours} h</li>
                <li>Échantillon de {entry.analyticsSampleSize} publications</li>
                <li>
                  {entry.trialDays > 0
                    ? `Essai de ${entry.trialDays} jours avec ${entry.trialCredits} crédits`
                    : "Sans période d'essai"}
                </li>
              </ul>

              <div className="mt-5 flex flex-col gap-2">
                <ButtonLink
                  href={`/api/stripe/checkout?offre=${entry.id}&cycle=month`}
                  variant={current ? "secondary" : "primary"}
                  className="w-full"
                >
                  {current ? "Renouveler au mois" : "Souscrire au mois"}
                </ButtonLink>
                <ButtonLink
                  href={`/api/stripe/checkout?offre=${entry.id}&cycle=year`}
                  variant="secondary"
                  className="w-full"
                >
                  Souscrire à l&apos;année
                </ButtonLink>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Factures */}
      <Card className="mt-5">
        <h2 className="mb-4 font-display text-[15px] font-semibold">Factures</h2>
        {invoices.length === 0 ? (
          <p className="text-[13.5px] text-muted">
            Aucune facture pour l&apos;instant. Elles apparaîtront ici après votre premier
            paiement.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--line)]
                  pb-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px]">{invoice.number}</p>
                  <p className="font-mono text-[10.5px] text-faint">
                    {formatDateTime(invoice.created)} · {invoice.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[13px]">
                    {(invoice.total / 100).toFixed(2).replace(".", ",")}{" "}
                    {invoice.currency.toUpperCase()}
                  </span>
                  {invoice.pdf ? (
                    <a
                      href={invoice.pdf}
                      className="text-[12.5px] text-muted underline decoration-dotted underline-offset-2 hover:text-amber-300"
                    >
                      PDF
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
