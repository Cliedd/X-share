import { NextResponse, type NextRequest } from "next/server";
import { upsertXUser, createSession, setSessionCookie } from "@/server/auth";

export const runtime = "nodejs";

/**
 * Connexion de démonstration : disponible uniquement lorsque les identifiants
 * X ne sont pas configurés, pour que l'application soit exerçable de bout en
 * bout sans compte développeur.
 */
export async function GET(request: NextRequest) {
  if (process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/api/auth/x/login", request.url));
  }

  const user = upsertXUser({
    xUserId: "demo-workspace",
    handle: "fondateur",
    name: "Compte de démonstration",
    avatarUrl: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  await setSessionCookie(createSession(user.id));
  return NextResponse.redirect(new URL("/app", request.url));
}
