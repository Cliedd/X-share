import { db } from "./db";
import { MIGRATIONS } from "./schema";

/**
 * Applique les migrations manquantes, sous verrou consultatif : plusieurs
 * instances qui démarrent en même temps ne peuvent pas migrer en parallèle.
 */
export async function migrate(): Promise<{ applied: string[]; skipped: number }> {
  const pool = db();
  const client = await pool.connect();
  const applied: string[] = [];
  let skipped = 0;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at BIGINT NOT NULL
      )
    `);

    // Verrou consultatif : la clé est arbitraire mais stable.
    await client.query("SELECT pg_advisory_lock($1)", [873_2041]);

    const done = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const known = new Set(done.rows.map((row) => row.name));

    for (const migration of MIGRATIONS) {
      if (known.has(migration.name)) {
        skipped += 1;
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)",
          [migration.name, Date.now()],
        );
        await client.query("COMMIT");
        applied.push(migration.name);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration ${migration.name} en échec : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [873_2041]).catch(() => {});
    client.release();
  }

  return { applied, skipped };
}

/**
 * Garantit que le schéma est en place avant la première requête.
 * La promesse est mémorisée : la migration n'est tentée qu'une fois par
 * instance, même sous requêtes concurrentes.
 */
let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = migrate()
      .then(({ applied }) => {
        if (applied.length > 0) {
          console.log(`Schéma : ${applied.length} migration(s) appliquée(s).`);
        }
      })
      .catch((error) => {
        // Une migration en échec ne doit pas être mise en cache : la
        // prochaine requête doit pouvoir réessayer.
        ready = null;
        throw error;
      });
  }
  return ready;
}
