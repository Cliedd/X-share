import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Console", robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSession();
  if (!context) redirect("/commencer");
  return <>{children}</>;
}
