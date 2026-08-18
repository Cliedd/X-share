import type { User } from "./types";

/**
 * Client X API v2 réduit à ce dont CLIEDD a besoin : publier et relever les
 * métriques. Sans jeton d'accès, les appels sont simulés afin que le cycle
 * complet reste exerçable hors compte développeur X.
 */

export type PublishResult =
  | { ok: true; postId: string; simulated: boolean }
  | { ok: false; error: string; retryable: boolean };

export async function publishPost(user: User, content: string): Promise<PublishResult> {
  if (!user.access_token) {
    return { ok: true, postId: `sim_${crypto.randomUUID().slice(0, 12)}`, simulated: true };
  }

  try {
    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content }),
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 429) {
      return { ok: false, error: "Limite de débit X atteinte.", retryable: true };
    }

    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        error: `X a refusé la publication (${response.status}) : ${detail.slice(0, 200)}`,
        // Les erreurs serveur méritent une nouvelle tentative, pas les 4xx.
        retryable: response.status >= 500,
      };
    }

    const body = (await response.json()) as { data: { id: string } };
    return { ok: true, postId: body.data.id, simulated: false };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
      retryable: true,
    };
  }
}

export type Metrics = {
  impressions: number;
  likes: number;
  reposts: number;
  replies: number;
};

export async function fetchMetrics(user: User, postIds: string[]): Promise<Map<string, Metrics>> {
  const results = new Map<string, Metrics>();
  if (postIds.length === 0) return results;

  // Mode simulation : métriques dérivées de l'identifiant, donc stables
  // d'un appel à l'autre plutôt qu'aléatoires.
  if (!user.access_token) {
    for (const id of postIds) {
      const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      results.set(id, {
        impressions: 400 + (seed % 2600),
        likes: 5 + (seed % 90),
        reposts: seed % 22,
        replies: seed % 14,
      });
    }
    return results;
  }

  const response = await fetch(
    `https://api.x.com/2/tweets?ids=${postIds.join(",")}&tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${user.access_token}` }, signal: AbortSignal.timeout(20_000) },
  );

  if (!response.ok) return results;

  const body = (await response.json()) as {
    data?: Array<{
      id: string;
      public_metrics?: {
        impression_count?: number;
        like_count?: number;
        retweet_count?: number;
        reply_count?: number;
      };
    }>;
  };

  for (const post of body.data ?? []) {
    results.set(post.id, {
      impressions: post.public_metrics?.impression_count ?? 0,
      likes: post.public_metrics?.like_count ?? 0,
      reposts: post.public_metrics?.retweet_count ?? 0,
      replies: post.public_metrics?.reply_count ?? 0,
    });
  }

  return results;
}
