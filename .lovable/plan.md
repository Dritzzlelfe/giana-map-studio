## Inline title editing for mind map & outline nodes

Goal: when you click a node, you can type directly to rename it — no need to open the Edit drawer. The drawer stays available (pencil icon) for the richer fields (category, status, priority, notes).

### Behavior

Mind map node (`MindMapNode.tsx`):
- Single click → select the node (as today).
- Double click on the title, or pressing `Enter`/`F2` while the node is selected, switches the title into an inline `<input>` (auto-focus, text pre-selected).
- Newly created nodes ("New node" via the `+` button) auto-enter edit mode with the placeholder text selected, so the user can type immediately instead of going through the drawer.
- Commit on `Enter` or blur → calls `useUpdateNode({ id, patch: { title } })`.
- Cancel on `Escape` → reverts to previous title, no save.
- Empty title on commit → revert (no empty nodes).
- While editing: stop click propagation, disable the React Flow drag/pan over that input, and hide the hover toolbar to avoid accidental clicks on Edit/Delete.
- The pencil button still opens the existing `NodeDrawer` for precise multi-field editing (unchanged).

Outline view (`OutlineView.tsx`):
- Same pattern: double-click the row label or press `Enter`/`F2` on the selected row to edit inline; `Enter` saves, `Escape` cancels.
- Newly added child/sibling rows enter edit mode automatically.

Auto-edit on creation:
- In `src/routes/index.tsx`, after `useCreateNode` resolves, set a small `editingId` piece of state that both views read to enter inline-edit on mount for that node id (instead of opening the drawer). This replaces today's "open drawer after add" flow if present.

### Technical notes

- Add local `isEditing` state inside `MindMapNode` and the outline row; controlled `<input>` mirrors `data.title` while editing.
- New prop on both components: `autoEdit?: boolean` (true for the freshly created node id) plus `onCommitTitle(id, title)` that calls the existing `useUpdateNode` mutation — keeps optimistic update behavior intact.
- No schema, API, or query changes. No new dependencies. Drawer, delete dialog, search, export, and category coding remain untouched.
- Typecheck after the edit.

### Out of scope

- Editing category/priority/status/notes inline (still drawer-only — that was the user's explicit ask: keep the drawer for precision).
- Drag-to-reparent, keyboard shortcuts for navigation between nodes, multi-select.
