import type { PlanId } from "./types";

/**
 * Paramètres d'offre. Les cadences d'analyse et tailles d'échantillon
 * reprennent le tableau comparatif de la page tarifaire.
 */
export const PLANS = {
  starter: {
    id: "starter" as const,
    name: "Démarreur",
    monthlyCredits: 200,
    analyticsRefreshHours: 48,
    analyticsSampleSize: 30,
    priorityQueue: false,
    trialDays: 7,
    trialCredits: 25,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    monthlyCredits: 500,
    analyticsRefreshHours: 24,
    analyticsSampleSize: 40,
    priorityQueue: true,
    trialDays: 7,
    trialCredits: 25,
  },
  elite: {
    id: "elite" as const,
    name: "Élite",
    monthlyCredits: 1500,
    analyticsRefreshHours: 6,
    analyticsSampleSize: 50,
    priorityQueue: true,
    trialDays: 0,
    trialCredits: 0,
  },
} satisfies Record<PlanId, unknown>;

export function plan(id: PlanId) {
  return PLANS[id] ?? PLANS.starter;
}
