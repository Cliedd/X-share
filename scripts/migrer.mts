/**
 * Applique les migrations de schéma puis termine.
 * Utilisé au déploiement (Railway `releaseCommand`, ou à la main) :
 *
 *   npm run migrer
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Charge .env.local si présent (développement local)
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  // Pas de .env.local — normal en production
}

import { migrate } from "@/server/migrate";
import { closePool } from "@/server/db";

try {
  const { applied, skipped } = await migrate();
  if (applied.length === 0) {
    console.log(`Schéma déjà à jour (${skipped} migration(s) connue(s)).`);
  } else {
    console.log(`Appliqué : ${applied.join(", ")}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closePool();
}
