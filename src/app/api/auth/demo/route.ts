import { NextResponse, type NextRequest } from "next/server";
import { demoUser, createSession, setSessionCookie } from "@/server/auth";
import { googleConfig } from "@/server/google-oauth";

export const runtime = "nodejs";

/**
 * Connexion de démonstration : disponible uniquement tant que Google n'est
 * pas configuré, pour que l'application soit exerçable sans fournisseur.
 */
export async function GET(request: NextRequest) {
  void request;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (googleConfig().configured) {
    return NextResponse.redirect(new URL("/api/auth/google/login", appUrl));
  }

  const user = await demoUser();
  await setSessionCookie(await createSession(user.id));
  return NextResponse.redirect(new URL("/app", appUrl));
}
