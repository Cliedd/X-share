import { NextResponse } from "next/server";
import { beginAuthorization, xConfig } from "@/server/x-oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!xConfig().configured) {
    // Sans identifiants X, on renvoie vers la connexion de démonstration.
    return NextResponse.redirect(
      new URL("/api/auth/demo", process.env.APP_URL ?? "http://localhost:3000"),
    );
  }

  return NextResponse.redirect(await beginAuthorization());
}
