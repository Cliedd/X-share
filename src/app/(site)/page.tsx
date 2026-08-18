import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ButtonLink } from "@/components/ui/button";
import { FaqAccordion } from "@/components/faq-accordion";
import { DashboardPreview } from "@/components/dashboard-preview";
import { ArrowRight, Check, ShieldCheck, Rss } from "@/components/ui/icons";
import { hero, loop, product, pricingTeaser, homeFaq } from "@/lib/content";
import { cn } from "@/lib/utils";

const stepAccents: Record<string, string> = {
  coral: "text-coral-400 border-coral-400/30 bg-coral-400/10",
  amber: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  aqua: "text-aqua-400 border-aqua-400/30 bg-aqua-400/10",
  violet: "text-violet-400 border-violet-400/30 bg-violet-400/10",
};

const badgeIcons = [ShieldCheck, Rss];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------- Héros ------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden="true" />
        <div className="grid-lines absolute inset-0" aria-hidden="true" />

        <Container className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="flex flex-col items-center text-center">
            <Eyebrow>{hero.eyebrow}</Eyebrow>

            <h1
              className="mt-7 max-w-3xl text-[2.1rem] leading-[1.08] font-semibold
                sm:text-5xl md:text-[3.5rem]"
            >
              Intégrez les mises à jour produit{" "}
              <span className="text-gradient">de manière constante</span> sur X.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              {hero.subtitle}
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <ButtonLink href={hero.primaryCta.href} size="lg" className="w-full sm:w-auto">
                {hero.primaryCta.label}
                <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink
                href={hero.secondaryCta.href}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>

            <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {hero.badges.map((badge, i) => {
                const Icon = badgeIcons[i] ?? ShieldCheck;
                return (
                  <li key={badge} className="flex items-center gap-2 text-sm text-muted">
                    <Icon className="size-4 text-aqua-400" />
                    {badge}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-16 sm:mt-20">
            <DashboardPreview />
          </div>
        </Container>
      </section>

      {/* ---------------------------- Boucle LONTSI --------------------------- */}
      <Section id="boucle" className="border-t border-[var(--line)] bg-ink-900">
        <Container>
          <SectionHeading
            eyebrow={<Eyebrow>{loop.eyebrow}</Eyebrow>}
            title={loop.title}
            className="mx-auto"
          />

          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loop.steps.map((step) => (
              <li
                key={step.number}
                className="hairline-top group relative flex flex-col gap-4 rounded-2xl border
                  border-[var(--line)] bg-ink-850 p-6 transition-colors duration-300
                  hover:border-[var(--line-strong)] hover:bg-ink-800"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border font-mono text-sm",
                    "font-medium transition-transform duration-300 group-hover:scale-105",
                    stepAccents[step.accent],
                  )}
                >
                  {step.number}
                </span>
                <h3 className="text-[17px] leading-snug font-semibold">{step.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ------------------------------- Produit ------------------------------ */}
      <Section id="caracteristiques" className="border-t border-[var(--line)]">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow={<Eyebrow>{product.eyebrow}</Eyebrow>}
                title={product.title}
                subtitle={product.subtitle}
                align="left"
              />

              <ul className="mt-9 flex flex-col gap-4">
                {product.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full
                        bg-aqua-400/15 text-aqua-400"
                    >
                      <Check className="size-3" />
                    </span>
                    <span className="text-[15px] leading-relaxed text-muted">{point}</span>
                  </li>
                ))}
              </ul>

              <ButtonLink href="/commencer" variant="secondary" className="mt-9">
                Commencez à publier
                <ArrowRight className="size-4" />
              </ButtonLink>
            </div>

            <figure className="flex flex-col gap-4">
              <DashboardPreview />
              <figcaption className="text-center text-[13px] text-faint">
                {product.caption}
              </figcaption>
            </figure>
          </div>
        </Container>
      </Section>

      {/* ----------------------------- Tarification --------------------------- */}
      <Section className="border-t border-[var(--line)] bg-ink-900">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <SectionHeading
              eyebrow={<Eyebrow>{pricingTeaser.eyebrow}</Eyebrow>}
              title={pricingTeaser.title}
              subtitle={pricingTeaser.subtitle}
              align="left"
            />

            <div className="relative">
              {/* Halo derrière la carte tarifaire */}
              <div
                className="bg-brand absolute -inset-px rounded-4xl opacity-25 blur-xl"
                aria-hidden="true"
              />
              <div
                className="hairline-top relative flex flex-col gap-6 rounded-4xl border
                  border-[var(--line-strong)] bg-ink-850 p-8 sm:p-10"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold">{pricingTeaser.planName}</h3>
                  <p className="flex items-baseline gap-1">
                    <span className="text-gradient font-display text-4xl font-bold">
                      {pricingTeaser.price}
                    </span>
                    <span className="text-sm text-faint">{pricingTeaser.period}</span>
                  </p>
                </div>

                <p className="text-[14.5px] leading-relaxed text-muted">
                  {pricingTeaser.features}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={pricingTeaser.primaryCta.href} className="flex-1">
                    {pricingTeaser.primaryCta.label}
                  </ButtonLink>
                  <ButtonLink
                    href={pricingTeaser.secondaryCta.href}
                    variant="secondary"
                    className="flex-1"
                  >
                    {pricingTeaser.secondaryCta.label}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* --------------------------------- FAQ -------------------------------- */}
      <Section id="faq" className="border-t border-[var(--line)]">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow={<Eyebrow>{homeFaq.eyebrow}</Eyebrow>}
            title={homeFaq.title}
            className="mx-auto"
          />
          <FaqAccordion items={homeFaq.items} className="mt-12" />
        </Container>
      </Section>
    </>
  );
}
