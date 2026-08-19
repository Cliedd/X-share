import { NextResponse, type NextRequest } from "next/server";
import { beginAuthorization, xConfig } from "@/server/x-oauth";
import { requireSession } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  void request;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const context = await requireSession();
  if (!context) return NextResponse.redirect(new URL("/commencer", appUrl));

  if (!xConfig().configured) {
    return NextResponse.redirect(new URL("/app/parametres?x=non-configure", appUrl));
  }

  return NextResponse.redirect(await beginAuthorization());
}
