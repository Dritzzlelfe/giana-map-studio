# Pass éditorial "Atelier feutré"

Objectif : rendre l'app désirable sans toucher à la logique métier (RLS, `*_visible`, `budgetMath`, mutations). Seulement présentation, tokens, iconographie, imagerie.

## 1. Système visuel (src/styles.css + __root.tsx)

- **Typo** : pair Cormorant Garamond (display serif, headings + hero numerals) + Libre Franklin (body/UI, déjà en place). Chargée via `<link>` Google Fonts dans `src/routes/__root.tsx` head. Tokens `--font-display: "Cormorant Garamond"` / `--font-sans: "Libre Franklin"`.
- **Palette confirmée** : cream `#efe9e1`, sand `#d9cfc0`, walnut `#5a4a3a`, brass `#c9a84c`. Mise à jour de `--background`, `--surface-sand`, `--foreground`, `--primary` (walnut), nouveau `--accent-brass`, `--accent-brass-soft`.
- **Textures & profondeur** : hairlines à `color-mix(walnut 12%)`, `--shadow-editorial: 0 20px 40px -24px rgba(90,74,58,0.25)`, papier subtle (SVG grain optionnel en `background-image` sur `body`).
- **Utilities** ajoutées : `.brass-rule` (filet 1px brass 30%), `.editorial-eyebrow` (petites capitales walnut + brass dot), `.serif-num` (Cormorant + tabular).

## 2. Iconographie unifiée

Nouveau `src/components/ui/CategoryIcon.tsx` : map `categoryKey → Lucide icon` avec `strokeWidth={1.25}`, tailles `sm|md|lg`.

```text
plumbing  → Droplets       tile        → Grid3x3
upholstery→ Armchair       drapery     → Curtains (lucide) / Blinds
lighting  → Lamp            hardware    → Wrench
kitchen   → ChefHat         furniture   → Sofa
art       → Frame           millwork    → Hammer
logistics → Truck           budget      → Wallet
payments  → Banknote        approvals   → CheckCheck
schedule  → CalendarRange   fees        → Percent
```

Utilisée dans : sidebar shell, entêtes de colonnes matrix, chips de catégories, entêtes de lanes budget, lignes cashflow, colonnes logistics, ItemDrawer header.

## 3. Imagerie photographique (assets CDN)

Génération d'une image par pièce connue via `imagegen--generate_image` (standard, 1536×1024, `.jpg`), ambiance "Atelier feutré" — laiton, chêne, lin, lumière rasante. Puis upload via `lovable-assets create` et pointer `.asset.json` importé en TS.

Rooms ciblées (identifiées côté seed) : Living Room, Dining Room, Kitchen, Master Bedroom, Master Bathroom, Powder Room, Guest Bedroom, Study, Entry, Terrace. + 1 hero global "residence".

Nouveau module `src/lib/roomHero.ts` : `heroFor(roomSlug) → url | null` avec fallback gradient walnut→brass si pas d'image.

## 4. Écrans redessinés

### Dashboard (`_authenticated/dashboard.tsx`)
- Bandeau hero photographique full-bleed (18rem) avec titre serif "Candida Residence" + eyebrow brass ("En chantier · 12 pièces").
- 3 KPI cards en grille éditoriale : Spend, Gap, Payments this month — nombres en Cormorant 48px, label micro caps, filet laiton.
- Section "Chantiers" (3-col) avec ic (...)ône Lucide + titre + progress bar walnut/brass, cliquable.
- Empty states dignes (illustration Lucide grande + phrase serif).

### Matrix (`_authenticated/index.tsx`)
- Corner cell renforcé : logo/nom projet en serif + micro caps "Rooms".
- Colonnes : icône catégorie 14px + label micro caps, filet brass au hover de colonne (via `:has`).
- Dots statut agrandis, halo subtle. Sticky corner z-index déjà OK depuis fix précédent.

### Room detail (`room.$roomId.tsx`)
- Hero 40vh avec image de pièce, gradient wash bas walnut→transparent, breadcrumb Rooms / <Room> en clair sur photo, KPIs superposés en bas (items, spend, gap).
- Tab strip catégories avec icônes.
- Sections `<Card>` refondues : header serif + eyebrow + filet brass.

### Budget (`budget.tsx`)
- Header serif "Budget" + eyebrow "Signed budgets · gap live".
- Lanes en cards éditoriales avec ic (...)ône catégorie, barre de progression walnut/brass, chiffres serif tabular.
- Fees rappel en note discrète : *fees suivent l'axe catégorie de leur item ; fees projet (sans catégorie) comptent en construction par défaut* (commentaire code + tooltip UI).

### Cashflow (`cashflow.tsx`)
- Timeline verticale avec pastilles laiton par mois, montants en serif, empty state grand (icône Banknote + "Aucun paiement enregistré").

### Logistics (`logistics.tsx`)
- Colonnes kanban : titre serif + icône Truck/Ship/Package/Home, compteur brass.
- Cartes : thumbnail carrée (image de pièce si `room_id`, sinon initiales), poignée `GripVertical` walnut, drapeau `delivery_address_pending` en pastille clay.

### AppShell (`components/shell/AppShell.tsx`)
- Sidebar : logo wordmark serif "Giana", nav items avec icônes catégorie, item actif = filet vertical brass 2px + fond cream.
- Topbar : breadcrumb serif, cloche notifications discrète.

## 5. Ordre d'exécution
1. Tokens + fonts + utilities dans styles.css + __root head.
2. `CategoryIcon` + `roomHero` helpers.
3. Génération assets pièces (10 images) + upload CDN en parallèle.
4. AppShell + Dashboard.
5. Matrix + Room detail.
6. Budget + Cashflow + Logistics.
7. Vérification build + revue visuelle sur chaque route.

## Garde-fous
- Aucune migration, aucune modif de `*_visible`, `budgetMath`, mutations, RLS, GRANT.
- Aucun nombre inventé : tous les chiffres viennent des hooks existants ; empty states quand vide.
- Exports client-only inchangés.
- Fallback iconographique et image (jamais de cassure si catégorie/pièce inconnue).

## Détails techniques
- Google Fonts chargé via `<link rel="stylesheet">` dans `head()` de `__root.tsx` (jamais `@import` URL dans styles.css).
- Assets images : `imagegen--generate_image` → `/tmp/rooms/<slug>.jpg` → `lovable-assets create --file` → pointer `src/assets/rooms/<slug>.jpg.asset.json`, import JSON, `img.url`.
- Aucun `text-white`/`bg-black` hardcodé : uniquement tokens sémantiques.
- Animations : `animate-fade-in` sur cartes, `hover-scale` sur thumbnails (utilitaires déjà présents).
