import Link from "next/link";
import { requireSession } from "@/server/auth";
import { redirect } from "next/navigation";
import { AppShell, PageHeading, Card, EmptyState } from "@/components/app/shell";
import { overview, listDrafts, pendingItems } from "@/server/queries";
import { plan } from "@/server/plans";
import { aiConfigured } from "@/server/ai";
import { xConfig } from "@/server/x-oauth";
import { XLogo } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const [stats, allQueue, allInbox] = await Promise.all([
    overview(workspace),
    listDrafts(workspace.id, ["scheduled"]),
    pendingItems(workspace.id),
  ]);
  const queue = allQueue.slice(0, 5);
  const inbox = allInbox.slice(0, 5);
  const settings = plan(workspace.plan);

  const tiles = [
    { label: "Sources actives", value: stats.activeSources, href: "/app/sources" },
    { label: "Brouillons en attente", value: stats.drafts, href: "/app/brouillons" },
    { label: "Programmés", value: stats.scheduled, href: "/app/planificateur" },
    { label: "Publiés", value: stats.published, href: "/app/analyses" },
  ];

  return (
    <AppShell user={user} workspace={workspace} current="/app">
      <PageHeading
        title={`Bonjour, ${user.name.split(" ")[0]}`}
        subtitle={`Offre ${settings.name} · ${workspace.credits_remaining} crédits restants · actualisation des analyses toutes les ${settings.analyticsRefreshHours} h`}
      />

      {/* Bandeaux de configuration : n'apparaissent que si un service manque. */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Card de connexion X — visible uniquement si le compte n'est pas relié */}
        {!context.x ? (
          xConfig().configured ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/40
              bg-amber-400/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <XLogo className="size-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-[14px] font-semibold text-amber-300">
                    Connecter mon compte X
                  </p>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    Reliez votre compte X pour publier vos posts directement depuis CLIEDD.
                  </p>
                </div>
              </div>
              <ButtonLink href="/api/auth/x/login" className="shrink-0">
                Connecter X
              </ButtonLink>
            </div>
          ) : (
            <Banner
              tone="amber"
              text="Aucun identifiant X configuré : les publications sont simulées et enregistrées, sans être diffusées. Renseignez X_CLIENT_ID et X_CLIENT_SECRET pour publier réellement."
            />
          )
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-aqua-400/30
            bg-aqua-400/8 px-5 py-3.5">
            <XLogo className="size-4 shrink-0 text-aqua-400" />
            <p className="text-[13.5px]">
              Compte X relié :{" "}
              <strong className="text-aqua-300">@{context.x.handle}</strong>
            </p>
            <span className="ml-auto rounded-full bg-aqua-500/20 px-2.5 py-0.5 text-[11px]
              font-mono font-semibold tracking-wide text-aqua-300">
              Connecté
            </span>
          </div>
        )}

        {!aiConfigured() ? (
          <Banner
            tone="violet"
            text="Aucune clé Anthropic détectée : les brouillons sont dérivés localement de la source. Renseignez ANTHROPIC_API_KEY pour activer la rédaction par l'IA."
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="hairline-top rounded-2xl border border-[var(--line)] bg-ink-900 p-5
              transition-colors hover:border-[var(--line-strong)] hover:bg-ink-850"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              {tile.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold">{tile.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Prochaines publications" href="/app/planificateur" />
          {queue.length === 0 ? (
            <EmptyState
              title="File d'attente vide"
              body="Approuvez un brouillon puis déposez-le dans le planificateur pour alimenter la semaine."
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {queue.map((draft) => (
                <li
                  key={draft.id}
                  className="rounded-xl border border-[var(--line)] bg-ink-850 p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-amber-300">
                      {formatDateTime(draft.scheduled_at)}
                    </span>
                    <span className="font-mono text-[10.5px] text-faint">
                      {draft.credit_cost} cr.
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug text-muted">
                    {draft.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle title="Entrées à traiter" href="/app/brouillons" />
          {inbox.length === 0 ? (
            <EmptyState
              title="Rien de neuf"
              body="Les nouvelles entrées de vos flux RSS apparaîtront ici, prêtes à devenir des brouillons."
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {inbox.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[var(--line)] bg-ink-850 p-3.5"
                >
                  <span className="font-mono text-[10.5px] text-faint">{item.connector_title}</span>
                  <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug">{item.title}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {stats.failed > 0 ? (
        <div className="mt-5">
          <Banner
            tone="coral"
            text={`${stats.failed} publication(s) en échec. Les crédits correspondants ont été remboursés — ouvrez les brouillons pour corriger et reprogrammer.`}
          />
        </div>
      ) : null}
    </AppShell>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-[15px] font-semibold">{title}</h2>
      <Link href={href} className="text-[12.5px] text-muted transition-colors hover:text-amber-300">
        Tout voir →
      </Link>
    </div>
  );
}

function Banner({ tone, text }: { tone: "amber" | "violet" | "coral"; text: string }) {
  const tones = {
    amber: "border-amber-400/30 bg-amber-400/8 text-amber-300",
    violet: "border-violet-400/30 bg-violet-500/8 text-violet-400",
    coral: "border-coral-400/30 bg-coral-400/8 text-coral-300",
  } as const;

  return (
    <p className={cn("rounded-xl border px-4 py-3 text-[13px] leading-relaxed", tones[tone])}>
      {text}
    </p>
  );
}

