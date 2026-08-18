/**
 * Source unique de vérité pour la copie du site.
 * Les pages ne contiennent que de la mise en page ; le texte vit ici.
 */

export const site = {
  name: "LONTSI",
  wordmark: "LONTSI.",
  tagline: "Publication automatique X pour SaaS",
  description:
    "Connectez vos sources, obtenez des brouillons IA dans votre style et gérez un calendrier X complet, sans avoir à rédiger de contenu quotidien.",
  email: "support@lontsi.app",
  url: "https://www.lontsi.app",
} as const;

export const nav = [
  { label: "Caractéristiques", href: "/#caracteristiques" },
  { label: "Tarification", href: "/tarification" },
  { label: "Termes", href: "/termes" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const hero = {
  eyebrow: site.tagline,
  title: "Intégrez les mises à jour produit de manière constante sur X.",
  subtitle: site.description,
  primaryCta: { label: "Commencez à publier", href: "/commencer" },
  secondaryCta: { label: "Voyez comment ça fonctionne", href: "/#boucle" },
  badges: ["Examiner avant de diffuser", "Flux RSS et journaux des modifications"],
} as const;

export const loop = {
  eyebrow: "La boucle LONTSI",
  title: "Quatre étapes. Un cycle hebdomadaire.",
  steps: [
    {
      number: "01",
      title: "Connectez vos sources",
      body: "Journal des modifications, flux RSS, blog ou notes de version — les nouvelles entrées sont automatiquement intégrées.",
      accent: "coral",
    },
    {
      number: "02",
      title: "Transformer les mises à jour en publications X",
      body: "Des brouillons rédigés par l'IA dans votre style (AIDA, PAS…). Réviser, réécrire ou approuver en un clic.",
      accent: "amber",
    },
    {
      number: "03",
      title: "Planifiez la semaine",
      body: "Déposez vos ébauches dans les emplacements libres. LONTSI suggère le meilleur moment pour publier.",
      accent: "aqua",
    },
    {
      number: "04",
      title: "Publier automatiquement sur X",
      body: "Mise en ligne selon le calendrier prévu. Mode révision ou pilotage automatique complet : à vous de choisir.",
      accent: "violet",
    },
  ],
} as const;

export const product = {
  eyebrow: "Produit",
  title: "Planifiez votre semaine. Expédiez en toute confiance.",
  subtitle:
    "Le calendrier et la file d'attente permettent d'organiser chaque mise à jour : vérifiez-la, puis publiez-la au moment opportun.",
  imageAlt:
    "Tableau de bord LONTSI avec publications programmées, file d'attente de brouillons IA et flux RSS",
  caption: "Une vue hebdomadaire pour vos flux RSS, vos brouillons et vos articles programmés.",
  points: [
    "Consultez le programme complet de la semaine en un coup d'œil.",
    "Faites glisser pour reprogrammer sans interrompre la file d'attente",
    "Rien n'est mis en ligne sans vos règles de révision",
  ],
} as const;

export const pricingTeaser = {
  eyebrow: "Tarification",
  title: "Conçu pour les fondateurs constants.",
  subtitle:
    "Sources intégrées, brouillons finalisés, calendrier X complet — sans que l'édition ne devienne un travail supplémentaire.",
  planName: "Démarreur",
  price: "9,99 $",
  period: "/mois",
  features: "Connecteurs RSS · Brouillons IA · Planification visuelle · Relecture préalable",
  primaryCta: { label: "Essayez LONTSI dès maintenant", href: "/commencer" },
  secondaryCta: { label: "Voir tous les forfaits", href: "/tarification" },
} as const;

export const homeFaq = {
  eyebrow: "FAQ",
  title: "Questions, réponses.",
  items: [
    {
      q: "Puis-je relire chaque article avant sa publication ?",
      a: "Oui. Les connecteurs peuvent envoyer des brouillons pour relecture préalable, et vous pouvez les approuver, les modifier, les programmer ou les publier manuellement avant qu'ils n'atteignent la plateforme X.",
    },
    {
      q: "Comment fonctionne la connexion RSS et journal des modifications ?",
      a: "Vous connectez un flux, choisissez les règles de révision ou de publication automatique, puis LONTSI transforme les nouvelles entrées en brouillons prêts pour la publication et les place dans votre file d'attente.",
    },
    {
      q: "L'IA peut-elle suivre AIDA, PAS ou ma propre instruction ?",
      a: "Oui. Vous pouvez utiliser des frameworks intégrés comme AIDA et PAS, ou définir votre propre invite pour que les brouillons correspondent au ton de votre produit.",
    },
    {
      q: "Que se passe-t-il si des limites d'API X s'appliquent ?",
      a: "LONTSI vous permet de garder votre file d'attente et votre planning organisés, mais la publication et l'analyse dépendent toujours des limites et des crédits disponibles sur votre compte développeur X.",
    },
  ],
} as const;

/* ----------------------------- Tarification ----------------------------- */

export type Plan = {
  id: string;
  name: string;
  credits: string;
  monthly: number;
  annual: number;
  cancel: string;
  cta: { label: string; href: string };
  trial: string;
  featuredLabel?: string;
  features: readonly string[];
  recommended?: boolean;
};

export const plans: readonly Plan[] = [
  {
    id: "starter",
    name: "Démarreur",
    credits: "200 crédits de publication par mois",
    monthly: 9.99,
    annual: 95.9,
    cancel: "Annulation possible à tout moment",
    cta: { label: "Essai gratuit", href: "/commencer" },
    trial: "Essai gratuit de 7 jours avec 25 crédits",
    features: [
      "IA post-génération",
      "Planificateur visuel et file d'attente",
      "Brouillons de connecteurs RSS",
      "Assistance par e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: "500 crédits de publication X par mois",
    monthly: 19.99,
    annual: 191.9,
    cancel: "Annulation possible à tout moment",
    cta: { label: "Essai gratuit", href: "/commencer" },
    trial: "Essai gratuit de 7 jours avec 25 crédits",
    recommended: true,
    featuredLabel: "Recommandé",
    features: [
      "Tout dans Starter",
      "Traitement prioritaire des files d'attente",
      "Commandes d'automatisation avancées",
      "Soutien prioritaire",
    ],
  },
  {
    id: "elite",
    name: "Élite",
    credits: "1500 crédits de publication X par mois",
    monthly: 99.99,
    annual: 959.9,
    cancel: "Annulation possible à tout moment",
    cta: { label: "Démarrez un abonnement payant", href: "/commencer" },
    trial: "Pas de procès",
    features: [
      "Tout en Pro",
      "Débit d'automatisation le plus élevé",
      "Opérations avancées prêtes pour l'équipe",
      "Assistance accélérée",
    ],
  },
];

export const pricingPage = {
  eyebrow: "Tarification",
  title: "Publiez davantage. Rémunérez au résultat.",
  subtitle:
    "L'abonnement mensuel X inclut des crédits de publication, des brouillons IA, un planificateur hebdomadaire et des connecteurs RSS. Les crédits ne sont consommés que lors de la publication d'un article.",
  compareTitle: "Comparer les offres",
  compareHint: "Balayez latéralement pour comparer →",
  billingTerms: {
    title: "Conditions de facturation",
    body: "Les abonnements sont renouvelés mensuellement ou annuellement, sauf annulation. Paddle se charge du traitement des paiements, des factures et des taxes.",
  },
  finalCta: {
    title: "Prêt à automatiser X ?",
    body: "Commencez par un essai gratuit de Starter ou Pro, connectez X et planifiez votre première semaine dans le planificateur hebdomadaire.",
    cta: { label: "Essai gratuit", href: "/commencer" },
  },
} as const;

export const compareRows = [
  {
    feature: "Crédits de publication mensuels",
    starter: "200",
    pro: "500",
    elite: "1 500",
  },
  {
    feature: "Procès",
    starter: "7 jours · 25 crédits",
    pro: "7 jours · 25 crédits",
    elite: "—",
  },
  {
    feature: "Planificateur hebdomadaire + Coach IA",
    starter: "Oui",
    pro: "Oui",
    elite: "Oui",
  },
  { feature: "Connecteurs RSS", starter: "Oui", pro: "Oui", elite: "Oui" },
  {
    feature: "Actualisation des analyses",
    starter: "Toutes les 48 heures",
    pro: "Toutes les 24 heures",
    elite: "Toutes les 6 heures",
  },
  {
    feature: "taille de l'échantillon analytique",
    starter: "30 messages",
    pro: "40 messages",
    elite: "50 messages",
  },
  { feature: "file d'attente prioritaire", starter: "—", pro: "Oui", elite: "Le plus haut" },
  { feature: "Soutien", starter: "E-mail", pro: "Priorité", elite: "Voie accélérée" },
] as const;

export const pricingFaq = [
  {
    q: "Quand les crédits sont-ils dépensés ?",
    a: "Uniquement lorsque la publication est réussie sur X. Les publications ayant échoué sont automatiquement annulées.",
  },
  {
    q: "Comment fonctionnent les coûts liés aux liens et aux médias ?",
    a: "Nous détectons les liens et les URL des médias dans le contenu de votre publication (et les balises multimédias optionnelles). Le texte vaut 1 crédit, l'image 2, la vidéo 4 et le lien 10, avec des tarifs combinés pour les liens et les médias.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Les abonnements sont renouvelés automatiquement jusqu'à leur annulation. Paddle gère la facturation, les taxes et le portail client.",
  },
  {
    q: "Que contient la catégorie Connecteurs ?",
    a: "Les sources RSS sont réécrites par l'IA en articles compatibles avec X. Vous pouvez choisir entre la validation par la bibliothèque et la publication automatique par connecteur.",
  },
] as const;

/* ------------------------------ Commencer ------------------------------ */

export const getStarted = {
  eyebrow: "Commencer",
  title: "Connecter X.",
  titleAccent: "Ouvrez votre console de publication.",
  subtitle:
    "Connectez-vous à X pour créer votre espace de travail. LONTSI ne publie que les messages que vous approuvez ou programmez, et vous pouvez vous déconnecter à tout moment.",
  primaryCta: "Continuez avec X",
  secondaryCta: { label: "Consulter les tarifs", href: "/tarification" },
  legalPrefix: "En continuant, vous acceptez les ",
  legalTerms: "conditions d'utilisation",
  legalMiddle: " et la ",
  legalPrivacy: "politique de confidentialité",
  legalSuffix: " de LONTSI. Les abonnements payants sont gérés par Paddle.",
} as const;

export const footer = {
  blurb: "Vos mises à jour de produits méritent d'être vues. Chaque semaine.",
  links: [
    { label: "Tarification", href: "/tarification" },
    { label: "Termes", href: "/termes" },
    { label: "Confidentialité", href: "/confidentialite" },
  ],
  email: site.email,
  copyright: `© ${new Date().getFullYear()} LONTSI. Tous droits réservés.`,
} as const;
