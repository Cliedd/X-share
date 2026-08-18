import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// node-postgres rend les BIGINT sous forme de chaînes, par prudence vis-à-vis
// des entiers 64 bits. Nos BIGINT sont des horodatages en millisecondes et des
// compteurs — tous très en deçà de Number.MAX_SAFE_INTEGER — et les recevoir
// en chaînes casserait silencieusement le formatage des dates et les calculs.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

/**
 * Accès Postgres.
 *
 * Conçu pour Neon, et compatible avec tout Postgres (Railway, Supabase,
 * instance locale). En environnement sans état — Vercel, conteneur
 * redémarré — utilisez la chaîne de connexion *poolée* de Neon, celle dont
 * l'hôte se termine par `-pooler`.
 */

let pool: Pool | null = null;

export function db(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL absente. Créez une base Neon (neon.tech, gratuit) et copiez " +
        "la chaîne de connexion poolée dans .env.local.",
    );
  }

  pool = new Pool({
    connectionString,
    // Neon et la plupart des hébergeurs gérés imposent TLS ; une instance
    // locale ne le propose pas.
    ssl: /localhost|127\.0\.0\.1/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (error) => {
    console.error("Pool Postgres :", error.message);
  });

  return pool;
}

/**
 * Traduit les marqueurs `?` en `$1, $2, …` attendus par Postgres.
 * Écrire les requêtes avec `?` garde une seule forme dans tout le code.
 */
function positional(text: string) {
  let index = 0;
  return text.replace(/\?/g, () => `$${(index += 1)}`);
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db().query<T>(positional(text), params);
  return result.rows;
}

/** Première ligne, ou `null` — le cas courant d'une lecture par identifiant. */
export async function one<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Nombre de lignes affectées : sert à savoir si une écriture a bien eu lieu. */
export async function run(text: string, params: unknown[] = []): Promise<number> {
  const result = await db().query(positional(text), params);
  return result.rowCount ?? 0;
}

/**
 * Transaction interactive. Le client est réservé le temps du bloc, et la
 * transaction est annulée si la fonction lève.
 */
export async function transaction<T>(fn: (client: Tx) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(wrap(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type Tx = {
  query: <T extends QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;
  one: <T extends QueryResultRow>(text: string, params?: unknown[]) => Promise<T | null>;
  run: (text: string, params?: unknown[]) => Promise<number>;
};

function wrap(client: PoolClient): Tx {
  return {
    async query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
      const result = await client.query<T>(positional(text), params);
      return result.rows;
    },
    async one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
      const result = await client.query<T>(positional(text), params);
      return result.rows[0] ?? null;
    },
    async run(text: string, params: unknown[] = []) {
      const result = await client.query(positional(text), params);
      return result.rowCount ?? 0;
    },
  };
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function now() {
  return Date.now();
}

/** Ferme le pool — utile aux scripts en ligne de commande. */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
