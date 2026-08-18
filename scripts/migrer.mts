/**
 * Applique les migrations de schéma puis termine.
 * Utilisé au déploiement (Railway `releaseCommand`, ou à la main) :
 *
 *   npm run migrer
 */
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
