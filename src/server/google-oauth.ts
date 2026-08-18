import { db, now } from "./db";

/**
 * OAuth 2.0 Google (Authorization Code + PKCE).
 * Google fournit l'identité du compte ; la publication passe par une
 * connexion X distincte, reliée ensuite depuis les paramètres.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPES = ["openid", "email", "profile"];

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri, configured: Boolean(clientId && clientSecret) };
}

function base64url(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(bytes).toString("base64url");
}

export async function beginGoogleAuthorization() {
  const { clientId, redirectUri } = googleConfig();
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));

  db()
    .prepare(
      `INSERT INTO oauth_states (state, provider, code_verifier, created_at) VALUES (?, 'google', ?, ?)`,
    )
    .run(state, verifier, now());

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId ?? "",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: base64url(digest),
    code_challenge_method: "S256",
    // `consent` garantit un refresh_token au premier passage ;
    // `select_account` évite de reconnecter silencieusement le même compte.
    access_type: "offline",
    prompt: "select_account",
  });

  return `${AUTHORIZE_URL}?${params}`;
}

export async function exchangeGoogleCode(code: string, verifier: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId ?? "",
      client_secret: clientSecret ?? "",
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Échec de l'échange de jeton Google (${response.status})`);
  }

  return (await response.json()) as { access_token: string; id_token?: string };
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Profil Google illisible (${response.status})`);

  const body = (await response.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    googleId: body.sub,
    email: body.email ?? null,
    name: body.name ?? body.email ?? "Utilisateur",
    avatarUrl: body.picture ?? null,
  };
}
