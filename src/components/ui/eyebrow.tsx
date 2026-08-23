import { cn } from "@/lib/utils";

/** Petite étiquette de section : point lumineux + libellé en capitales espacées. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-[var(--line)]",
        "bg-ink-850/70 px-3.5 py-1.5 font-mono text-[11px] font-medium",
        "uppercase tracking-[0.18em] text-muted backdrop-blur",
        className,
      )}
    >
      <span className="bg-brand size-1.5 rounded-full" aria-hidden="true" />
      {children}
    </span>
  );
}
