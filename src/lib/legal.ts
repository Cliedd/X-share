/**
 * Contenu des pages légales.
 * Rédigé à partir du fonctionnement décrit sur le site (crédits, connecteurs,
 * facturation Stripe, API X) — à faire relire par un juriste avant mise en ligne.
 */

export const terms = {
  eyebrow: "Termes",
  title: "Conditions d'utilisation",
  updatedAt: "18 août 2026",
  intro:
    "Ces conditions encadrent votre utilisation de CLIEDD, le service de publication automatique X destiné aux éditeurs de SaaS.",
  sections: [
    {
      heading: "Objet du service",
      paragraphs: [
        "CLIEDD connecte vos sources de contenu — flux RSS, journal des modifications, blog ou notes de version — transforme les nouvelles entrées en brouillons de publications, et les met en file d'attente dans un planificateur hebdomadaire pour publication sur X.",
        "Le service ne publie que les messages que vous approuvez ou programmez. Vous pouvez à tout moment repasser un connecteur en mode révision ou déconnecter votre compte X.",
      ],
    },
    {
      heading: "Compte et connexion X",
      paragraphs: [
        "La création d'un espace de travail passe par une connexion à votre compte X. Vous êtes responsable des identifiants utilisés et des publications diffusées depuis votre compte.",
        "La publication et les analyses dépendent des limites et des crédits disponibles sur votre compte développeur X. CLIEDD conserve votre file d'attente et votre planning organisés, mais ne peut pas dépasser les quotas imposés par la plateforme X.",
      ],
    },
    {
      heading: "Crédits de publication",
      paragraphs: [
        "Chaque forfait comprend un volume mensuel de crédits de publication. Les crédits ne sont consommés que lors d'une publication réussie sur X : les publications ayant échoué sont automatiquement annulées et recréditées.",
        "Le coût dépend du contenu détecté dans la publication : 1 crédit pour le texte, 2 pour une image, 4 pour une vidéo et 10 pour un lien, avec des tarifs combinés lorsque plusieurs éléments sont présents.",
      ],
    },
    {
      heading: "Abonnements et facturation",
      paragraphs: [
        "Les abonnements sont renouvelés mensuellement ou annuellement, sauf annulation. Vous pouvez annuler à tout moment ; l'accès reste actif jusqu'au terme de la période en cours.",
        "Stripe assure le traitement des paiements, l'émission des factures, le calcul des taxes et le portail de gestion de l'abonnement.",
        "Les offres Démarreur et Pro incluent un essai gratuit de 7 jours assorti de 25 crédits. L'offre Élite est souscrite directement sans période d'essai.",
      ],
    },
    {
      heading: "Contenu généré par l'IA",
      paragraphs: [
        "Les brouillons produits par CLIEDD s'appuient sur vos sources et sur le cadre rédactionnel que vous choisissez (AIDA, PAS ou votre propre instruction). Ils constituent des propositions : leur relecture vous incombe.",
        "Vous restez propriétaire de vos contenus sources et des publications diffusées, et vous êtes responsable de leur conformité aux règles de la plateforme X.",
      ],
    },
    {
      heading: "Disponibilité et résiliation",
      paragraphs: [
        "Nous nous efforçons d'assurer la continuité du service, sans garantir une disponibilité ininterrompue. Des interruptions peuvent survenir pour maintenance ou en raison d'incidents affectant les API tierces.",
        "Nous pouvons suspendre un compte en cas d'usage contraire aux présentes conditions ou aux règles de la plateforme X. Vous pouvez supprimer votre espace de travail à tout moment.",
      ],
    },
    {
      heading: "Nous contacter",
      paragraphs: [
        "Pour toute question relative à ces conditions, écrivez à support@cliedd.app. Nous répondons sous quelques jours ouvrés.",
      ],
    },
  ],
} as const;

export const privacy = {
  eyebrow: "Confidentialité",
  title: "Politique de confidentialité",
  updatedAt: "18 août 2026",
  intro:
    "Cette politique décrit les données que CLIEDD collecte, l'usage qui en est fait et les moyens dont vous disposez pour les contrôler.",
  sections: [
    {
      heading: "Données collectées",
      paragraphs: [
        "Données de compte : l'identifiant public de votre compte X, votre adresse e-mail et les jetons d'accès nécessaires à la publication.",
        "Données de contenu : les entrées récupérées depuis les flux que vous connectez, les brouillons générés, ainsi que vos publications programmées et diffusées.",
        "Données d'usage : journaux techniques, mesures de performance et statistiques de publication servant au diagnostic et à l'amélioration du service.",
      ],
    },
    {
      heading: "Usage des données",
      paragraphs: [
        "Vos données servent à faire fonctionner le service : récupérer les entrées de vos sources, produire des brouillons, alimenter le planificateur et publier sur X selon vos règles.",
        "Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires.",
      ],
    },
    {
      heading: "Connexion à la plateforme X",
      paragraphs: [
        "L'autorisation accordée lors de la connexion permet uniquement de publier les messages que vous approuvez ou programmez et de lire les statistiques associées.",
        "Vous pouvez révoquer cette autorisation à tout moment depuis votre espace de travail CLIEDD ou depuis les réglages de votre compte X. Les jetons correspondants sont alors supprimés.",
      ],
    },
    {
      heading: "Sous-traitants",
      paragraphs: [
        "Stripe traite les paiements, les factures et les taxes ; les données bancaires ne transitent jamais par nos serveurs.",
        "Des fournisseurs d'hébergement et de modèles de langage interviennent pour l'exécution du service. Ils sont liés par des engagements contractuels de confidentialité et n'utilisent pas vos contenus à d'autres fins.",
      ],
    },
    {
      heading: "Conservation",
      paragraphs: [
        "Les données d'un espace de travail sont conservées tant que le compte est actif. Après suppression, elles sont effacées sous 30 jours, à l'exception des pièces comptables que la loi impose de conserver.",
      ],
    },
    {
      heading: "Vos droits",
      paragraphs: [
        "Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité sur vos données, ainsi que d'un droit d'opposition à certains traitements.",
        "Pour exercer ces droits, écrivez à support@cliedd.app depuis l'adresse associée à votre compte.",
      ],
    },
  ],
} as const;
