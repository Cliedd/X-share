import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeConfigured, syncSubscription, claimEvent } from "@/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réception des événements Stripe.
 *
 * La signature est vérifiée sur le corps brut : `request.text()` doit être lu
 * tel quel, sans passer par `request.json()`, sinon la signature ne
 * correspond plus. Stripe livre « au moins une fois » — chaque événement est
 * donc réclamé une seule fois avant traitement.
 */
export async function POST(request: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET absente" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!claimEvent(event.id, event.type)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const id =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        syncSubscription(event.data.object);
        break;

      case "invoice.paid":
      case "invoice.payment_failed": {
        // Le renouvellement recale le quota via l'abonnement rattaché.
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscription = invoice.subscription;
        if (subscription) {
          const id = typeof subscription === "string" ? subscription : subscription.id;
          syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`Traitement de l'événement ${event.type} :`, error);
    // On renvoie 500 pour que Stripe retente la livraison.
    return NextResponse.json({ error: "Traitement en échec" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
