import { NextResponse, type NextRequest } from "next/server";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/server/google-oauth";
import { consumeState } from "@/server/x-oauth";
import { upsertGoogleUser, createSession, setSessionCookie } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  // Use the public APP_URL as base for all redirects to avoid resolving against
  // the internal 0.0.0.0 host that Railway exposes to the Node process.
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (params.get("error")) {
    return NextResponse.redirect(new URL("/commencer?erreur=refus", appUrl));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/commencer?erreur=parametres", appUrl));
  }

  const verifier = await consumeState(state, "google");
  if (!verifier) {
    return NextResponse.redirect(new URL("/commencer?erreur=etat", appUrl));
  }

  try {
    const token = await exchangeGoogleCode(code, verifier);
    const profile = await fetchGoogleProfile(token.access_token);
    const user = await upsertGoogleUser(profile);

    await setSessionCookie(await createSession(user.id));
    return NextResponse.redirect(new URL("/app", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/commencer?erreur=echange", appUrl));
  }
}
