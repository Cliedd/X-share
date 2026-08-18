import { one, run, now } from "./db";

/**
 * OAuth 2.0 X avec PKCE.
 * Sans identifiants configurés, l'application bascule en mode démonstration :
 * la connexion crée un compte local et la publication est simulée, ce qui
 * permet de faire tourner tout le produit sans compte développeur X.
 */

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export function xConfig() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri =
    process.env.X_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/x/callback`;

  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret) };
}

function base64url(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(bytes).toString("base64url");
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

export async function beginAuthorization() {
  const { clientId, redirectUri } = xConfig();
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));

  await run(
    `INSERT INTO oauth_states (state, provider, code_verifier, created_at) VALUES (?, 'x', ?, ?)`,
    [state, verifier, now()],
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId ?? "",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
  });

  return `${AUTHORIZE_URL}?${params}`;
}

/** Consomme un état d'autorisation : à usage unique, et lié à son fournisseur. */
export async function consumeState(state: string, provider: "x" | "google" = "x") {
  // La suppression par RETURNING rend la consommation atomique : un même
  // état ne peut pas être utilisé deux fois.
  const row = await one<{ code_verifier: string }>(
    `DELETE FROM oauth_states WHERE state = ? AND provider = ? RETURNING code_verifier`,
    [state, provider],
  );
  return row?.code_verifier ?? null;
}

export async function exchangeCode(code: string, verifier: string) {
  const { clientId, clientSecret, redirectUri } = xConfig();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Échec de l'échange de jeton X (${response.status})`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export async function fetchXProfile(accessToken: string) {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Profil X illisible (${response.status})`);

  const body = (await response.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  return {
    xUserId: body.data.id,
    handle: body.data.username,
    name: body.data.name,
    avatarUrl: body.data.profile_image_url ?? null,
  };
}
