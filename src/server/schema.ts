/**
 * Migrations de schéma, appliquées dans l'ordre et une seule fois.
 * Chaque entrée est enregistrée dans `schema_migrations` : relancer la
 * migration sur une base déjà à jour ne fait rien.
 *
 * Les horodatages sont des BIGINT en millisecondes depuis l'époque Unix,
 * comme partout dans le code applicatif.
 */

export type Migration = { name: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    name: "0001_initial",
    sql: `
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE,
  google_id  TEXT UNIQUE,
  name       TEXT NOT NULL,
  avatar_url TEXT,
  created_at BIGINT NOT NULL
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
  token_expires_at BIGINT,
  created_at       BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  plan                   TEXT NOT NULL DEFAULT 'starter',
  credits_remaining      INTEGER NOT NULL DEFAULT 25,
  credits_reset_at       BIGINT NOT NULL,
  trial_ends_at          BIGINT,
  framework              TEXT NOT NULL DEFAULT 'AIDA',
  custom_prompt          TEXT,
  product_context        TEXT,
  timezone               TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at             BIGINT NOT NULL,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  subscription_status    TEXT,
  billing_interval       TEXT,
  current_period_end     BIGINT,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connectors (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  title           TEXT NOT NULL,
  mode            TEXT NOT NULL DEFAULT 'review',
  active          INTEGER NOT NULL DEFAULT 1,
  last_fetched_at BIGINT,
  last_error      TEXT,
  created_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_items (
  id           TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  guid         TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  summary      TEXT,
  published_at BIGINT,
  processed    INTEGER NOT NULL DEFAULT 0,
  created_at   BIGINT NOT NULL,
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
  scheduled_at   BIGINT,
  published_at   BIGINT,
  x_post_id      TEXT,
  credit_cost    INTEGER NOT NULL DEFAULT 1,
  error          TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  created_at     BIGINT NOT NULL,
  updated_at     BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  delta        INTEGER NOT NULL,
  reason       TEXT NOT NULL,
  draft_id     TEXT,
  created_at   BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id          TEXT PRIMARY KEY,
  draft_id    TEXT NOT NULL UNIQUE REFERENCES drafts(id) ON DELETE CASCADE,
  impressions INTEGER NOT NULL DEFAULT 0,
  likes       INTEGER NOT NULL DEFAULT 0,
  reposts     INTEGER NOT NULL DEFAULT 0,
  replies     INTEGER NOT NULL DEFAULT 0,
  fetched_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state         TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'x',
  code_verifier TEXT NOT NULL,
  created_at    BIGINT NOT NULL
);

-- Événements Stripe déjà traités : la livraison étant « au moins une fois »,
-- cette table rend le traitement idempotent.
CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  processed_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_workspace ON drafts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_due ON drafts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_items_connector ON source_items(connector_id, processed);
CREATE INDEX IF NOT EXISTS idx_ledger_workspace ON credit_ledger(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workspace_customer ON workspaces(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_connectors_workspace ON connectors(workspace_id);
`,
  },
];
