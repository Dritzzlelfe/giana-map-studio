## What the test showed

Playwright a rendu Dashboard, Rooms, Matrix, Approvals, Budget, Cashflow, Logistics et Schedule sur trois écrans (390, 820, 1440). Résultat :

```
                       mobile (390)   tablet (820)   desktop (1440)
/dashboard             +738 px         +308 px        0
/approvals             +738 px         +308 px        0
/budget                +738 px         +308 px        0
/cashflow              +738 px         +308 px        0
/logistics             +738 px         +308 px        0
/schedule              +738 px         +308 px        0
/rooms                 0               0              0
/matrix                0               0              0
```

Tous les écrans qui débordent débordent de la même quantité → une seule cause commune (env. 1128 px de largeur imposée), pas dix bugs indépendants.

## Cause principale : la barre de navigation du shell

Dans `src/components/shell/AppShell.tsx` :

- La `<nav>` de 10 liens (Dashboard, Rooms, Matrix, Approvals, Schedule, Budget, Cashflow, Logistics, Mind map, Admin) est en `flex items-center` sans `flex-wrap` ni scroll.
- Elle est enfant d'un container `flex flex-wrap` avec `mx-auto max-w-[1600px] px-8`. La `<nav>` a une largeur intrinsèque ~1100 px + logo + email + boutons → force la ligne à environ 1128 px et pousse tout l'`<html>` en scroll horizontal.
- `/rooms` et `/matrix` ne débordent pas parce qu'ils enveloppent leur contenu principal dans un scroll interne qui masque le débordement, mais la vraie fuite reste dans le header.

Effets visibles (captures) :
- Mobile Dashboard : la nav est coupée après « Matrix », l'utilisateur ne voit pas Approvals/Budget/Cashflow/Logistics.
- Mobile Budget/Cashflow/Logistics : mêmes symptômes, plus des tableaux qui forcent un scroll horizontal de page (au lieu d'un scroll local dans la carte).
- Tablet (820 px) : même débordement, la nav mange encore la ligne.

## Ce que je propose de corriger

### 1. Shell responsive (fichier `src/components/shell/AppShell.tsx`)

- Mobile (`< md`) : remplacer la nav pleine par un bouton hamburger qui ouvre un `Sheet` (déjà dans le kit) contenant la liste verticale des liens visibles, avec les mêmes icônes et l'état actif brass.
- Tablet (`md`) : garder la nav horizontale mais la mettre dans un conteneur `overflow-x-auto` avec `scroll-snap` et masquer la scrollbar — jamais de débordement à l'échelle du document.
- Header row : `min-w-0` sur les blocs texte (logo/email/preview banner), `shrink-0` sur les icônes, email tronqué en une seule ligne, badge « Previewing as… » collapsé en pastille + tooltip sur mobile.
- Bouton logout : garder l'icône seule, déjà OK.

### 2. Pages qui « fuient » latéralement (même après le fix du shell)

Après avoir tué la source header, il reste des zones dont les grilles ont un intrinsic min-width trop grand. Passer les corrections suivantes :

- `dashboard.tsx` : la grille de 3 cartes KPI descend en `grid-cols-1` sur `< sm`, `sm:grid-cols-3` reste. Le hero garde son image, mais on force le titre en `text-3xl` sur mobile et le padding en `p-4`.
- `logistics.tsx` : le kanban `md:grid-cols-3 xl:grid-cols-5` doit rester scrollable horizontalement dans son propre conteneur sur mobile (`overflow-x-auto` + colonnes en `min-w-[220px]`), pas via le scroll de la page. Les onglets « Board / France manifest / Install day / Parties » enveloppés dans `overflow-x-auto`. Les tableaux `manifest`/`install` déjà en `overflow-x-auto` — vérifier `min-w` cohérent.
- `budget.tsx` : la barre de titre + boutons passe en `flex-col sm:flex-row`. Les cartes de lane (Construction / FF&E) déjà OK, mais la table « Per-unit rates » a des `<input>` qui poussent : contraindre en `min-w-0 w-full` et scroller au niveau de la table.
- `cashflow.tsx` : header actions (`Cash call`, `Add payment`) en `flex-wrap`, la timeline reste centrée. Les cartes montant/serif-num forcées en `truncate` (les colonnes deviennent une seule colonne sur mobile).
- `approvals.tsx`, `schedule.tsx` : header en `flex-col sm:flex-row`, listes en 1 colonne mobile.

### 3. Détail commun à toutes les pages

- Ajouter un utilitaire `.page-scroll` (déjà présent via `overflow-auto` sur les containers d'AppShell) et vérifier qu'aucun descendant ne casse `min-w-0`. Règle : chaque flex/grid contenant du texte doit avoir `min-w-0` sur les enfants texte et `shrink-0` sur les icônes.
- `ItemDrawer` (Sheet) : passer le contenu en `w-full sm:max-w-lg` au lieu d'une largeur figée si elle existe.
- `HeroBand` : forcer `object-cover` + hauteurs mobile plus douces (`h-[38vh] sm:h-[48vh]`), titre `text-3xl sm:text-5xl`.

### 4. Ce que je ne touche pas

- La logique métier (`budgetMath`, RLS, server functions, mutations, calculs, `items_visible`), les types, les migrations, les policies.
- Les URLs, la navigation TanStack, les rôles/rights.
- Aucun changement de design system (palette, typo, tokens).

## Comment je vérifie

- Après implémentation, relancer le script Playwright sur les mêmes 8 routes × 3 viewports.
- Critère de succès : `overflow=0px` partout, captures mobiles où toute la nav est atteignable et où aucune page n'a de barre de scroll horizontale au niveau `<html>`.
- Screenshots avant/après sauvegardés dans `/tmp/browser/resp/` pour comparaison.

## Notes techniques

- 738 px = 1128 − 390 (mobile) et 308 = 1128 − 820 (tablet) → même largeur imposée, confirme la cause unique côté header.
- Les erreurs SSR-hydration observées (« A tree hydrated but some attributes… ») ne sont pas liées au responsive et sortent du périmètre de ce plan.
- Les avertissements de type « React state update on a component that hasn't mounted yet » viennent probablement de `useHydrated` non gardé sur une page — hors périmètre également, à traiter séparément si tu veux.
