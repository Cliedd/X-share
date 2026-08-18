import { cookies } from "next/headers";
import { db, uid, now } from "./db";
import type { User, Workspace, XConnection } from "./types";
import { ensureCreditCycle } from "./credits";
import { plan } from "./plans";

const SESSION_COOKIE = "cliedd_session";
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

export function createSession(userId: string) {
  const id = uid("ses");
  db()
    .prepare(`INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, userId, now() + SESSION_TTL, now());
  return id;
}

export async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function clearSession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) db().prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const row = db()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(id, now()) as User | undefined;

  return row ?? null;
}

/* ------------------------------- Identité -------------------------------- */

/**
 * Crée ou retrouve le compte associé à une identité Google.
 * Un compte préexistant portant la même adresse est rattaché plutôt que
 * dupliqué, pour qu'une même personne n'ait jamais deux espaces.
 */
export function upsertGoogleUser(profile: {
  googleId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}): User {
  const byGoogle = db()
    .prepare(`SELECT * FROM users WHERE google_id = ?`)
    .get(profile.googleId) as User | undefined;

  if (byGoogle) {
    db()
      .prepare(`UPDATE users SET name = ?, avatar_url = ?, email = ? WHERE id = ?`)
      .run(profile.name, profile.avatarUrl, profile.email, byGoogle.id);
    return { ...byGoogle, ...profile, id: byGoogle.id } as User;
  }

  const byEmail = profile.email
    ? (db().prepare(`SELECT * FROM users WHERE email = ?`).get(profile.email) as User | undefined)
    : undefined;

  if (byEmail) {
    db()
      .prepare(`UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE id = ?`)
      .run(profile.googleId, profile.name, profile.avatarUrl, byEmail.id);
    return { ...byEmail, google_id: profile.googleId };
  }

  const user: User = {
    id: uid("usr"),
    email: profile.email,
    google_id: profile.googleId,
    name: profile.name,
    avatar_url: profile.avatarUrl,
    created_at: now(),
  };

  db()
    .prepare(
      `INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
       VALUES (@id, @email, @google_id, @name, @avatar_url, @created_at)`,
    )
    .run(user);

  return user;
}

/** Compte de démonstration, utilisé quand aucun fournisseur n'est configuré. */
export function demoUser(): User {
  const existing = db()
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get("demo@cliedd.app") as User | undefined;

  if (existing) return existing;

  const user: User = {
    id: uid("usr"),
    email: "demo@cliedd.app",
    google_id: null,
    name: "Compte de démonstration",
    avatar_url: null,
    created_at: now(),
  };

  db()
    .prepare(
      `INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
       VALUES (@id, @email, @google_id, @name, @avatar_url, @created_at)`,
    )
    .run(user);

  return user;
}

/* --------------------------- Connexion X (publication) -------------------- */

export function xConnection(userId: string): XConnection | null {
  return (
    (db()
      .prepare(`SELECT * FROM x_connections WHERE user_id = ?`)
      .get(userId) as XConnection | undefined) ?? null
  );
}

export function linkXAccount(
  userId: string,
  profile: {
    xUserId: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  },
) {
  db()
    .prepare(
      `INSERT INTO x_connections (user_id, x_user_id, handle, name, avatar_url,
        access_token, refresh_token, token_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         x_user_id = excluded.x_user_id, handle = excluded.handle,
         name = excluded.name, avatar_url = excluded.avatar_url,
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         token_expires_at = excluded.token_expires_at`,
    )
    .run(
      userId,
      profile.xUserId,
      profile.handle,
      profile.name,
      profile.avatarUrl,
      profile.accessToken,
      profile.refreshToken,
      profile.expiresAt,
      now(),
    );
}

export function unlinkXAccount(userId: string) {
  db().prepare(`DELETE FROM x_connections WHERE user_id = ?`).run(userId);
}

/* ------------------------------ Espace de travail ------------------------- */

export function workspaceFor(user: User): Workspace {
  const existing = db()
    .prepare(`SELECT * FROM workspaces WHERE user_id = ? LIMIT 1`)
    .get(user.id) as Workspace | undefined;

  if (existing) return ensureCreditCycle(existing);

  const starter = plan("starter");
  const workspace: Workspace = {
    id: uid("wsp"),
    user_id: user.id,
    name: `Espace de ${user.name}`,
    plan: "starter",
    credits_remaining: starter.trialCredits,
    credits_reset_at: now() + 30 * 24 * 60 * 60 * 1000,
    trial_ends_at: now() + starter.trialDays * 24 * 60 * 60 * 1000,
    framework: "AIDA",
    custom_prompt: null,
    product_context: null,
    timezone: "Europe/Paris",
    created_at: now(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    billing_interval: null,
    current_period_end: null,
    cancel_at_period_end: 0,
  };

  db()
    .prepare(
      `INSERT INTO workspaces (id, user_id, name, plan, credits_remaining, credits_reset_at,
        trial_ends_at, framework, custom_prompt, product_context, timezone, created_at,
        stripe_customer_id, stripe_subscription_id, subscription_status, billing_interval,
        current_period_end, cancel_at_period_end)
       VALUES (@id, @user_id, @name, @plan, @credits_remaining, @credits_reset_at,
        @trial_ends_at, @framework, @custom_prompt, @product_context, @timezone, @created_at,
        @stripe_customer_id, @stripe_subscription_id, @subscription_status, @billing_interval,
        @current_period_end, @cancel_at_period_end)`,
    )
    .run(workspace);

  return workspace;
}

/** Contexte exigé par les pages et routes protégées. */
export async function requireSession() {
  const user = await currentUser();
  if (!user) return null;
  return { user, workspace: workspaceFor(user), x: xConnection(user.id) };
}
