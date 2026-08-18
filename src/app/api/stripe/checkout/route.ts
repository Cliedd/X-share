import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/server/auth";
import { createCheckoutSession, stripeConfigured } from "@/server/stripe";
import { PLANS } from "@/server/plans";
import type { BillingInterval, PlanId } from "@/server/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const planId = params.get("offre") as PlanId | null;
  const interval = (params.get("cycle") ?? "month") as BillingInterval;

  if (!planId || !(planId in PLANS)) {
    return NextResponse.redirect(new URL("/tarification?erreur=offre", request.url));
  }

  const context = await requireSession();
  if (!context) {
    // On mémorise l'offre choisie pour reprendre après connexion.
    const target = new URL("/commencer", request.url);
    target.searchParams.set("offre", planId);
    target.searchParams.set("cycle", interval);
    return NextResponse.redirect(target);
  }

  if (!stripeConfigured()) {
    return NextResponse.redirect(new URL("/app/facturation?erreur=stripe", request.url));
  }

  try {
    const url = await createCheckoutSession(
      context.user,
      context.workspace,
      planId,
      interval === "year" ? "year" : "month",
    );
    return NextResponse.redirect(url ?? new URL("/app/facturation", request.url));
  } catch (error) {
    console.error("Checkout Stripe :", error);
    return NextResponse.redirect(new URL("/app/facturation?erreur=checkout", request.url));
  }
}
