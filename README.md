# LONTSI

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
| Dépendances  | Aucune librairie UI — icônes SVG inline    |

Toutes les pages sont pré-rendues statiquement.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script              | Rôle                              |
| ------------------- | --------------------------------- |
| `npm run dev`       | serveur de développement          |
| `npm run build`     | build de production               |
| `npm run start`     | sert le build de production       |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | `tsc --noEmit`                    |

## Pages

| Route               | Contenu                                                        |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | héros, boucle LONTSI (4 étapes), produit, aperçu tarifaire, FAQ |
| `/tarification`     | 3 offres, bascule mensuel/annuel, tableau comparatif, FAQ, CTA  |
| `/commencer`        | connexion X                                                     |
| `/termes`           | conditions d'utilisation                                        |
| `/confidentialite`  | politique de confidentialité                                    |

## Organisation

```
src/
  app/            routes App Router, globals.css, sitemap + robots
  components/     header, footer, maquette du tableau de bord, FAQ, tarifs
    ui/           primitives : Button, Container, Section, Eyebrow, icônes
  lib/
    content.ts    toute la copie du site
    legal.ts      contenu des pages légales
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
- Le bouton « Continuez avec X » est un lien de présentation ; il reste à
  brancher sur le flux OAuth X.
