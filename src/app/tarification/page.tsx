import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ButtonLink } from "@/components/ui/button";
import { PricingPlans } from "@/components/pricing-plans";
import { CompareTable } from "@/components/compare-table";
import { FaqAccordion } from "@/components/faq-accordion";
import { ArrowRight } from "@/components/ui/icons";
import { pricingPage, pricingFaq } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tarification",
  description: pricingPage.subtitle,
};

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden="true" />
        <div className="grid-lines absolute inset-0" aria-hidden="true" />

        <Container className="relative z-10 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <SectionHeading
            eyebrow={<Eyebrow>{pricingPage.eyebrow}</Eyebrow>}
            title={
              <>
                Publiez davantage. <span className="text-gradient">Rémunérez au résultat.</span>
              </>
            }
            subtitle={pricingPage.subtitle}
            className="mx-auto"
          />

          <div className="mt-14">
            <PricingPlans />
          </div>
        </Container>
      </section>

      <Section className="border-t border-[var(--line)] bg-ink-900">
        <Container>
          <SectionHeading title={pricingPage.compareTitle} align="left" />
          <CompareTable />
        </Container>
      </Section>

      <Section className="border-t border-[var(--line)]">
        <Container className="max-w-3xl">
          <SectionHeading title="FAQ" className="mx-auto" />
          <FaqAccordion items={pricingFaq} defaultOpen={null} className="mt-12" />
        </Container>
      </Section>

      <Section className="border-t border-[var(--line)] bg-ink-900">
        <Container className="max-w-4xl">
          <div className="relative overflow-hidden rounded-4xl border border-[var(--line-strong)]
            bg-ink-850 p-9 text-center sm:p-14">
            <div className="aurora opacity-60" aria-hidden="true" />
            <div className="relative z-10 flex flex-col items-center gap-5">
              <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">
                Prêt à <span className="text-gradient">automatiser X</span> ?
              </h2>
              <p className="max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
                {pricingPage.finalCta.body}
              </p>
              <ButtonLink href={pricingPage.finalCta.cta.href} size="lg" className="mt-2">
                {pricingPage.finalCta.cta.label}
                <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-[var(--line)] bg-ink-900/60 p-6">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
              {pricingPage.billingTerms.title}
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
              {pricingPage.billingTerms.body}
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
