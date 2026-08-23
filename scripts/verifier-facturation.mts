/**
 * Vérifie la chaîne de facturation sans appeler Stripe :
 * signature des webhooks, idempotence des événements, et synchronisation
 * d'un abonnement vers l'offre et le quota de l'espace de travail.
 *
 *   npm run verifier:facturation
 *
 * Requiert DATABASE_URL. Les données de test sont supprimées à la fin.
 */

// Clé factice : aucun appel réseau n'est émis, seule la cryptographie de
// signature et la logique locale sont exercées.
process.env.STRIPE_SECRET_KEY ??= "sk_test_factice_pour_signature";

import { one, run, closePool, uid, now } from "@/server/db";
import { migrate } from "@/server/migrate";
import { syncSubscription, claimEvent, stripeMode, stripe } from "@/server/stripe";

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  console.log(`${condition ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

await migrate();

const userId = uid("usr");
const wsId = uid("wsp");
const eventId = uid("evt");

try {
  console.log("\n[1] Mode déduit du préfixe de clé");
  check("clé sk_test_ → mode test", stripeMode() === "test", String(stripeMode()));

  console.log("\n[2] Signature de webhook");
  const secret = "whsec_test_secret_pour_verification";
  const payload = JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } });
  const header = stripe().webhooks.generateTestHeaderString({ payload, secret });

  let verified = false;
  try {
    verified = stripe().webhooks.constructEvent(payload, header, secret).id === "evt_1";
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
  check("première réclamation acceptée", (await claimEvent(eventId, "test")) === true);
  check("seconde réclamation refusée", (await claimEvent(eventId, "test")) === false);

  console.log("\n[4] Synchronisation d'abonnement");
  await run(
    `INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, `${userId}@test.local`, userId, "Test", null, now()],
  );
  await run(
    `INSERT INTO workspaces (id, user_id, name, plan, credits_remaining, credits_reset_at,
      trial_ends_at, framework, custom_prompt, product_context, timezone, created_at,
      stripe_customer_id, stripe_subscription_id, subscription_status, billing_interval,
      current_period_end, cancel_at_period_end)
     VALUES (?, ?, 'Espace', 'starter', 25, ?, NULL, 'AIDA', NULL, NULL, 'Europe/Paris', ?,
       ?, NULL, NULL, NULL, NULL, 0)`,
    [wsId, userId, now() + 30 * 864e5, now(), `cus_${wsId}`],
  );

  const periodEnd = Math.floor((Date.now() + 30 * 864e5) / 1000);
  const subscription = {
    id: "sub_test",
    customer: `cus_${wsId}`,
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

  const result = await syncSubscription(subscription);
  type Row = {
    plan: string;
    credits_remaining: number;
    subscription_status: string;
    billing_interval: string;
    current_period_end: string;
  };
  const ws = await one<Row>(`SELECT * FROM workspaces WHERE id = ?`, [wsId]);

  check("espace retrouvé par client Stripe", result.updated === true);
  check("offre passée à Pro", ws?.plan === "pro", String(ws?.plan));
  check("quota Pro attribué (500)", ws?.credits_remaining === 500, String(ws?.credits_remaining));
  check("statut enregistré", ws?.subscription_status === "active");
  check("cycle mensuel", ws?.billing_interval === "month");
  check("échéance en millisecondes", Number(ws?.current_period_end) === periodEnd * 1000);

  console.log("\n[5] Rejeu du même événement (Stripe livre plusieurs fois)");
  await run(`UPDATE workspaces SET credits_remaining = 120 WHERE id = ?`, [wsId]);
  await syncSubscription(subscription);
  const after = await one<{ credits_remaining: number }>(
    `SELECT credits_remaining FROM workspaces WHERE id = ?`,
    [wsId],
  );
  check("quota NON réattribué sur rejeu", after?.credits_remaining === 120, String(after?.credits_remaining));

  console.log("\n[6] Résiliation");
  await syncSubscription({ ...(subscription as object), status: "canceled" } as never);
  const ws2 = await one<{ plan: string; subscription_status: string }>(
    `SELECT plan, subscription_status FROM workspaces WHERE id = ?`,
    [wsId],
  );
  check("retour à l'offre d'entrée", ws2?.plan === "starter", String(ws2?.plan));
  check("statut résilié", ws2?.subscription_status === "canceled");
} finally {
  // Ménage : le script doit pouvoir tourner sur une base réelle.
  await run(`DELETE FROM stripe_events WHERE id = ?`, [eventId]);
  await run(`DELETE FROM users WHERE id = ?`, [userId]);
  await closePool();
}

console.log(failures === 0 ? "\n=== TOUT PASSE ===" : `\n=== ${failures} ÉCHEC(S) ===`);
process.exit(failures === 0 ? 0 : 1);
