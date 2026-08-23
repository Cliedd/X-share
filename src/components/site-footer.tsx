import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/wordmark";
import { footer, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line)] bg-ink-900">
      {/* Filet dégradé qui souligne la séparation avec le contenu */}
      <div
        className="bg-brand absolute inset-x-0 top-0 h-px opacity-40"
        aria-hidden="true"
      />
      <Container className="py-14 sm:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{footer.blurb}</p>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            <nav aria-label="Liens de pied de page" className="flex flex-col gap-3">
              {footer.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-cloud"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
                Contact
              </span>
              <a
                href={`mailto:${footer.email}`}
                className="text-sm text-muted transition-colors hover:text-amber-300"
              >
                {footer.email}
              </a>
            </div>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t border-[var(--line)] pt-7
            sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[13px] text-faint">{footer.copyright}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            {site.tagline}
          </p>
        </div>
      </Container>
    </footer>
  );
}
