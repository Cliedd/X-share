import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";
import { AppShell, PageHeading, Card, EmptyState } from "@/components/app/shell";
import { ActionForm, SubmitButton } from "@/components/app/action-button";
import { DraftCard } from "@/components/app/draft-card";
import { listDrafts, pendingItems } from "@/server/queries";
import { generateDrafts } from "@/server/actions";
import { formatDateTime } from "@/lib/format";

export default async function DraftsPage() {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  const { user, workspace } = context;

  const [inbox, drafts] = await Promise.all([
    pendingItems(workspace.id),
    listDrafts(workspace.id, ["draft", "approved", "failed"]),
  ]);

  return (
    <AppShell user={user} workspace={workspace} current="/app/brouillons">
      <PageHeading
        title="Brouillons"
        subtitle={`Des brouillons rédigés par l'IA dans votre style (${workspace.framework}). Réviser, réécrire ou approuver en un clic.`}
      />

      {inbox.length > 0 ? (
        <Card className="mb-6">
          <h2 className="mb-4 font-display text-[15px] font-semibold">
            Entrées à transformer ({inbox.length})
          </h2>
          <ul className="flex flex-col gap-2.5">
            {inbox.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--line)]
                  bg-ink-850 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[10.5px] text-faint">
                    {item.connector_title} · {formatDateTime(item.published_at ?? item.created_at)}
                  </span>
                  <p className="mt-1 line-clamp-2 text-[14px] leading-snug">{item.title}</p>
                </div>
                <ActionForm action={generateDrafts} className="shrink-0">
                  <input type="hidden" name="item_id" value={item.id} />
                  <SubmitButton>Rédiger 3 variantes</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {drafts.length === 0 ? (
        <EmptyState
          title="Aucun brouillon"
          body="Connectez une source, récupérez ses entrées, puis demandez à l'IA d'en rédiger des variantes."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
