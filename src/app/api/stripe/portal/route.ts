import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/server/auth";
import { createPortalSession, stripeConfigured } from "@/server/stripe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await requireSession();
  if (!context) return NextResponse.redirect(new URL("/commencer", request.url));

  if (!stripeConfigured() || !context.workspace.stripe_customer_id) {
    return NextResponse.redirect(new URL("/app/facturation?erreur=portail", request.url));
  }

  try {
    const url = await createPortalSession(context.workspace);
    return NextResponse.redirect(url ?? new URL("/app/facturation", request.url));
  } catch (error) {
    console.error("Portail Stripe :", error);
    return NextResponse.redirect(new URL("/app/facturation?erreur=portail", request.url));
  }
}
