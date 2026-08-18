import { NextResponse, type NextRequest } from "next/server";
import { beginAuthorization, xConfig } from "@/server/x-oauth";
import { requireSession } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Relier X suppose un compte : on passe d'abord par la connexion.
  const context = await requireSession();
  if (!context) return NextResponse.redirect(new URL("/commencer", request.url));

  if (!xConfig().configured) {
    return NextResponse.redirect(new URL("/app/parametres?x=non-configure", request.url));
  }

  return NextResponse.redirect(await beginAuthorization());
}
