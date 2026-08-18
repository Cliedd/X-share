import { NextResponse, type NextRequest } from "next/server";
import { demoUser, createSession, setSessionCookie } from "@/server/auth";
import { googleConfig } from "@/server/google-oauth";

export const runtime = "nodejs";

/**
 * Connexion de démonstration : disponible uniquement tant que Google n'est
 * pas configuré, pour que l'application soit exerçable sans fournisseur.
 */
export async function GET(request: NextRequest) {
  if (googleConfig().configured) {
    return NextResponse.redirect(new URL("/api/auth/google/login", request.url));
  }

  const user = demoUser();
  await setSessionCookie(createSession(user.id));
  return NextResponse.redirect(new URL("/app", request.url));
}
