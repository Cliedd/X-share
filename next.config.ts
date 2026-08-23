import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sortie autonome : requise par l'image Docker (Railway, Fly, Render).
  // Vercel l'ignore et utilise son propre empaquetage.
  output: "standalone",
  // `pg` charge des modules natifs optionnels ; on le laisse hors du bundle
  // serveur pour éviter que le traçage n'échoue dessus.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
