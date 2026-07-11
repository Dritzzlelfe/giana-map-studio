# Styling pass — Giana Allen editorial UI

Presentation-only refresh. No migrations, no policy/RLS/GRANT changes, no query changes, no new columns in selects. All money continues to be read via the existing `*_visible` views; masked (NULL) values render as a discreet placeholder.

## 1. Brand tokens (once, app-wide)

Edit `src/routes/__root.tsx` to `<link>` **Libre Franklin** (weights 300/400/500/600) from Google Fonts.

Rewrite the token layer in `src/styles.css`:

- `--font-sans` and `--font-serif` both → `"Libre Franklin", ui-sans-serif, system-ui, sans-serif`. Hierarchy is weight + size + tracking, not family. Kill the `Fraunces` reference and the `.font-display` serif rule (keep the class name so existing JSX still compiles, but map it to a light+tracked Libre Franklin style).
- Palette (converted to oklch, kept as CSS variables consumed by the existing `@theme inline` block):
  - `--background` = `#f5efef` (paper)
  - `--card` = `#ffffff` used sparingly; add `--surface-sand` = `#f2efea` for recessed panels
  - `--foreground` = `#1a1a1a` (ink), `--muted-foreground` = `#606060`
  - `--border` = hairline gray `#e5e0dd`; add `--rule-soft` for matrix hairlines
  - `--primary` = terracotta `#a6615f`, `--primary-foreground` = paper; `--accent-hover` = `#965755`, `--accent-tint` = `#f4ebeb`
  - `--ring` = terracotta halo at low alpha
  - Status tones (muted, not traffic-light): `--status-needs` `#a6615f`, `--status-inflight` `#d9a65f`, `--status-settled` `#8ca65f`, `--status-empty` `#d9d9d9`
- Radius: shrink `--radius` to `4px` (near-square).
- Shadows: add `--shadow-cell` (warm charcoal 6% y1 blur2) and `--shadow-drawer` (warm charcoal 14% y8 blur24). Remove any heavy defaults.
- Utilities: add `.num-tabular { font-variant-numeric: tabular-nums; }` and `.label-micro { text-transform: uppercase; letter-spacing: 0.12em; font-size: 10.5px; font-weight: 600; color: var(--muted-foreground); }`.
- Retire the `--cat-*` palette usage in chrome (leave variables so nothing breaks; stop applying them as backgrounds).

## 2. Screen 1 — The Matrix (`src/routes/_authenticated/index.tsx`)

Rework presentation only; query and rollup logic unchanged.

- Page frame: paper background, generous outer padding, editorial page header with project name in light Libre Franklin ~28px slightly tracked, muted subtitle, thin rule under it.
- Table: remove card border/shadow; use hairline rules only at the header row and between rooms. No vertical dividers inside the body. Cell height ~56–60px, generous line-height.
- Sticky room column: `position: sticky; left: 0` with paper bg + right hairline + subtle `--shadow-cell` on horizontal scroll. Already sticky top header — restyle: uppercase micro labels, no background fill beyond paper, thin bottom rule.
- Header row + first column show a light **total** (existing `items.length` count per row/column — computed client-side from already-loaded items, no new fetch).
- Cell (`MatrixCell` extracted from inline JSX into `src/components/items/MatrixCell.tsx`):
  - committed count in tabular Libre Franklin regular; muted status dot to the left; `+N opt` in `--muted-foreground` micro text; ASAP as small uppercase tick in terracotta (no filled pill).
  - Empty cells nearly blank — no `+` glyph resting; reveal a faint `+` on hover only.
  - Hover: soft `--accent-tint` fill on cell **and** a low-opacity tint on the whole row and the whole column (achieved via CSS `:has` on the table or hover class toggles on `<tr>`/column index).
  - Selected: inset terracotta ring + `--accent-tint` fill.
- Legend restyled to muted dots with lowercase labels.
- Add a "Hide empty columns" toggle (client-only `useState`) in the page header that filters `data.categories` by whether any item exists in that column across all rooms.
- No spinners: replace the `Loader2` block with a quiet "Loading…" line in muted ink.

## 3. Screen 2 — Item Drawer (`src/components/items/ItemDrawer.tsx`, plus `StatusDot.tsx`)

Restyle only.

- Sheet width bumped, `--shadow-drawer`, paper background, no heavy border. Matrix stays visible behind (already a Sheet).
- Header block: product photo (square, hairline frame; **dashed** frame when `status === 'option'`, solid otherwise), name in Libre Franklin ~22px light, brand/vendor in muted micro label, SKU + dimensions in tabular figures on a second line.
- Stacked quiet blocks separated by whitespace and a single hairline, each with a `.label-micro` heading: **Lifecycle**, **Money**, **Logistics**, **Approval**, **People**, **Photos**.
- Lifecycle: horizontal step trail (option → approved → committed → ordered → delivered → installed) rendered as small dots + labels; current step in ink, past in muted, future as hairline outline. Pure derived-from-`status` styling.
- Options everywhere: dashed hairlines, italic muted ink; commitments: solid, full ink. Status dot palette switched to muted tones.
- **Money block — masking preserved**: continue to read whichever money fields are already on the item object (from `items_visible`). Render helper:

  ```tsx
  const Money = ({ value }: { value: number | null | undefined }) =>
    value == null
      ? <span className="text-[color:var(--muted-foreground)]">—</span>
      : <span className="num-tabular">${value.toLocaleString()}</span>;
  ```

  No new selects, no fallback fetch, no attempt to detect "why" it is null. A null stays a dash.
- `StatusBadge` restyled to dark-ink pills with uppercase micro text; `option` badge dashed + tentative; `ASAP` marker is a small uppercase terracotta tick, never a filled badge.

## 4. Ancillary chrome

- `AppShell` (`src/components/shell/AppShell.tsx`): paper bg, hairline divider under top bar, nav labels in micro-uppercase, active item marked by a 2px terracotta underline (no filled background).
- `Button` (shadcn `src/components/ui/button.tsx`): `default` variant → terracotta bg, paper fg, hover `--accent-hover`; `ghost`/`outline` variants → ink text, hairline border, no color fills; radius 4px; remove bounce.
- `Card` / table shells: swap heavy borders for hairlines; remove default shadows; only the drawer and hovered cells get elevation.
- `ItemsTable` and `CellPanel`: same hairline treatment, tabular numerals in Qty/Lead time/Delivery columns, muted `—` for empty values (already present).

## Explicitly untouched

- `supabase/migrations/**`, `app_private.*`, `enforce_money_write`, all RLS policies and GRANTs.
- `items_visible`, `payments_visible`, `budgets_visible`, `room_targets_visible`, `library_entries_visible` — reads keep flowing through these.
- `itemsApi.ts` / `mapApi.ts` select lists: no columns added, no `gad_cost`/`client_price`/`balance_due_on_delivery` referenced directly.
- Auth, roles, profiles, Admin logic, preview-as-role.

## Verify after build

1. `git diff --stat supabase/ src/integrations/supabase/` — empty.
2. `rg "gad_cost|client_price|balance_due_on_delivery" src` — matches only inside the Money renderer reading pre-fetched view fields; no new `.select(...)` includes them.
3. Playwright: load `/` as an authenticated viewer, screenshot the Matrix (sticky column + header on scroll, hover row/col highlight, selected cell), open a cell → open an item, screenshot the drawer. Confirm masked money renders as `—`.
4. Report anything deferred (e.g., if a shadcn primitive needs a variant that would require touching component logic beyond CSS, note it instead of forcing it).
