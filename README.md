# CLIEDD

Publication automatique X pour SaaS — site marketing et pages produit.

Connectez vos sources, obtenez des brouillons IA dans votre style et gérez un
calendrier X complet, sans avoir à rédiger de contenu quotidien.

## Stack

| Élément      | Choix                                      |
| ------------ | ------------------------------------------ |
| Framework    | Next.js 15 (App Router, React 19)          |
| Langage      | TypeScript (mode strict)                   |
| Styles       | Tailwind CSS v4 (`@theme` dans `globals.css`) |
| Polices      | Sora (titres), Inter (texte), JetBrains Mono (libellés) |
| Base         | Postgres via `pg` — pensé pour Neon, compatible Railway et Supabase |
| IA           | `@anthropic-ai/sdk`, modèle `claude-opus-5`, sorties structurées Zod |
| Flux         | `fast-xml-parser` (RSS 2.0 et Atom)        |
| UI           | Aucune librairie — icônes SVG inline       |

Les pages marketing sont pré-rendues statiquement ; la console est rendue à la
demande.

## Installation

**Prérequis : Node.js 20 ou plus, et une base Postgres.** Rien d'autre — pas de
compte à créer ni de clé d'API à obtenir pour démarrer.

Pour la base, [Neon](https://neon.tech) donne une instance gratuite en deux
minutes et c'est la cible recommandée. Créez un projet, copiez la chaîne de
connexion **poolée** (son hôte se termine par `-pooler`).

```bash
git clone https://github.com/Cliedd/X-share.git
cd X-share
npm install

cp .env.example .env.local
# collez votre chaîne Neon dans DATABASE_URL

npm run migrer     # crée les tables
npm run dev
```

Ouvrez <http://localhost:3000>. Le schéma est aussi appliqué automatiquement à
la première requête, donc `npm run migrer` est surtout utile au déploiement.

### Premier tour du produit, en une minute

1. Cliquez **Commencer**, puis **Continuez avec X**. Sans identifiants X
   configurés, vous entrez avec un compte de démonstration.
2. Dans **Sources**, collez `http://localhost:3000/exemple-flux.xml` — un
   journal des modifications factice livré avec le projet — et cliquez
   **Connecter**, puis **Récupérer**.
3. Dans **Brouillons**, cliquez **Rédiger 3 variantes** sur une entrée.
4. **Approuvez** un brouillon, puis glissez-le dans un créneau du
   **Planificateur**.
5. **Publiez** : la publication est simulée et enregistrée, les crédits sont
   débités, et les métriques apparaissent dans **Analyses**.

### Passer en services réels

Copiez `.env.example` vers `.env.local` et renseignez ce dont vous avez besoin.
Les quatre blocs sont **indépendants** : activer le paiement n'oblige pas à
configurer l'IA, et inversement.

| Variables                                    | Effet une fois renseignées                    |
| -------------------------------------------- | --------------------------------------------- |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`  | connexion par compte Google                    |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`| paiement, abonnements et factures              |
| `ANTHROPIC_API_KEY`                          | brouillons rédigés par Claude                  |
| `X_CLIENT_ID` + `X_CLIENT_SECRET`            | publication réelle sur X                       |

#### Google — connexion au compte

Console Google Cloud → **API et services** → **Identifiants** → **Créer des
identifiants** → **ID client OAuth** → *Application Web*. Déclarez l'URI de
redirection **exactement** ainsi :

```
http://localhost:3000/api/auth/google/callback
https://VOTRE-DOMAINE/api/auth/google/callback
```

Copiez l'ID client et le secret dans `.env.local`. Rien d'autre à faire : le
flux est un Authorization Code avec PKCE, déjà câblé.

#### Stripe — paiement

Tableau de bord Stripe → **Développeurs** → **Clés API**. Collez la clé
secrète. **Le mode est déduit du préfixe** : `sk_test_…` ouvre le mode test,
`sk_live_…` la production. Il n'y a aucune bascule à actionner ailleurs.

**Vous n'avez aucun produit ni tarif à créer.** Le catalogue est provisionné
automatiquement au premier paiement, repéré par `lookup_key` — il n'y a donc
aucun identifiant de prix à recopier dans la configuration.

Pour les webhooks en local :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

La commande affiche un secret `whsec_…` à coller dans `STRIPE_WEBHOOK_SECRET`.
En production, déclarez le point de terminaison
`https://VOTRE-DOMAINE/api/stripe/webhook` avec les événements
`checkout.session.completed`, `customer.subscription.created` / `updated` /
`deleted`, `invoice.paid` et `invoice.payment_failed`.

En mode test, la carte `4242 4242 4242 4242` avec une date future et
n'importe quel CVC valide un paiement.

Vous pouvez vérifier la chaîne sans clé ni réseau :

```bash
npm run verifier:facturation
```

Le script exerce la vérification de signature, l'idempotence des événements,
la montée en offre, le rejeu d'un même événement et la résiliation.

### Scripts

| Script              | Rôle                              |
| ------------------- | --------------------------------- |
| `npm run dev`       | serveur de développement          |
| `npm run build`     | build de production               |
| `npm run start`     | sert le build de production       |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | `tsc --noEmit`                    |
| `npm run migrer`    | applique les migrations de schéma  |
| `npm run verifier:facturation` | vérifie la chaîne Stripe sans clé ni réseau |

## Déploiement

Les deux cibles sont préconfigurées. La base vit chez Neon dans les deux cas.

### Vercel

`vercel.json` est déjà en place, avec la tâche planifiée.

1. Importez le dépôt sur Vercel. Le framework est détecté seul.
2. Renseignez les variables d'environnement — au minimum `DATABASE_URL` et
   `APP_URL` (votre domaine de production), puis les blocs que vous activez.
3. Déployez. Le schéma est appliqué à la première requête ; aucune étape de
   migration manuelle n'est nécessaire.

Le cron défini dans `vercel.json` appelle `/api/cron/tick` toutes les quinze
minutes et fournit lui-même l'en-tête d'autorisation à partir de
`CRON_SECRET`. Définissez cette variable pour fermer la route au public.

**Important sur Vercel** : utilisez impérativement la chaîne Neon *poolée*.
Chaque fonction serverless ouvre ses propres connexions, et une chaîne directe
épuiserait la limite de la base.

### Railway

`Dockerfile` et `railway.json` sont fournis.

1. **New Project → Deploy from GitHub repo.** Railway détecte le Dockerfile.
2. Ajoutez les variables d'environnement, dont `DATABASE_URL` (votre chaîne
   Neon) et `APP_URL`.
3. Le déploiement attend que `/api/health` réponde avant de basculer le
   trafic.

Railway n'a pas de cron intégré au service : ajoutez un **Cron Job** dans le
projet, planifié sur `*/15 * * * *`, qui appelle votre `/api/cron/tick` avec
l'en-tête `Authorization: Bearer $CRON_SECRET`.

### Après le déploiement

Vérifiez l'état de l'instance :

```bash
curl https://VOTRE-DOMAINE/api/health
```

La réponse indique si la base répond et quels services sont configurés.

Pensez ensuite à déclarer les URI de redirection de **production** dans la
console Google et le portail développeur X, et à créer le point de terminaison
webhook Stripe sur votre domaine — les URI locales ne valent que pour le
développement.

### Note pour Windows

Aucune dépendance native n'est requise : `npm install` fonctionne tel quel.

## Pages

Le site vitrine et l'application sont deux univers séparés par des groupes de
routes : `(site)` porte l'en-tête et le pied de page marketing, `/app` a son
propre habillage.

### Site

| Route               | Contenu                                                        |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | héros, boucle CLIEDD (4 étapes), produit, aperçu tarifaire, FAQ |
| `/tarification`     | 3 offres, bascule mensuel/annuel, tableau comparatif, FAQ, CTA  |
| `/commencer`        | connexion X                                                     |
| `/termes`           | conditions d'utilisation                                        |
| `/confidentialite`  | politique de confidentialité                                    |

### Application

| Route                 | Contenu                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `/app`                | tableau de bord : compteurs, file d'attente, entrées à traiter    |
| `/app/sources`        | connecteurs RSS — ajout, récupération, mode révision/pilote auto  |
| `/app/brouillons`     | entrées à transformer, génération IA, édition, approbation        |
| `/app/planificateur`  | semaine glisser-déposer, file d'attente, suggestion du coach IA   |
| `/app/analyses`       | impressions, engagement, histogramme, mouvements de crédits       |
| `/app/facturation`    | offre en cours, changement d'offre, factures, portail Stripe      |
| `/app/parametres`     | cadre rédactionnel, contexte produit, connexion X, barème         |

### Routes techniques

| Route                     | Rôle                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `/api/auth/google/login`    | démarre la connexion Google (OAuth 2.0 + PKCE)             |
| `/api/auth/google/callback` | échange le code, crée la session                           |
| `/api/auth/x/login`         | démarre l'autorisation de publication X                    |
| `/api/auth/x/callback`      | rattache le compte X à la session en cours                 |
| `/api/auth/demo`            | connexion de démonstration (si Google non configuré)       |
| `/api/stripe/checkout`      | ouvre une session de paiement pour une offre et un cycle   |
| `/api/stripe/portal`        | ouvre le portail de gestion de l'abonnement                |
| `/api/stripe/webhook`       | reçoit les événements Stripe (signature vérifiée)          |
| `/api/cron/tick`            | ingère les flux, rédige en pilote auto, publie les dus     |
| `/api/health`               | sonde de santé : base, schéma, services configurés         |

## Comment le produit fonctionne

**Ingestion.** Un connecteur pointe un flux RSS 2.0 ou Atom. Les entrées sont
dédupliquées par GUID sur `(connecteur, guid)` : re-parcourir un flux ne crée
jamais de doublon. Chaque connecteur est en *révision préalable* ou en
*pilotage automatique*.

**Rédaction.** `src/server/ai.ts` appelle `claude-opus-5` en sortie structurée
(schéma Zod) et renvoie trois variantes d'angles distincts, contraintes à
280 caractères. Le cadre rédactionnel (AIDA, PAS ou invite personnalisée) et le
contexte produit viennent des paramètres de l'espace de travail.

**Crédits.** Barème texte 1 · image 2 · vidéo 4 · lien 10, les composants se
cumulent. Le débit est atomique — la mise à jour ne s'applique que si le solde
suffit, ce qui empêche deux publications concurrentes de passer sous zéro. Une
publication échouée est **remboursée automatiquement**, de sorte que seul un
envoi réussi consomme des crédits.

**Publication.** `src/server/publisher.ts` débite, appelle l'API X v2, puis
rembourse en cas d'échec. Les erreurs 5xx et les limites de débit donnent lieu
à une nouvelle tentative (3 au maximum) ; les 4xx sont définitives.

**Analyses.** La cadence d'actualisation et la taille d'échantillon suivent
l'offre : 48 h / 30 publications en Démarreur, 24 h / 40 en Pro, 6 h / 50 en
Élite.

**Identité et publication sont séparées.** Google fournit l'identité du
compte ; X est une *connexion de publication* que l'on rattache ensuite depuis
les paramètres. On peut donc avoir un compte, une offre et des brouillons
avant même d'avoir relié X.

**Facturation.** Le paiement ouvre une session Stripe Checkout en mode
abonnement. Les webhooks synchronisent l'offre, le statut, le cycle et
l'échéance vers l'espace de travail, et réattribuent le quota lors d'un
changement d'offre ou d'un renouvellement — jamais deux fois pour la même
transition, puisque chaque événement n'est traité qu'une fois. Une
résiliation ou un impayé ramène l'espace à l'offre d'entrée.

## Modes dégradés

L'application tourne de bout en bout sans aucun service externe :

`DATABASE_URL` est la seule variable réellement obligatoire.

| Service manquant       | Comportement                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| Google                 | la page Commencer ouvre un compte de démonstration                 |
| Stripe                 | offres et quotas exerçables, sans encaissement                     |
| Anthropic              | brouillons dérivés localement de l'entrée source                   |
| X                      | publications simulées puis enregistrées                            |

Dans les deux cas, un bandeau l'indique sur le tableau de bord. Copiez
`.env.example` vers `.env.local` pour activer les services réels.

## Flux de démonstration

`public/exemple-flux.xml` est un journal des modifications factice. Connectez
`http://localhost:3000/exemple-flux.xml` dans *Sources* pour exercer le cycle
complet sans dépendre d'un flux externe.

## Organisation

```
src/
  app/
    (site)/       pages marketing + leur en-tête et pied de page
    app/          console : tableau de bord, sources, brouillons, planificateur…
    api/          authentification X, connexion démo, tick du planificateur
  components/
    app/          coquille, carte de brouillon, planificateur, formulaires
    ui/           primitives : Button, Container, Section, Eyebrow, icônes
  server/
    db.ts         pool Postgres, requêtes et transactions
    schema.ts     migrations de schéma, versionnées
    migrate.ts    exécution des migrations, sous verrou
    auth.ts       sessions par cookie, espaces de travail
    google-oauth.ts OAuth 2.0 Google avec PKCE (identité du compte)
    x-oauth.ts    OAuth 2.0 X avec PKCE (connexion de publication)
    stripe.ts     catalogue, Checkout, portail, synchronisation d'abonnement
    x-api.ts      client X API v2 (+ mode simulation)
    rss.ts        parsing RSS/Atom et ingestion dédupliquée
    ai.ts         génération des brouillons, coach de créneau
    credits.ts    barème, débit atomique, remboursement
    publisher.ts  publication, reprises, métriques
    queries.ts    lectures pour les pages
    actions.ts    actions serveur (mutations)
  lib/
    content.ts    toute la copie du site
    legal.ts      contenu des pages légales
    format.ts     dates, statuts, semaine
    utils.ts      cn() et formatage des prix
```

La copie vit dans `src/lib/` ; les composants ne portent que la mise en page.
Modifier un texte se fait à un seul endroit.

## Direction chromatique — « Aurore »

Les couleurs sont définies comme tokens Tailwind dans `src/app/globals.css`
(bloc `@theme`). Changer la palette se fait là, sans toucher aux composants.

| Rôle              | Token                              | Valeur    |
| ----------------- | ---------------------------------- | --------- |
| Fond              | `ink-950` → `ink-700`              | `#08060f` → `#2a2247` |
| Texte             | `cloud` / `muted` / `faint`        | `#f4f1ff` / `#a79fc5` / `#746c96` |
| Accent primaire   | `coral-400`                        | `#ff6b5b` |
| Accent secondaire | `amber-400`                        | `#ffb020` |
| Validation        | `aqua-400`                         | `#2dd4bf` |
| Quatrième temps   | `violet-500`                       | `#8b5cf6` |

Le dégradé de marque (`--brand-gradient`, utilitaires `.bg-brand` et
`.text-gradient`) va du corail à l'ambre.

## Notes

- La maquette du tableau de bord est entièrement en CSS — aucune image, et elle
  s'adapte à sa largeur propre via des container queries.
- Le contenu des pages `/termes` et `/confidentialite` est rédigé à partir du
  fonctionnement décrit sur le site : à faire relire par un juriste avant mise
  en ligne.
- `/api/cron/tick` doit être appelé par un ordonnanceur (cron Vercel ou tâche
  planifiée) pour que le pilotage automatique et la publication différée
  s'exécutent sans intervention.
- SQLite convient au développement et à un déploiement mono-instance ; une
  bascule vers Postgres est nécessaire pour un hébergement distribué.
