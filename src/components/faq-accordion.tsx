"use client";

import { useId, useState } from "react";
import { Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({
  items,
  defaultOpen = 0,
  className,
}: {
  items: readonly FaqItem[];
  /** Index ouvert au chargement ; `null` pour tout replier. */
  defaultOpen?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div
            key={item.q}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors duration-200",
              isOpen
                ? "border-amber-400/30 bg-ink-850"
                : "border-[var(--line)] bg-ink-900/60 hover:border-[var(--line-strong)]",
            )}
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left
                  sm:px-6"
              >
                <span
                  className={cn(
                    "font-display text-[15px] font-medium transition-colors sm:text-base",
                    isOpen ? "text-cloud" : "text-cloud/85",
                  )}
                >
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border transition-all",
                    "duration-300",
                    isOpen
                      ? "rotate-45 border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-[var(--line-strong)] text-muted",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted sm:px-6 sm:pb-6">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
