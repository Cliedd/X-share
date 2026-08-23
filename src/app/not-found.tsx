import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[calc(100dvh-72px)] items-center overflow-hidden">
      <div className="aurora" aria-hidden="true" />
      <Container className="relative z-10">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
          <span className="text-gradient font-display text-6xl font-bold sm:text-7xl">404</span>
          <h1 className="text-2xl font-semibold sm:text-3xl">Cette page n&apos;est pas au planning.</h1>
          <p className="text-[15px] leading-relaxed text-muted">
            Le lien que vous avez suivi ne mène à aucune section de CLIEDD. Revenez à l&apos;accueil
            pour reprendre la boucle.
          </p>
          <ButtonLink href="/" size="lg" className="mt-2">
            Retour à l&apos;accueil
            <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
