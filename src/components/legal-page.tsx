import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

export type LegalSection = { heading: string; paragraphs: readonly string[] };

/** Gabarit partagé par les pages Termes et Confidentialité. */
export function LegalPage({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro: string;
  sections: readonly LegalSection[];
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="aurora" aria-hidden="true" />
        <Container className="relative z-10 py-16 sm:py-20">
          <div className="flex max-w-2xl flex-col gap-5">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-[2rem] leading-[1.12] font-semibold sm:text-[2.75rem]">{title}</h1>
            <p className="text-[15px] leading-relaxed text-muted sm:text-base">{intro}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              Dernière mise à jour : {updatedAt}
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Sommaire */}
          <nav aria-label="Sommaire" className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
              Sommaire
            </p>
            <ol className="mt-4 flex flex-col gap-2.5">
              {sections.map((section, index) => (
                <li key={section.heading}>
                  <a
                    href={`#section-${index + 1}`}
                    className="flex gap-2.5 text-[13.5px] text-muted transition-colors hover:text-amber-300"
                  >
                    <span className="font-mono text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-2xl flex-col gap-10">
            {sections.map((section, index) => (
              <section key={section.heading} id={`section-${index + 1}`} className="scroll-mt-28">
                <h2 className="flex items-baseline gap-3 text-xl font-semibold sm:text-[1.35rem]">
                  <span className="text-gradient font-mono text-sm">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-[15px] leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
