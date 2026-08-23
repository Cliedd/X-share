import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Habillage marketing. La console (/app) a son propre layout, sans ce chrome. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="pt-16 sm:pt-[72px]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
