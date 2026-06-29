## Plan — Interface split-screen Map + Outline

### Objectif
Passer de l'alternance Map / Outline (toggle) à un affichage **permanent côte à côte** avec synchronisation bidirectionnelle de la sélection.

### 1. Layout split-screen
- Remplacer le `ToggleGroup` Map/Outline par une grille/flex split : **gauche la Mind Map (~65%)**, **droite l'Outline (~35%)**.
- Séparateur visuel subtil (`border-r`) sans redimensionnement drag pour garder la simplicité.
- Sur petit écran (< 1024 px) : retomber automatiquement sur le toggle actuel (responsive).
- Garder le header inchangé (titre, recherche, export, bouton Add node).

### 2. Synchronisation bidirectionnelle
- **Map → Outline** : quand un nœud est sélectionné dans le canvas, l'Outline défile (`scrollIntoView`) jusqu'à ce nœud et déplie automatiquement ses ancêtres s'ils étaient repliés.
- **Outline → Map** : quand un nœud est sélectionné dans la liste, la carte centre/zoom (`fitView`) sur ce nœud pour le rendre visible immédiatement.
- Les deux vues partagent le même `selectedId` ; la surbrillance (ring, bg-secondary) est cohérente des deux côtés.

### 3. Déploiement/repliement automatique
- Dans l'Outline, un nœud sélectionné dont les ancêtres sont `collapsed` verra ces ancêtres dépliés automatiquement pour le rendre visible.
- Introduire un `expandedIds` local dans `OutlineView` piloté par la sélection et les clics manuels de Chevron (ne pas toucher `collapsed` en base pour ça ; c'est un état d'affichage local à l'Outline).

### 4. Conservation des fonctionnalités existantes
- Inline edit, double-clic canvas, drag & drop des cartes, raccourci **N**, drawer métadonnées, export, recherche — tout reste identique.
- Le drawer et le dialogue de suppression continuent de fonctionner depuis les deux vues.

### 5. Fichiers modifiés / créés
- `src/routes/index.tsx` — remplacer le toggle par le split-screen, gérer le `expandedIds` Outline, coordonner `handleSelect`.
- `src/components/map/OutlineView.tsx` — ajouter le contrôle local `expandedIds`, exposer une ref/scroll vers le nœud sélectionné.
- `src/components/map/MindMapView.tsx` — exposer un moyen de déclencher `fitView({ nodes: [id] })` depuis le parent.
- Pas de migration DB requise.

### Détails techniques
- Pas de librairie externe supplémentaire (split pane drag) — flexbox + `hidden lg:block` suffit.
- `useEffect` dans `OutlineView` : quand `selectedId` change, `document.getElementById('outline-' + selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- `useEffect` dans `MindMapView` : quand `selectedId` change depuis l'Outline, `rf.fitView({ nodes: [{ id: selectedId }], duration: 300 })`.

### Hors scope de ce plan
- Redimensionnement drag du séparateur (peut être ajouté plus tard).
- Refonte visuelle globale (couleurs, typographie) — sauf si demandé ensuite.