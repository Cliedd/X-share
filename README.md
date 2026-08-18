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
| Base         | SQLite (`better-sqlite3`) — aucun service à provisionner |
| IA           | `@anthropic-ai/sdk`, modèle `claude-opus-5`, sorties structurées Zod |
| Flux         | `fast-xml-parser` (RSS 2.0 et Atom)        |
| UI           | Aucune librairie — icônes SVG inline       |

Les pages marketing sont pré-rendues statiquement ; la console est rendue à la
demande.

## Installation

**Prérequis : Node.js 20 ou plus.** Rien d'autre — pas de base de données à
installer, pas de compte à créer, pas de clé d'API à obtenir.

```bash
git clone https://github.com/Cliedd/X-share.git
cd X-share
npm install
npm run dev
```

Ouvrez <http://localhost:3000>. La base SQLite se crée toute seule au premier
démarrage, dans `.data/` (ignorée par git).

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
Les deux blocs sont indépendants : vous pouvez activer l'IA sans X, ou
l'inverse.

| Variable                          | Effet une fois renseignée                        |
| --------------------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`               | les brouillons sont rédigés par Claude            |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | la connexion et la publication passent par X      |

### Scripts

| Script              | Rôle                              |
| ------------------- | --------------------------------- |
| `npm run dev`       | serveur de développement          |
| `npm run build`     | build de production               |
| `npm run start`     | sert le build de production       |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | `tsc --noEmit`                    |

### Note pour Windows

`better-sqlite3` est un module natif. Il s'installe via un binaire précompilé
dans l'immense majorité des cas. Si `npm install` tente malgré tout de le
compiler et échoue, installez les outils de compilation :

```powershell
npm install --global windows-build-tools
```

Ou, plus simple, utilisez une version de Node en LTS paire (20 ou 22), pour
laquelle les binaires précompilés existent.

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
| `/app/parametres`     | cadre rédactionnel, contexte produit, offre, barème               |

### Routes techniques

| Route                     | Rôle                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `/api/auth/x/login`       | démarre l'autorisation OAuth 2.0 X (PKCE)                    |
| `/api/auth/x/callback`    | échange le code, crée la session                             |
| `/api/auth/demo`          | connexion de démonstration (si X non configuré)              |
| `/api/cron/tick`          | ingère les flux, rédige en pilote auto, publie les dus       |

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

## Modes dégradés

L'application tourne de bout en bout sans aucun service externe :

| Service manquant       | Comportement                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | brouillons dérivés localement de l'entrée source                 |
| `X_CLIENT_ID/SECRET`   | connexion de démonstration, publications simulées et enregistrées |

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
    db.ts         schéma SQLite et ouverture
    auth.ts       sessions par cookie, espaces de travail
    x-oauth.ts    OAuth 2.0 X avec PKCE
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
- La facturation Paddle n'est pas branchée : l'offre se change dans
  *Paramètres*, ce qui permet d'exercer les quotas sans passerelle de paiement.
- `/api/cron/tick` doit être appelé par un ordonnanceur (cron Vercel ou tâche
  planifiée) pour que le pilotage automatique et la publication différée
  s'exécutent sans intervention.
- SQLite convient au développement et à un déploiement mono-instance ; une
  bascule vers Postgres est nécessaire pour un hébergement distribué.
