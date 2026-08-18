import { NextResponse, type NextRequest } from "next/server";
import { beginGoogleAuthorization, googleConfig } from "@/server/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!googleConfig().configured) {
    // Sans identifiants Google, on retombe sur la connexion de démonstration.
    return NextResponse.redirect(new URL("/api/auth/demo", request.url));
  }

  return NextResponse.redirect(await beginGoogleAuthorization());
}
