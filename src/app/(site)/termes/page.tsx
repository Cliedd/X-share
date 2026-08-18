import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { terms } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termes",
  description: terms.intro,
};

export default function TermsPage() {
  return <LegalPage {...terms} />;
}
