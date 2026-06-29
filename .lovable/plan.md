# V3 — Canvas libre

Passage d'une disposition automatique (dagre) à un **canvas 100% libre** : tu places chaque carte où tu veux, tu les déplaces librement, et un double-clic dans le vide crée une nouvelle carte à l'endroit cliqué.

## Comportement

- **Double-clic sur le canvas** → crée une nouvelle carte à la position du curseur, enfant du nœud sélectionné (ou du root si rien n'est sélectionné), et entre directement en mode édition de titre.
- **Drag d'une carte** → met à jour sa position et sauvegarde immédiatement.
- **Le lien parent → enfant** reste affiché comme une arête React Flow (la hiérarchie n'est pas perdue, seule la disposition devient libre).
- **Le double-clic sur un nœud** conserve son rôle actuel : édition inline du titre (n'entre pas en conflit avec le double-clic canvas).
- **L'Outline view** reste hiérarchique et inchangée (la position x/y n'a de sens que dans la map).

## Migration des nœuds existants

Au premier chargement après la migration, les nœuds sans position se voient attribuer une position initiale via dagre **une seule fois**, puis ces positions sont persistées en base. Ensuite, tout est manuel.

## Détails techniques

### 1. Base de données
Migration ajoutant deux colonnes à `map_nodes` :
- `pos_x numeric` (nullable)
- `pos_y numeric` (nullable)

`null` = pas encore positionné → sera calculé via dagre au premier render puis sauvegardé.

### 2. Couche data (`mapApi.ts` / `useMapData.ts`)
- Nouveau mutation `useUpdateNodePosition({ id, pos_x, pos_y })` avec debounce léger (~150 ms) pour éviter de spammer la DB pendant le drag.
- `useAddChild` accepte un `pos_x` / `pos_y` optionnel pour les nœuds créés via double-clic.
- Update optimiste sur le cache TanStack Query, rollback en cas d'erreur (pattern déjà en place).

### 3. MindMapView
- Supprimer le calcul dagre au render. Utiliser les `pos_x` / `pos_y` de la DB.
- Fonction `seedMissingPositions(nodes)` : si certains nœuds n'ont pas de position, calculer un layout dagre une seule fois, puis envoyer un `UPDATE` batch pour persister. Ne se déclenche que quand `pos_x IS NULL`.
- React Flow : `nodesDraggable = true`, écouter `onNodeDragStop` pour sauvegarder la position finale (un seul write par drag, propre).
- Écouter `onPaneDoubleClick` pour créer un nouveau nœud : convertir les coordonnées écran → coordonnées flow via `reactFlowInstance.screenToFlowPosition`, appeler `addChild` avec `parentId = selectedId ?? rootId` et `pos_x` / `pos_y`.
- Garder le bouton "Fit view" pour recentrer manuellement.

### 4. UX
- Curseur "crosshair" léger au survol du pane vide pour indiquer l'action double-clic (optionnel, fin).
- Toast discret au premier seed de positions : "Layout initial appliqué — tu peux maintenant déplacer les cartes librement."
- Raccourci `N` existant : continue de créer un enfant, mais positionné à droite du parent (offset fixe) plutôt qu'à un endroit aléatoire.

## Hors scope

- Création/édition manuelle d'arêtes (relier deux cartes existantes au drag). Le parent reste défini à la création et via l'Outline.
- Auto-arrangement après modification — c'est précisément ce que tu veux désactiver.
- Zoom/pan limits custom — React Flow par défaut suffit.