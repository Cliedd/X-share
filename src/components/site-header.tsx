"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { Menu, Close } from "@/components/ui/icons";
import { nav } from "@/lib/content";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Le menu mobile ne doit pas survivre à une navigation.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Verrouille le défilement de la page tant que le panneau mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-[var(--line)] bg-ink-950/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 sm:h-[72px]">
          <Wordmark />

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors
                  hover:bg-ink-850 hover:text-cloud"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ButtonLink href="/commencer" className="hidden sm:inline-flex">
              Commencer
            </ButtonLink>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="grid size-10 place-items-center rounded-full border border-[var(--line)]
                text-muted transition-colors hover:text-cloud md:hidden"
            >
              {open ? <Close className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </Container>

      {/* Panneau mobile */}
      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-[var(--line)] bg-ink-950/95 backdrop-blur-xl md:hidden"
      >
        <Container className="flex flex-col gap-1 py-5">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl px-3 py-3 text-[15px] text-muted transition-colors
                hover:bg-ink-850 hover:text-cloud"
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/commencer" size="lg" className="mt-3 w-full">
            Commencer
          </ButtonLink>
        </Container>
      </div>
    </header>
  );
}
