import { z } from "zod";
import type { Framework, SourceItem, Workspace } from "./types";

/**
 * Rédaction des brouillons X à partir d'une entrée de flux.
 *
 * Utilise DeepSeek Chat (API compatible OpenAI) si DEEPSEEK_API_KEY est définie,
 * sinon bascule sur un repli local sans appel réseau.
 */

const MODEL = "deepseek-chat";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const DraftSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string(),
      angle: z.string(),
    }),
  ),
});

export type GeneratedVariant = { text: string; angle: string };

const FRAMEWORKS: Record<Exclude<Framework, "custom">, string> = {
  AIDA:
    "Structure AIDA : une accroche qui capte l'attention, puis l'intérêt par le problème résolu, " +
    "puis le désir par le bénéfice concret, et une action claire pour finir.",
  PAS:
    "Structure PAS : nommer le problème vécu par l'utilisateur, en remuer les conséquences " +
    "concrètes, puis présenter la mise à jour comme la solution.",
};

function systemPrompt(workspace: Workspace) {
  const framework =
    workspace.framework === "custom"
      ? (workspace.custom_prompt?.trim() ??
        "Adoptez un ton direct et informatif, sans jargon marketing.")
      : FRAMEWORKS[workspace.framework];

  return [
    "Vous rédigez les publications X d'un éditeur de logiciel SaaS.",
    "Vous transformez une mise à jour produit en publications prêtes à diffuser.",
    "",
    "Règles absolues :",
    "- 280 caractères maximum par publication, sans exception.",
    "- Écrire en français, à la voix active, sans superlatif creux.",
    "- Pas de hashtag décoratif ; au plus un, et seulement s'il apporte quelque chose.",
    "- Pas d'emoji en ouverture de publication.",
    "- Ne jamais inventer de chiffre, de date ou de fonctionnalité absents de la source.",
    "- Ne pas mettre la publication entre guillemets.",
    "",
    `Cadre rédactionnel demandé : ${framework}`,
    workspace.product_context
      ? `\nContexte produit fourni par l'équipe :\n${workspace.product_context}`
      : "",
    "",
    "Répondez UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :",
    '{"variants":[{"text":"...","angle":"..."},{"text":"...","angle":"..."},{"text":"...","angle":"..."}]}',
  ]
    .join("\n")
    .trim();
}

function userPrompt(item: SourceItem) {
  return [
    "Voici la mise à jour à transformer en publications X.",
    "",
    `Titre : ${item.title}`,
    item.url ? `Lien : ${item.url}` : "Lien : aucun",
    item.summary ? `\nContenu :\n${item.summary.slice(0, 4000)}` : "",
    "",
    "Proposez trois variantes qui diffèrent réellement d'angle — pas trois reformulations.",
    item.url
      ? "Une seule des trois variantes peut inclure le lien ; les autres s'en passent."
      : "",
  ]
    .join("\n")
    .trim();
}

export function aiConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/**
 * Repli utilisé quand aucune clé IA n'est configurée : l'application
 * reste utilisable de bout en bout, avec des brouillons dérivés de la source.
 */
function fallbackVariants(item: SourceItem): GeneratedVariant[] {
  const title = item.title.slice(0, 180);
  const summary = (item.summary ?? "").slice(0, 150);

  return [
    { text: `${title}\n\nC'est en ligne.`, angle: "Annonce directe" },
    {
      text: summary ? `${title} — ${summary}` : `${title}\n\nDétails dans la note de version.`,
      angle: "Bénéfice détaillé",
    },
    {
      text: item.url ? `${title}\n\n${item.url}` : `${title}\n\nDisponible dès maintenant.`,
      angle: "Renvoi vers la source",
    },
  ].map((variant) => ({ ...variant, text: variant.text.slice(0, 280) }));
}

export async function generateVariants(
  workspace: Workspace,
  item: SourceItem,
): Promise<{ variants: GeneratedVariant[]; simulated: boolean }> {
  if (!aiConfigured()) {
    return { variants: fallbackVariants(item), simulated: true };
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt(workspace) },
        { role: "user", content: userPrompt(item) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    console.error("DeepSeek API error:", response.status, await response.text());
    return { variants: fallbackVariants(item), simulated: true };
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content ?? "";

  let parsed: { variants?: Array<{ text: string; angle: string }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    console.error("DeepSeek JSON parse error:", content);
    return { variants: fallbackVariants(item), simulated: true };
  }

  const result = DraftSchema.safeParse(parsed);
  if (!result.success || result.data.variants.length === 0) {
    return { variants: fallbackVariants(item), simulated: true };
  }

  const variants = result.data.variants
    .map((v) => ({ text: v.text.trim().slice(0, 280), angle: v.angle }))
    .filter((v) => v.text.length > 0);

  return variants.length > 0
    ? { variants, simulated: false }
    : { variants: fallbackVariants(item), simulated: true };
}

/**
 * Coach IA : suggère le créneau le plus pertinent de la semaine à partir de
 * l'engagement observé sur les publications déjà diffusées.
 */
export function suggestSlot(
  history: Array<{ published_at: number | null; impressions: number; likes: number }>,
) {
  const DEFAULTS = [
    { day: 1, hour: 11, minute: 30 },
    { day: 2, hour: 9, minute: 15 },
    { day: 3, hour: 14, minute: 0 },
  ];

  const scored = new Map<string, { score: number; count: number }>();

  for (const post of history) {
    if (!post.published_at) continue;
    const date = new Date(post.published_at);
    const key = `${date.getDay()}-${date.getHours()}`;
    const entry = scored.get(key) ?? { score: 0, count: 0 };
    entry.score += post.impressions + post.likes * 12;
    entry.count += 1;
    scored.set(key, entry);
  }

  if (scored.size < 3) return DEFAULTS[0];

  const best = [...scored.entries()]
    .map(([key, value]) => {
      const [day, hour] = key.split("-").map(Number);
      return { day, hour, average: value.score / value.count };
    })
    .sort((a, b) => b.average - a.average)[0];

  return { day: best.day, hour: best.hour, minute: 0 };
}
