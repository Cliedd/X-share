import { cookies } from "next/headers";
import { db, uid, now } from "./db";
import type { User, Workspace } from "./types";
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

/** Chaque utilisateur possède un espace de travail ; il est créé à la volée. */
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
  };

  db()
    .prepare(
      `INSERT INTO workspaces (id, user_id, name, plan, credits_remaining, credits_reset_at,
        trial_ends_at, framework, custom_prompt, product_context, timezone, created_at)
       VALUES (@id, @user_id, @name, @plan, @credits_remaining, @credits_reset_at,
        @trial_ends_at, @framework, @custom_prompt, @product_context, @timezone, @created_at)`,
    )
    .run(workspace);

  return workspace;
}

/** Contexte exigé par les pages et routes protégées. */
export async function requireSession() {
  const user = await currentUser();
  if (!user) return null;
  return { user, workspace: workspaceFor(user) };
}

export function upsertXUser(profile: {
  xUserId: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}): User {
  const existing = db()
    .prepare(`SELECT * FROM users WHERE x_user_id = ?`)
    .get(profile.xUserId) as User | undefined;

  if (existing) {
    db()
      .prepare(
        `UPDATE users SET handle = ?, name = ?, avatar_url = ?, access_token = ?,
          refresh_token = ?, token_expires_at = ? WHERE id = ?`,
      )
      .run(
        profile.handle,
        profile.name,
        profile.avatarUrl,
        profile.accessToken,
        profile.refreshToken,
        profile.expiresAt,
        existing.id,
      );
    return { ...existing, ...profile, id: existing.id } as User;
  }

  const user: User = {
    id: uid("usr"),
    x_user_id: profile.xUserId,
    handle: profile.handle,
    name: profile.name,
    avatar_url: profile.avatarUrl,
    access_token: profile.accessToken,
    refresh_token: profile.refreshToken,
    token_expires_at: profile.expiresAt,
    created_at: now(),
  };

  db()
    .prepare(
      `INSERT INTO users (id, x_user_id, handle, name, avatar_url, access_token,
        refresh_token, token_expires_at, created_at)
       VALUES (@id, @x_user_id, @handle, @name, @avatar_url, @access_token,
        @refresh_token, @token_expires_at, @created_at)`,
    )
    .run(user);

  return user;
}
