import { NextResponse, type NextRequest } from "next/server";
import { consumeState, exchangeCode, fetchXProfile } from "@/server/x-oauth";
import { requireSession, linkXAccount } from "@/server/auth";

export const runtime = "nodejs";

/**
 * X n'est pas un moyen de connexion mais une connexion de publication : le
 * compte doit déjà exister, et l'autorisation vient s'y rattacher.
 */
export async function GET(request: NextRequest) {
  void request;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const context = await requireSession();
  if (!context) return NextResponse.redirect(new URL("/commencer", appUrl));

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (params.get("error")) {
    return NextResponse.redirect(new URL("/app/parametres?x=refus", appUrl));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/parametres?x=parametres", appUrl));
  }

  const verifier = await consumeState(state, "x");
  if (!verifier) {
    return NextResponse.redirect(new URL("/app/parametres?x=etat", appUrl));
  }

  try {
    const token = await exchangeCode(code, verifier);
    const profile = await fetchXProfile(token.access_token);

    await linkXAccount(context.user.id, {
      ...profile,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
    });

    return NextResponse.redirect(new URL("/app/parametres?x=succes", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/app/parametres?x=echange", appUrl));
  }
}
