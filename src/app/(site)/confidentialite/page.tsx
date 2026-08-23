import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacy } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: privacy.intro,
};

export default function PrivacyPage() {
  return <LegalPage {...privacy} />;
}
