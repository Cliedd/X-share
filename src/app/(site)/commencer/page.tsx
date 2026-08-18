import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ButtonLink } from "@/components/ui/button";
import { GoogleLogo, ShieldCheck } from "@/components/ui/icons";
import { getStarted } from "@/lib/content";
import { currentUser } from "@/server/auth";
import { googleConfig } from "@/server/google-oauth";

export const metadata: Metadata = {
  title: "Commencer",
  description: getStarted.subtitle,
};

const ERREURS: Record<string, string> = {
  refus: "Connexion refusée. Vous pouvez réessayer quand vous voulez.",
  parametres: "Réponse incomplète du fournisseur. Merci de réessayer.",
  etat: "Session d'autorisation expirée. Relancez la connexion.",
  echange: "L'échange de jeton a échoué. Merci de réessayer.",
};

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; offre?: string; cycle?: string }>;
}) {
  const params = await searchParams;

  // Déjà connecté : on file droit à la console, ou au paiement si une offre
  // avait été choisie avant la connexion.
  const user = await currentUser();
  if (user) {
    redirect(
      params.offre
        ? `/api/stripe/checkout?offre=${params.offre}&cycle=${params.cycle ?? "month"}`
        : "/app",
    );
  }

  const google = googleConfig().configured;
  const loginHref = google ? "/api/auth/google/login" : "/api/auth/demo";
  const erreur = params.erreur ? ERREURS[params.erreur] : null;

  return (
    <section className="relative flex min-h-[calc(100dvh-72px)] items-center overflow-hidden py-16">
      <div className="aurora" aria-hidden="true" />
      <div className="grid-lines absolute inset-0" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <Eyebrow>{getStarted.eyebrow}</Eyebrow>

          <h1 className="mt-7 text-[2rem] leading-[1.12] font-semibold sm:text-[2.75rem]">
            Créez votre compte.
            <br />
            <span className="text-gradient">Ouvrez votre console de publication.</span>
          </h1>

          <p className="mt-6 text-[15px] leading-relaxed text-muted sm:text-base">
            Connectez-vous avec Google pour créer votre espace de travail. Vous relierez votre
            compte X ensuite : CLIEDD ne publie que les messages que vous approuvez ou
            programmez.
          </p>

          {params.offre ? (
            <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 text-[13px] text-amber-300">
              Votre offre est réservée — le paiement reprend juste après la connexion.
            </p>
          ) : null}

          {erreur ? (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-coral-400/30 bg-coral-400/8 px-4 py-2.5 text-[13px] text-coral-300"
            >
              {erreur}
            </p>
          ) : null}

          <div className="relative mt-10 w-full">
            <div className="bg-brand absolute -inset-px rounded-4xl opacity-30 blur-xl" aria-hidden="true" />
            <div
              className="hairline-top relative flex flex-col gap-4 rounded-4xl border
                border-[var(--line-strong)] bg-ink-850 p-7 sm:p-9"
            >
              <ButtonLink href={loginHref} size="lg" className="w-full">
                <GoogleLogo className="size-4" />
                {google ? "Continuer avec Google" : "Entrer en démonstration"}
              </ButtonLink>

              {!google ? (
                <p className="text-[12.5px] leading-relaxed text-faint">
                  Google n&apos;est pas configuré sur cette instance. La démonstration ouvre un
                  espace de travail complet, sans compte.
                </p>
              ) : null}

              <ButtonLink href="/tarification" variant="secondary" size="lg" className="w-full">
                Consulter les tarifs
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
