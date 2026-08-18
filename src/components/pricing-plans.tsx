"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { plans, type Plan } from "@/lib/content";
import { cn, formatPrice } from "@/lib/utils";

type Cycle = "monthly" | "annual";

export function PricingPlans() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div className="flex flex-col items-center">
      <CycleToggle cycle={cycle} onChange={setCycle} />

      <div className="mt-12 grid w-full gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} />
        ))}
      </div>
    </div>
  );
}

function CycleToggle({ cycle, onChange }: { cycle: Cycle; onChange: (c: Cycle) => void }) {
  const options: Array<{ value: Cycle; label: string }> = [
    { value: "monthly", label: "Mensuel" },
    { value: "annual", label: "Annuel" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Cycle de facturation"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--line)]
        bg-ink-850 p-1"
    >
      {options.map((option) => {
        const active = cycle === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-brand text-ink-950 shadow-[0_4px_20px_-6px_var(--color-coral-500)]"
                : "text-muted hover:text-cloud",
            )}
          >
            {option.label}
            {option.value === "annual" ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 font-mono text-[9.5px]",
                  active ? "bg-ink-950/20 text-ink-950" : "bg-aqua-400/15 text-aqua-300",
                )}
              >
                −20 %
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const annual = cycle === "annual";
  const price = annual ? plan.annual : plan.monthly;
  const period = annual ? "/ an" : "/ mois";
  const noTrial = plan.trial === "Pas de procès";

  return (
    <div className="relative">
      {plan.recommended ? (
        <div className="bg-brand absolute -inset-px rounded-4xl opacity-40 blur-lg" aria-hidden="true" />
      ) : null}

      <article
        className={cn(
          "hairline-top relative flex h-full flex-col rounded-4xl border p-7 sm:p-8",
          plan.recommended
            ? "border-amber-400/35 bg-ink-850"
            : "border-[var(--line)] bg-ink-900/70",
        )}
      >
        {plan.recommended ? (
          <span
            className="bg-brand absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5
              py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950"
          >
            {plan.featuredLabel}
          </span>
        ) : null}

        <header className="flex flex-col gap-2">
          <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
          <p className="text-[13.5px] text-muted">{plan.credits}</p>
        </header>

        <p className="mt-6 flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-[2.6rem] leading-none font-bold",
              plan.recommended ? "text-gradient" : "text-cloud",
            )}
          >
            {formatPrice(price)}
          </span>
          <span className="text-sm text-faint">{period}</span>
        </p>
        <p className="mt-2 text-[12.5px] text-faint">{plan.cancel}</p>

        <ButtonLink
          href={`/api/stripe/checkout?offre=${plan.id}&cycle=${annual ? "year" : "month"}`}
          size="lg"
          variant={plan.recommended ? "primary" : "secondary"}
          className="mt-6 w-full"
        >
          {plan.cta.label}
        </ButtonLink>

        <p
          className={cn(
            "mt-3 text-center text-[12.5px]",
            noTrial ? "text-faint" : "text-aqua-300",
          )}
        >
          {plan.trial}
        </p>

        <ul className="mt-7 flex flex-col gap-3.5 border-t border-[var(--line)] pt-7">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full
                  bg-aqua-400/15 text-aqua-400"
                aria-hidden="true"
              >
                <Check className="size-2.5" />
              </span>
              <span className="text-[14px] leading-relaxed text-muted">{feature}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
