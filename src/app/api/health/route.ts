import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { ensureSchema } from "@/server/migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonde de santé pour l'hébergeur. Vérifie que la base répond et que le
 * schéma est appliqué ; renvoie 503 sinon, pour qu'un déploiement défaillant
 * ne reçoive pas de trafic.
 */
export async function GET() {
  const started = Date.now();

  try {
    await ensureSchema();
    const row = await one<{ ok: number }>("SELECT 1 AS ok");

    return NextResponse.json({
      status: "ok",
      database: row?.ok === 1 ? "connectée" : "réponse inattendue",
      latencyMs: Date.now() - started,
      services: {
        google: Boolean(process.env.GOOGLE_CLIENT_ID),
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        stripeMode: /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "") ? "live" : "test",
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        x: Boolean(process.env.X_CLIENT_ID),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "erreur",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
