/**
 * Provisionne le catalogue Stripe et enregistre le webhook.
 *
 *   npm run setup:stripe
 *
 * Ce script est idempotent : relancer ne crée pas de doublons.
 * Il affiche à la fin la valeur de STRIPE_WEBHOOK_SECRET à copier.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Charge .env.local si présent (développement local)
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  // Pas de .env.local — normal en production
}

import Stripe from "stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error("❌ STRIPE_SECRET_KEY absente.");
  process.exit(1);
}

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const stripe = new Stripe(STRIPE_KEY);

const CURRENCY = "usd";

const PLANS = [
  { id: "starter", name: "CLIEDD Démarreur", credits: 200, prices: { month: 999,  year: 9590  } },
  { id: "pro",     name: "CLIEDD Pro",       credits: 500, prices: { month: 1999, year: 19190 } },
  { id: "elite",   name: "CLIEDD Élite",     credits: 1500, prices: { month: 9999, year: 95990 } },
] as const;

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;

// ── 1. Catalogue produits + prix ─────────────────────────────────────────────

console.log("\n📦 Provisionnement du catalogue...\n");

for (const p of PLANS) {
  // Produit
  const products = await stripe.products.search({
    query: `metadata['cliedd_plan']:'${p.id}'`,
    limit: 1,
  });

  const product =
    products.data[0] ??
    (await stripe.products.create({
      name: p.name,
      description: `${p.credits} crédits de publication X par mois.`,
      metadata: { cliedd_plan: p.id },
    }));

  console.log(`  ✅ Produit : ${product.name} (${product.id})`);

  // Prix mensuel
  for (const interval of ["month", "year"] as const) {
    const key = `cliedd_${p.id}_${interval}`;
    const existing = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });

    if (existing.data[0]) {
      console.log(`     Prix ${interval} : déjà existant (${existing.data[0].id})`);
    } else {
      const price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: p.prices[interval],
        recurring: { interval },
        lookup_key: key,
        metadata: { cliedd_plan: p.id, cliedd_interval: interval },
      });
      console.log(`     Prix ${interval} : créé ${price.id} (${p.prices[interval] / 100} $)`);
    }
  }
}

// ── 2. Portail client (configuration par défaut) ─────────────────────────────

console.log("\n🔧 Configuration du portail client...");

try {
  const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
  if (configs.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Gérez votre abonnement CLIEDD",
        privacy_policy_url: `${APP_URL}/confidentialite`,
        terms_of_service_url: `${APP_URL}/termes`,
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price", "quantity", "promotion_code"],
          proration_behavior: "create_prorations",
        },
      },
    });
    console.log("  ✅ Portail client créé.");
  } else {
    console.log("  ✅ Portail client : déjà configuré.");
  }
} catch (e) {
  // Les clés restreintes peuvent ne pas avoir accès au portail — ce n'est pas bloquant.
  console.log("  ⚠️  Portail client : permission insuffisante (non bloquant).");
}

// ── 3. Webhook ───────────────────────────────────────────────────────────────

console.log(`\n🔗 Enregistrement du webhook → ${WEBHOOK_URL}...\n`);

let webhookSecret: string | null = null;

try {
  // Cherche un webhook existant pour cette URL
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = existing.data.find((w) => w.url === WEBHOOK_URL);

  if (found) {
    console.log(`  ✅ Webhook déjà enregistré (${found.id})`);
    console.log(`     Statut : ${found.status}`);
    console.log(`     Événements : ${found.enabled_events.join(", ")}`);
    console.log(
      `\n  ⚠️  Le secret du webhook existant ne peut pas être relu via l'API.`,
    );
    console.log(
      `     Si STRIPE_WEBHOOK_SECRET n'est pas encore configuré, supprimez ce`,
    );
    console.log(
      `     webhook dans le dashboard Stripe et relancez ce script.\n`,
    );
  } else {
    const webhook = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: "CLIEDD — webhook de production",
    });

    webhookSecret = webhook.secret ?? null;
    console.log(`  ✅ Webhook créé : ${webhook.id}`);
    console.log(`     URL : ${webhook.url}`);
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.log(`  ⚠️  Impossible de créer le webhook via l'API : ${msg}`);
  console.log(`     Créez-le manuellement dans le dashboard Stripe :`);
  console.log(`     URL : ${WEBHOOK_URL}`);
  console.log(`     Événements : ${WEBHOOK_EVENTS.join(", ")}`);
}

// ── Résultat ─────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log("✅  Setup Stripe terminé !");
console.log("═".repeat(60));

if (webhookSecret) {
  console.log("\n🔑 STRIPE_WEBHOOK_SECRET à ajouter dans Railway :\n");
  console.log(`   ${webhookSecret}`);
  console.log(
    "\n   railway variable set STRIPE_WEBHOOK_SECRET=" + webhookSecret,
  );
}

console.log("\nVariables nécessaires dans Railway :");
console.log("  STRIPE_SECRET_KEY        ✅ déjà configurée");
console.log("  STRIPE_WEBHOOK_SECRET    " + (webhookSecret ? "✅ ci-dessus" : "⚠️  à récupérer"));
console.log("");
