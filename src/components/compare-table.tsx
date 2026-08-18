import { Check } from "@/components/ui/icons";
import { compareRows, pricingPage } from "@/lib/content";
import { cn } from "@/lib/utils";

const columns = ["Démarreur", "Pro", "Élite"] as const;

/** Rend « Oui » sous forme de pastille, « — » en atténué, le reste en texte simple. */
function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === "Oui") {
    return (
      <span
        className="inline-grid size-6 place-items-center rounded-full bg-aqua-400/15 text-aqua-400"
        title="Inclus"
      >
        <Check className="size-3.5" />
        <span className="sr-only">Oui</span>
      </span>
    );
  }

  if (value === "—") {
    return (
      <span className="text-faint" title="Non inclus">
        —<span className="sr-only">Non inclus</span>
      </span>
    );
  }

  return (
    <span className={cn("text-[13.5px]", highlight ? "font-medium text-amber-300" : "text-muted")}>
      {value}
    </span>
  );
}

export function CompareTable() {
  return (
    <div className="mt-10">
      <p className="mb-3 font-mono text-[11px] text-faint lg:hidden">{pricingPage.compareHint}</p>

      <div className="overflow-x-auto rounded-3xl border border-[var(--line)] bg-ink-850">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <caption className="sr-only">
            Comparaison des fonctionnalités entre les offres Démarreur, Pro et Élite
          </caption>
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th
                scope="col"
                className="px-5 py-4 font-mono text-[10.5px] font-medium uppercase
                  tracking-[0.14em] text-faint sm:px-6"
              >
                Fonctionnalité
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    "px-5 py-4 text-center font-display text-sm font-semibold sm:px-6",
                    column === "Pro" ? "text-amber-300" : "text-cloud",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row, index) => (
              <tr
                key={row.feature}
                className={cn(
                  "border-b border-[var(--line)] last:border-0 transition-colors",
                  index % 2 === 1 && "bg-ink-900/40",
                  "hover:bg-ink-800/50",
                )}
              >
                <th
                  scope="row"
                  className="px-5 py-4 text-[13.5px] font-normal text-cloud/85 sm:px-6"
                >
                  {row.feature}
                </th>
                <td className="px-5 py-4 text-center sm:px-6">
                  <Cell value={row.starter} />
                </td>
                <td className="px-5 py-4 text-center sm:px-6">
                  <Cell value={row.pro} highlight />
                </td>
                <td className="px-5 py-4 text-center sm:px-6">
                  <Cell value={row.elite} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
