import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * SQLite via better-sqlite3 : synchrone, sans service externe.
 * Le schéma est appliqué à l'ouverture ; chaque instruction est idempotente.
 */

const DB_PATH = process.env.CLIEDD_DB_PATH ?? ".data/cliedd.db";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  google_id     TEXT UNIQUE,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL
);

-- Connexion de publication X, distincte de l'identité du compte :
-- on peut posséder un compte sans avoir encore relié X.
CREATE TABLE IF NOT EXISTS x_connections (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  x_user_id        TEXT NOT NULL UNIQUE,
  handle           TEXT NOT NULL,
  name             TEXT NOT NULL,
  avatar_url       TEXT,
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  plan              TEXT NOT NULL DEFAULT 'starter',
  credits_remaining INTEGER NOT NULL DEFAULT 25,
  credits_reset_at  INTEGER NOT NULL,
  trial_ends_at     INTEGER,
  framework         TEXT NOT NULL DEFAULT 'AIDA',
  custom_prompt     TEXT,
  product_context   TEXT,
  timezone          TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at        INTEGER NOT NULL,
  -- Facturation Stripe
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT,
  billing_interval       TEXT,
  current_period_end     INTEGER,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connectors (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  title           TEXT NOT NULL,
  mode            TEXT NOT NULL DEFAULT 'review',
  active          INTEGER NOT NULL DEFAULT 1,
  last_fetched_at INTEGER,
  last_error      TEXT,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS source_items (
  id           TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  guid         TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  summary      TEXT,
  published_at INTEGER,
  processed    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  UNIQUE (connector_id, guid)
);

CREATE TABLE IF NOT EXISTS drafts (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_item_id TEXT REFERENCES source_items(id) ON DELETE SET NULL,
  content        TEXT NOT NULL,
  framework      TEXT NOT NULL DEFAULT 'AIDA',
  status         TEXT NOT NULL DEFAULT 'draft',
  media_kind     TEXT NOT NULL DEFAULT 'none',
  scheduled_at   INTEGER,
  published_at   INTEGER,
  x_post_id      TEXT,
  credit_cost    INTEGER NOT NULL DEFAULT 1,
  error          TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  delta        INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  draft_id     TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id          TEXT PRIMARY KEY,
  draft_id    TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  impressions INTEGER NOT NULL DEFAULT 0,
  likes       INTEGER NOT NULL DEFAULT 0,
  reposts     INTEGER NOT NULL DEFAULT 0,
  replies     INTEGER NOT NULL DEFAULT 0,
  fetched_at  INTEGER NOT NULL,
  UNIQUE (draft_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state         TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'x',
  code_verifier TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

-- Événements Stripe déjà traités : la livraison des webhooks étant
-- « au moins une fois », cette table rend le traitement idempotent.
CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_workspace ON drafts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_due ON drafts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_items_connector ON source_items(connector_id, processed);
CREATE INDEX IF NOT EXISTS idx_ledger_workspace ON credit_ledger(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workspace_customer ON workspaces(stripe_customer_id);
`;

/**
 * Migrations successives, indexées par `PRAGMA user_version`.
 * Le schéma ci-dessus crée les tables manquantes ; ces étapes rattrapent les
 * bases déjà créées par une version antérieure, où les colonnes existent
 * mais dans une forme différente.
 */
const MIGRATIONS: Array<(handle: Database.Database) => void> = [
  // v0 → v1 : l'identité passe de X à Google, X devient une connexion de
  // publication séparée.
  (handle) => {
    const columns = handle
      .prepare(`PRAGMA table_info(users)`)
      .all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));

    if (names.has("x_user_id")) {
      // Bascule des comptes existants vers la nouvelle forme.
      handle.exec(`
        INSERT OR IGNORE INTO x_connections
          (user_id, x_user_id, handle, name, avatar_url, access_token,
           refresh_token, token_expires_at, created_at)
        SELECT id, x_user_id, handle, name, avatar_url, access_token,
               refresh_token, token_expires_at, created_at
        FROM users WHERE x_user_id IS NOT NULL;

        ALTER TABLE users RENAME TO users_legacy;
        CREATE TABLE users (
          id         TEXT PRIMARY KEY,
          email      TEXT UNIQUE,
          google_id  TEXT UNIQUE,
          name       TEXT NOT NULL,
          avatar_url TEXT,
          created_at INTEGER NOT NULL
        );
        INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
        SELECT id, NULL, NULL, name, avatar_url, created_at FROM users_legacy;
        DROP TABLE users_legacy;
      `);
    }
  },
];

function migrate(handle: Database.Database) {
  const version = handle.pragma("user_version", { simple: true }) as number;

  for (let step = version; step < MIGRATIONS.length; step += 1) {
    handle.transaction(() => MIGRATIONS[step](handle))();
  }

  handle.pragma(`user_version = ${MIGRATIONS.length}`);
}

let instance: Database.Database | null = null;

export function db(): Database.Database {
  if (instance) return instance;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const handle = new Database(DB_PATH);
  handle.exec(SCHEMA);
  migrate(handle);
  instance = handle;
  return handle;
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function now() {
  return Date.now();
}
