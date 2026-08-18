import { cookies } from "next/headers";
import { one, run, uid, now } from "./db";
import { ensureSchema } from "./migrate";
import type { User, Workspace, XConnection } from "./types";
import { ensureCreditCycle } from "./credits";
import { plan } from "./plans";

const SESSION_COOKIE = "cliedd_session";
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const id = uid("ses");
  await run(`INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`, [
    id,
    userId,
    now() + SESSION_TTL,
    now(),
  ]);
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
  if (id) await run(`DELETE FROM sessions WHERE id = ?`, [id]);
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  return one<User>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [id, now()],
  );
}

/* ------------------------------- Identité -------------------------------- */

/**
 * Crée ou retrouve le compte associé à une identité Google.
 * Un compte préexistant portant la même adresse est rattaché plutôt que
 * dupliqué, pour qu'une même personne n'ait jamais deux espaces.
 */
export async function upsertGoogleUser(profile: {
  googleId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}): Promise<User> {
  await ensureSchema();

  const byGoogle = await one<User>(`SELECT * FROM users WHERE google_id = ?`, [profile.googleId]);
  if (byGoogle) {
    await run(`UPDATE users SET name = ?, avatar_url = ?, email = ? WHERE id = ?`, [
      profile.name,
      profile.avatarUrl,
      profile.email,
      byGoogle.id,
    ]);
    return { ...byGoogle, name: profile.name, avatar_url: profile.avatarUrl, email: profile.email };
  }

  const byEmail = profile.email
    ? await one<User>(`SELECT * FROM users WHERE email = ?`, [profile.email])
    : null;

  if (byEmail) {
    await run(`UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE id = ?`, [
      profile.googleId,
      profile.name,
      profile.avatarUrl,
      byEmail.id,
    ]);
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

  await run(
    `INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.email, user.google_id, user.name, user.avatar_url, user.created_at],
  );

  return user;
}

/** Compte de démonstration, utilisé quand aucun fournisseur n'est configuré. */
export async function demoUser(): Promise<User> {
  await ensureSchema();

  const existing = await one<User>(`SELECT * FROM users WHERE email = ?`, ["demo@cliedd.app"]);
  if (existing) return existing;

  const user: User = {
    id: uid("usr"),
    email: "demo@cliedd.app",
    google_id: null,
    name: "Compte de démonstration",
    avatar_url: null,
    created_at: now(),
  };

  await run(
    `INSERT INTO users (id, email, google_id, name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.email, user.google_id, user.name, user.avatar_url, user.created_at],
  );

  return user;
}

/* --------------------------- Connexion X (publication) -------------------- */

export function xConnection(userId: string) {
  return one<XConnection>(`SELECT * FROM x_connections WHERE user_id = ?`, [userId]);
}

export async function linkXAccount(
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
  await run(
    `INSERT INTO x_connections (user_id, x_user_id, handle, name, avatar_url,
      access_token, refresh_token, token_expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       x_user_id = EXCLUDED.x_user_id, handle = EXCLUDED.handle,
       name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url,
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at`,
    [
      userId,
      profile.xUserId,
      profile.handle,
      profile.name,
      profile.avatarUrl,
      profile.accessToken,
      profile.refreshToken,
      profile.expiresAt,
      now(),
    ],
  );
}

export async function unlinkXAccount(userId: string) {
  await run(`DELETE FROM x_connections WHERE user_id = ?`, [userId]);
}

/* ------------------------------ Espace de travail ------------------------- */

export async function workspaceFor(user: User): Promise<Workspace> {
  const existing = await one<Workspace>(`SELECT * FROM workspaces WHERE user_id = ? LIMIT 1`, [
    user.id,
  ]);

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

  await run(
    `INSERT INTO workspaces (id, user_id, name, plan, credits_remaining, credits_reset_at,
      trial_ends_at, framework, custom_prompt, product_context, timezone, created_at,
      stripe_customer_id, stripe_subscription_id, subscription_status, billing_interval,
      current_period_end, cancel_at_period_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      workspace.id, workspace.user_id, workspace.name, workspace.plan,
      workspace.credits_remaining, workspace.credits_reset_at, workspace.trial_ends_at,
      workspace.framework, workspace.custom_prompt, workspace.product_context,
      workspace.timezone, workspace.created_at, workspace.stripe_customer_id,
      workspace.stripe_subscription_id, workspace.subscription_status,
      workspace.billing_interval, workspace.current_period_end,
      workspace.cancel_at_period_end,
    ],
  );

  return workspace;
}

/** Contexte exigé par les pages et routes protégées. */
export async function requireSession() {
  await ensureSchema();
  const user = await currentUser();
  if (!user) return null;

  const [workspace, x] = await Promise.all([workspaceFor(user), xConnection(user.id)]);
  return { user, workspace, x };
}
