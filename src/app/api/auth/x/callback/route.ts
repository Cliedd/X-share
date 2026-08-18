import { NextResponse, type NextRequest } from "next/server";
import { consumeState, exchangeCode, fetchXProfile } from "@/server/x-oauth";
import { upsertXUser, createSession, setSessionCookie } from "@/server/auth";

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

  const verifier = consumeState(state);
  if (!verifier) {
    return NextResponse.redirect(new URL("/commencer?erreur=etat", request.url));
  }

  try {
    const token = await exchangeCode(code, verifier);
    const profile = await fetchXProfile(token.access_token);

    const user = upsertXUser({
      ...profile,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
    });

    await setSessionCookie(createSession(user.id));
    return NextResponse.redirect(new URL("/app", request.url));
  } catch {
    return NextResponse.redirect(new URL("/commencer?erreur=echange", request.url));
  }
}
