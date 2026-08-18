import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ButtonLink } from "@/components/ui/button";
import { XLogo, ShieldCheck } from "@/components/ui/icons";
import { getStarted } from "@/lib/content";

export const metadata: Metadata = {
  title: "Commencer",
  description: getStarted.subtitle,
};

export default function GetStartedPage() {
  return (
    <section className="relative flex min-h-[calc(100dvh-72px)] items-center overflow-hidden py-16">
      <div className="aurora" aria-hidden="true" />
      <div className="grid-lines absolute inset-0" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <Eyebrow>{getStarted.eyebrow}</Eyebrow>

          <h1 className="mt-7 text-[2rem] leading-[1.12] font-semibold sm:text-[2.75rem]">
            {getStarted.title}
            <br />
            <span className="text-gradient">{getStarted.titleAccent}</span>
          </h1>

          <p className="mt-6 text-[15px] leading-relaxed text-muted sm:text-base">
            {getStarted.subtitle}
          </p>

          {/* Carte de connexion */}
          <div className="relative mt-10 w-full">
            <div className="bg-brand absolute -inset-px rounded-4xl opacity-30 blur-xl" aria-hidden="true" />
            <div
              className="hairline-top relative flex flex-col gap-4 rounded-4xl border
                border-[var(--line-strong)] bg-ink-850 p-7 sm:p-9"
            >
              <ButtonLink href="/commencer" size="lg" className="w-full">
                <XLogo className="size-4" />
                {getStarted.primaryCta}
              </ButtonLink>

              <ButtonLink href={getStarted.secondaryCta.href} variant="secondary" size="lg" className="w-full">
                {getStarted.secondaryCta.label}
              </ButtonLink>

              <p className="flex items-start gap-2 pt-2 text-left text-[12.5px] leading-relaxed text-faint">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-aqua-400" />
                <span>
                  {getStarted.legalPrefix}
                  <Link href="/termes" className="text-muted underline decoration-dotted underline-offset-2 hover:text-amber-300">
                    {getStarted.legalTerms}
                  </Link>
                  {getStarted.legalMiddle}
                  <Link href="/confidentialite" className="text-muted underline decoration-dotted underline-offset-2 hover:text-amber-300">
                    {getStarted.legalPrivacy}
                  </Link>
                  {getStarted.legalSuffix}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
