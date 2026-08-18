import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/content";

/** Logotype : monogramme en dégradé + nom, le point final étant l'accent de marque. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${site.name} — accueil`}
    >
      <span
        className="bg-brand grid size-8 place-items-center rounded-lg font-display text-[15px]
          font-bold text-ink-950 transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        L
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight">
        {site.name}
        <span className="text-gradient">.</span>
      </span>
    </Link>
  );
}
