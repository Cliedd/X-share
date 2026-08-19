import { NextResponse, type NextRequest } from "next/server";
import { beginGoogleAuthorization, googleConfig } from "@/server/google-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  void request;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!googleConfig().configured) {
    return NextResponse.redirect(new URL("/api/auth/demo", appUrl));
  }

  return NextResponse.redirect(await beginGoogleAuthorization());
}
