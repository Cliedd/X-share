import { NextResponse, type NextRequest } from "next/server";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/server/google-oauth";
import { consumeState } from "@/server/x-oauth";
import { upsertGoogleUser, createSession, setSessionCookie } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (params.get("error")) {
    return NextResponse.redirect(new URL("/commencer?erreur=refus", request.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/commencer?erreur=parametres", request.url));
  }

  const verifier = consumeState(state, "google");
  if (!verifier) {
    return NextResponse.redirect(new URL("/commencer?erreur=etat", request.url));
  }

  try {
    const token = await exchangeGoogleCode(code, verifier);
    const profile = await fetchGoogleProfile(token.access_token);
    const user = upsertGoogleUser(profile);

    await setSessionCookie(createSession(user.id));
    return NextResponse.redirect(new URL("/app", request.url));
  } catch {
    return NextResponse.redirect(new URL("/commencer?erreur=echange", request.url));
  }
}
