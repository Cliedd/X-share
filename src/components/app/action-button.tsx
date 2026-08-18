"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type ActionResult = { ok?: string; error?: string } | void;

/**
 * Formulaire d'action serveur : gère l'état d'attente et affiche le retour
 * (succès ou erreur) renvoyé par l'action, sans recharger la page.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  onDone,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionResult>();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;

        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(formData);
          setFeedback(result ?? undefined);
          if (result && !("error" in result && result.error)) onDone?.();
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>

      {feedback && (feedback.ok || feedback.error) ? (
        <p
          role="status"
          className={cn(
            "mt-2 text-[12.5px]",
            feedback.error ? "text-coral-300" : "text-aqua-300",
          )}
        >
          {feedback.error ?? feedback.ok}
        </p>
      ) : null}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className,
  ...props
}: {
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-brand text-ink-950 font-semibold hover:brightness-110",
    secondary:
      "border border-[var(--line-strong)] bg-ink-850 text-cloud hover:border-amber-400/50",
    danger: "border border-coral-400/30 text-coral-300 hover:bg-coral-400/10",
  } as const;

  return (
    <button
      type="submit"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px]",
        "transition-all duration-200 disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
