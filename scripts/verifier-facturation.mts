/**
 * Vérifie la chaîne de facturation sans toucher à Stripe :
 * signature des webhooks, idempotence des événements, et synchronisation
 * d'un abonnement vers l'offre et le quota de l'espace de travail.
 *
 *   npm run verifier:facturation
 */
process.env.CLIEDD_DB_PATH = process.argv[2] ?? ".data/verification-facturation.db";
// Clé factice : aucun appel réseau n'est émis, seule la cryptographie
// de signature et la logique locale sont exercées.
process.env.STRIPE_SECRET_KEY = "sk_test_factice_pour_signature";

const { db, uid, now } = await import("@/server/db");
const { syncSubscription, claimEvent, stripeMode, stripe } = await import(
  "@/server/stripe"
);

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

console.log("\n[1] Mode déduit du préfixe de clé");
check("clé sk_test_ → mode test", stripeMode() === "test", String(stripeMode()));

console.log("\n[2] Signature de webhook");
const secret = "whsec_test_secret_pour_verification";
const payload = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });
const header = stripe().webhooks.generateTestHeaderString({ payload, secret });

let verified = false;
try {
  const event = stripe().webhooks.constructEvent(payload, header, secret);
  verified = event.id === "evt_1";
} catch { /* laissé à false */ }
check("signature valide acceptée", verified);

let rejected = false;
try {
  stripe().webhooks.constructEvent(payload, header, "whsec_mauvais_secret");
} catch { rejected = true; }
check("signature invalide rejetée", rejected);

let tampered = false;
try {
  stripe().webhooks.constructEvent(payload.replace("ping", "pong"), header, secret);
} catch { tampered = true; }
check("charge utile altérée rejetée", tampered);

console.log("\n[3] Idempotence des événements");
check("première réclamation acceptée", claimEvent("evt_xyz", "test") === true);
check("seconde réclamation refusée", claimEvent("evt_xyz", "test") === false);

console.log("\n[4] Synchronisation d'abonnement");
const userId = uid("usr");
const wsId = uid("wsp");
db().prepare(
  `INSERT INTO users (id, email, google_id, name, avatar_url, created_at) VALUES (?,?,?,?,?,?)`
).run(userId, "t@e.com", "g1", "Test", null, now());
db().prepare(
  `INSERT INTO workspaces (id, user_id, name, plan, credits_remaining, credits_reset_at,
    trial_ends_at, framework, custom_prompt, product_context, timezone, created_at,
    stripe_customer_id, stripe_subscription_id, subscription_status, billing_interval,
    current_period_end, cancel_at_period_end)
   VALUES (?,?,?,'starter',25,?,NULL,'AIDA',NULL,NULL,'Europe/Paris',?,'cus_test',NULL,NULL,NULL,NULL,0)`
).run(wsId, userId, "Espace", now() + 1e9, now());

const periodEnd = Math.floor((Date.now() + 30 * 864e5) / 1000);
const subscription = {
  id: "sub_test",
  customer: "cus_test",
  status: "active",
  cancel_at_period_end: false,
  metadata: { cliedd_plan: "pro" },
  items: {
    data: [
      {
        current_period_end: periodEnd,
        price: {
          lookup_key: "cliedd_pro_month",
          recurring: { interval: "month" },
          metadata: { cliedd_plan: "pro" },
        },
      },
    ],
  },
} as never;

const result = syncSubscription(subscription);
const ws = db().prepare(`SELECT * FROM workspaces WHERE id = ?`).get(wsId) as Record<string, unknown>;

check("espace retrouvé par client Stripe", result.updated === true);
check("offre passée à Pro", ws.plan === "pro", String(ws.plan));
check("quota Pro attribué (500)", ws.credits_remaining === 500, String(ws.credits_remaining));
check("statut enregistré", ws.subscription_status === "active", String(ws.subscription_status));
check("cycle mensuel", ws.billing_interval === "month", String(ws.billing_interval));
check("échéance en millisecondes", ws.current_period_end === periodEnd * 1000);

console.log("\n[5] Rejeu du même événement (Stripe livre plusieurs fois)");
db().prepare(`UPDATE workspaces SET credits_remaining = 120 WHERE id = ?`).run(wsId);
syncSubscription(subscription);
const after = db().prepare(`SELECT credits_remaining FROM workspaces WHERE id = ?`).get(wsId) as { credits_remaining: number };
check("quota NON réattribué sur rejeu", after.credits_remaining === 120, String(after.credits_remaining));

console.log("\n[6] Résiliation");
const canceled = { ...subscription, status: "canceled" } as never;
syncSubscription(canceled);
const ws2 = db().prepare(`SELECT plan, subscription_status FROM workspaces WHERE id = ?`).get(wsId) as Record<string, unknown>;
check("retour à l'offre d'entrée", ws2.plan === "starter", String(ws2.plan));
check("statut résilié", ws2.subscription_status === "canceled");

console.log(failures === 0 ? "\n=== TOUT PASSE ===" : `\n=== ${failures} ÉCHEC(S) ===`);
process.exit(failures === 0 ? 0 : 1);
