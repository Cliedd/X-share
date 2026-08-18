import Stripe from "stripe";
import { db, now } from "./db";
import { PLANS, plan } from "./plans";
import { ledger } from "./credits";
import type { BillingInterval, PlanId, SubscriptionStatus, User, Workspace } from "./types";

/**
 * Chaîne de paiement Stripe.
 *
 * Le catalogue est provisionné automatiquement à la première utilisation,
 * repéré par `lookup_key` : il n'y a donc aucun identifiant de prix à créer
 * dans le tableau de bord Stripe ni à recopier dans la configuration. Fournir
 * la clé secrète suffit — en test comme en production.
 */

const CURRENCY = "usd";

/** Tarifs en centimes. L'annuel applique deux mois offerts. */
export const PRICING: Record<PlanId, Record<BillingInterval, number>> = {
  starter: { month: 999, year: 9590 },
  pro: { month: 1999, year: 19190 },
  elite: { month: 9999, year: 95990 },
};

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** « test » ou « live », déduit du préfixe de la clé — jamais configuré à la main. */
export function stripeMode(): "test" | "live" | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.startsWith("sk_live_") ? "live" : "test";
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY absente : la facturation n'est pas configurée.");
  if (!client) client = new Stripe(key);
  return client;
}

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** Clé stable identifiant un tarif, indépendante de l'environnement Stripe. */
function lookupKey(planId: PlanId, interval: BillingInterval) {
  return `cliedd_${planId}_${interval}`;
}

/**
 * Retrouve le tarif par sa clé de recherche, et le crée s'il n'existe pas
 * encore. L'opération est idempotente : un second appel réutilise le tarif.
 */
async function ensurePrice(planId: PlanId, interval: BillingInterval): Promise<Stripe.Price> {
  const key = lookupKey(planId, interval);
  const api = stripe();

  const existing = await api.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0];

  const settings = plan(planId);
  const products = await api.products.search({
    query: `metadata['cliedd_plan']:'${planId}'`,
    limit: 1,
  });

  const product =
    products.data[0] ??
    (await api.products.create({
      name: `CLIEDD ${settings.name}`,
      description: `${settings.monthlyCredits} crédits de publication X par mois.`,
      metadata: { cliedd_plan: planId },
    }));

  return api.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: PRICING[planId][interval],
    recurring: { interval },
    lookup_key: key,
    metadata: { cliedd_plan: planId, cliedd_interval: interval },
  });
}

/** Client Stripe de l'espace de travail, créé au besoin puis mémorisé. */
async function ensureCustomer(user: User, workspace: Workspace): Promise<string> {
  if (workspace.stripe_customer_id) return workspace.stripe_customer_id;

  const customer = await stripe().customers.create({
    email: user.email ?? undefined,
    name: user.name,
    metadata: { cliedd_workspace: workspace.id, cliedd_user: user.id },
  });

  db()
    .prepare(`UPDATE workspaces SET stripe_customer_id = ? WHERE id = ?`)
    .run(customer.id, workspace.id);

  return customer.id;
}

export async function createCheckoutSession(
  user: User,
  workspace: Workspace,
  planId: PlanId,
  interval: BillingInterval,
) {
  const price = await ensurePrice(planId, interval);
  const customer = await ensureCustomer(user, workspace);
  const settings = plan(planId);

  // L'offre Élite est souscrite sans période d'essai, conformément à la
  // page tarifaire.
  const trialDays = settings.trialDays > 0 ? settings.trialDays : undefined;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { cliedd_workspace: workspace.id, cliedd_plan: planId },
    },
    client_reference_id: workspace.id,
    metadata: { cliedd_workspace: workspace.id, cliedd_plan: planId },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/app/facturation?paiement=succes`,
    cancel_url: `${appUrl()}/tarification?paiement=annule`,
  });

  return session.url;
}

export async function createPortalSession(workspace: Workspace) {
  if (!workspace.stripe_customer_id) return null;

  const session = await stripe().billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${appUrl()}/app/facturation`,
  });

  return session.url;
}

/**
 * Fin de la période en cours. Stripe a déplacé ce champ sur les lignes
 * d'abonnement ; on lit la ligne en priorité et on retombe sur le champ
 * historique pour rester compatible avec les deux formes.
 */
function periodEnd(subscription: Stripe.Subscription): number | null {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const seconds = item?.current_period_end ?? legacy;
  return seconds ? seconds * 1000 : null;
}

function planOf(subscription: Stripe.Subscription): PlanId {
  const fromMetadata = subscription.metadata?.cliedd_plan as PlanId | undefined;
  if (fromMetadata && fromMetadata in PLANS) return fromMetadata;

  const price = subscription.items.data[0]?.price;
  const fromPrice = price?.metadata?.cliedd_plan as PlanId | undefined;
  if (fromPrice && fromPrice in PLANS) return fromPrice;

  // Dernier recours : la clé de recherche porte le nom de l'offre.
  const key = price?.lookup_key ?? "";
  const match = /^cliedd_(starter|pro|elite)_/.exec(key);
  return (match?.[1] as PlanId) ?? "starter";
}

/**
 * Aligne l'espace de travail sur l'abonnement Stripe : offre, statut, cycle,
 * échéance. Le quota est recalé lors du passage à une offre supérieure ou au
 * renouvellement d'une période.
 */
export function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const workspace = db()
    .prepare(`SELECT * FROM workspaces WHERE stripe_customer_id = ?`)
    .get(customerId) as Workspace | undefined;

  if (!workspace) return { updated: false, reason: "espace de travail introuvable" };

  const status = subscription.status as SubscriptionStatus;
  const active = status === "active" || status === "trialing";
  const planId = planOf(subscription);
  const interval =
    (subscription.items.data[0]?.price?.recurring?.interval as BillingInterval | undefined) ??
    "month";

  // Un abonnement résilié ou impayé ramène l'espace à l'offre d'entrée.
  const effectivePlan = active ? planId : "starter";
  const quota = plan(effectivePlan).monthlyCredits;
  const end = periodEnd(subscription);

  const planChanged = workspace.plan !== effectivePlan;
  const periodChanged =
    end !== null && (workspace.current_period_end ?? 0) < end && workspace.current_period_end !== null;

  db()
    .prepare(
      `UPDATE workspaces SET plan = ?, subscription_status = ?, stripe_subscription_id = ?,
        billing_interval = ?, current_period_end = ?, cancel_at_period_end = ?
       WHERE id = ?`,
    )
    .run(
      effectivePlan,
      status,
      subscription.id,
      interval,
      end,
      subscription.cancel_at_period_end ? 1 : 0,
      workspace.id,
    );

  // Le quota n'est réattribué que sur un vrai changement, jamais à chaque
  // événement — Stripe en émet plusieurs pour une même transition.
  if (active && (planChanged || periodChanged)) {
    db()
      .prepare(`UPDATE workspaces SET credits_remaining = ?, credits_reset_at = ? WHERE id = ?`)
      .run(quota, end ?? now() + 30 * 24 * 60 * 60 * 1000, workspace.id);
    ledger(
      workspace.id,
      quota,
      planChanged ? `Passage à l'offre ${plan(effectivePlan).name}` : "Renouvellement de période",
    );
  }

  return { updated: true, workspace: workspace.id, plan: effectivePlan, status };
}

/** Marque un événement comme traité ; renvoie faux s'il l'était déjà. */
export function claimEvent(id: string, type: string) {
  const result = db()
    .prepare(`INSERT OR IGNORE INTO stripe_events (id, type, processed_at) VALUES (?, ?, ?)`)
    .run(id, type, now());
  return result.changes > 0;
}

export async function listInvoices(workspace: Workspace) {
  if (!workspace.stripe_customer_id || !stripeConfigured()) return [];

  const invoices = await stripe().invoices.list({
    customer: workspace.stripe_customer_id,
    limit: 12,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id ?? "",
    number: invoice.number ?? "—",
    total: invoice.total,
    currency: invoice.currency,
    status: invoice.status ?? "draft",
    created: invoice.created * 1000,
    url: invoice.hosted_invoice_url ?? null,
    pdf: invoice.invoice_pdf ?? null,
  }));
}
