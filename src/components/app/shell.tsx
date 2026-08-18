import Link from "next/link";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { logout } from "@/server/actions";
import { ActionForm, SubmitButton } from "./action-button";
import { plan } from "@/server/plans";
import type { User, Workspace } from "@/server/types";

const NAV = [
  { href: "/app", label: "Tableau de bord" },
  { href: "/app/sources", label: "Sources" },
  { href: "/app/brouillons", label: "Brouillons" },
  { href: "/app/planificateur", label: "Planificateur" },
  { href: "/app/analyses", label: "Analyses" },
  { href: "/app/facturation", label: "Facturation" },
  { href: "/app/parametres", label: "Paramètres" },
];

export function AppShell({
  user,
  workspace,
  current,
  children,
}: {
  user: User;
  workspace: Workspace;
  current: string;
  children: React.ReactNode;
}) {
  const settings = plan(workspace.plan);
  const ratio = Math.min(1, workspace.credits_remaining / settings.monthlyCredits);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Rail latéral */}
      <aside
        className="flex shrink-0 flex-col gap-6 border-b border-[var(--line)] bg-ink-900 p-5
          lg:h-dvh lg:w-64 lg:sticky lg:top-0 lg:border-r lg:border-b-0"
      >
        <Wordmark />

        <nav aria-label="Navigation de l'application" className="flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map((item) => {
            const active = current === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors",
                  active
                    ? "bg-ink-800 font-medium text-cloud"
                    : "text-muted hover:bg-ink-850 hover:text-cloud",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          {/* Jauge de crédits */}
          <div className="rounded-2xl border border-[var(--line)] bg-ink-850 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Crédits
              </span>
              <span className="font-display text-lg font-semibold">
                {workspace.credits_remaining}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800"
              role="progressbar"
              aria-valuenow={workspace.credits_remaining}
              aria-valuemin={0}
              aria-valuemax={settings.monthlyCredits}
              aria-label="Crédits de publication restants"
            >
              <div className="bg-brand h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="mt-2 text-[11.5px] text-faint">
              Offre {settings.name} · {settings.monthlyCredits}/mois
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{user.name}</p>
              <p className="truncate font-mono text-[11px] text-faint">
                {user.email ?? "compte local"}
              </p>
            </div>
            <ActionForm action={logout}>
              <SubmitButton variant="secondary" className="h-8 px-3 text-[12px]">
                Quitter
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      </aside>

      <main id="contenu" className="min-w-0 flex-1 p-5 sm:p-8">
        {children}
      </main>
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-[14.5px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--line)] bg-ink-900 p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-ink-900/50 p-10 text-center">
      <p className="font-display text-[15px] font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
