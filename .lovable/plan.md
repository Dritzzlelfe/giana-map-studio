# M3 — Money & Logistics live (revised)

Three chantiers, verified in order. No security surface touched: RLS, `app_private.*`, `enforce_money_write`, grants, and `*_visible` views stay as-is. Money reads only through `budgets_visible`, `room_targets_visible`, `payments_visible`, `items_visible`; writes go through base tables and pass through `enforce_money_write`. Business columns added via normal idempotent migrations. `budgetMath.ts` is the single source of spend/gap/lane math.

---

## Schema migration (runs before Chantier 1)

One idempotent migration, no security surface touched:

- `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'project'` with a CHECK for `('project','roof_deck')`; partial unique index on `(project_id, scope)` so each project holds at most one row per scope. `budgets_visible` already selects `*` so `scope` surfaces automatically — verify, and if it column-lists, extend it (still definer, no policy change).
- `ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text`. Same check for `payments_visible`.
- `ALTER TABLE categories ADD COLUMN IF NOT EXISTS axis text` with CHECK `('construction','ffe')`; backfill:
  - construction: `plumbing, electrical, av, finish, tile_stone, floor, paint, wallpaper, door, hardware, fencing, kitchen`
  - ffe: `furniture, upholstery, drapery`
  - leave any unmatched key null and log them from the migration for Giana to classify.

Comment in `categories.ts`: "Fees follow their item's category axis. Project-level fees (no category) count toward construction by default."

---

## Chantier 1 — Budget module (`/budget`)

**Route & nav.** New `src/routes/_authenticated/budget.tsx`, module `budget`. Nav entry between Schedule and (future) Logistics in `AppShell`.

**Data layer.**
- `src/lib/budgetsApi.ts` + `useBudgets.ts`: read `budgets_visible` (money null for masked roles), write `budgets` (guarded). Query returns rows keyed by `scope`; UI reads `project` and `roof_deck` rows independently.
- `useRoomTarget` already exists; add `useUpdateRoomTarget` (guarded write to `rooms.target_amount`).
- Extend `budgetMath.ts`:
  - `perUnitSuggestion(item, rates)` — pure helper returning `{ rate, unit, suggested }` or null. Not applied to totals in M3; surfaced in the item drawer as a suggestion so the auto-recompute lands later without touching screens.
  - `roomBudgetRow(items, roomId, target)` → `{ target, committed, options, gap, status }` (reuses `roomSpend` + `gap`).
  - `projectLevelSpend(items)` — items with `room_id === null` (fees included), for the "Project-wide costs" row.
  - `axisSpend(items, categories, axis)` — split by `categories.axis`; fees inherit their item's category axis; project-level fees (null category) count as `construction`.

**Screen layout.**
1. **Global zone** — two side-by-side cards (Construction / FF&E), each showing total budget (inline-editable for full-visibility), axis spend, and a per-unit rates editor (`per_unit_rates` jsonb: add/edit/delete rows). Masked roles see placeholders and read-only rates.
2. **Roof Deck block** — separate card fed by the `scope='roof_deck'` budget row: target, committed, options, gap, plus note "Separately signed by Candida, includes all dunnage; also rolls into the project total."
3. **Rooms table** — one row per room, rendered twice side by side (Construction | FF&E) via `axisSpend`. Columns: Target (inline edit), Committed, Options (never merged with committed), Gap, status dot. Row click → `/room/$roomId`. Final "Project-wide costs" row using `projectLevelSpend`.

**Client "Room decision summary" export.** Per-room button opens a printable view (`/budget/room-summary/$roomId` sub-route or dialog) listing committed items with title, vendor, qty, and CLIENT price only. Enforced by projecting only `client_price` from `items_visible`. No `gad_cost`, no margin, ever.

---

## Chantier 2 — Cashflow & cash calls (`/cashflow`)

**Route & nav.** New `src/routes/_authenticated/cashflow.tsx`, module `cashflow`, nav after Budget.

**Data layer.**
- `useAllPayments()` reads `payments_visible` (now including `notes`); joins client-side with `items_visible` (title, room) and `phases`.
- `usePhases()` reads `phases` ordered by `sort_order`.
- Extend `budgetMath.ts`:
  - `pivotPayments(payments, axis: 'month'|'phase', phases)` → matrix `{ column, clientLane, vendorLane, cells }`.
  - `reservedTotal(payments)` and `upcomingSorted(payments)`.
  - `dashboardCashCard(payments, now)` → `{ thisMonth: { client, vendor }, nextMonth: { client, vendor } }`.

**Screen layout.**
1. **Pivot** — Month | Phase toggle. Two lanes per column (client → GAD, GAD → vendor). Cell shows summed amount + count; click opens a drawer listing the payments, each row uses the M2 payment editor.
2. **Reserved panel** — `state === 'reserved'` payments with total; copy "Not GAD's until ordered". Note: "Cross-project view will appear once a second project exists."
3. **Upcoming list** — sorted by `due_date`. Actions: **Mark paid** (guarded write `state='paid'`); **Move to phase** (select → update `phase_id` AND append audit line to `payments.notes`: `"[YYYY-MM-DD HH:mm] <user email> moved from <old phase> to <new phase>"`).
4. **Cash call export** — dialog "Generate cash call": pick date + phase range → printable/copyable list, client → GAD amounts ONLY, grouped by phase, Construction and FF&E side by side.
5. **Empty state** — with zero rows in `payments_visible`: card explaining "Payments will appear as they are entered or imported from the reconciliation" + primary "Add payment" button opening item picker → M2 payment editor. No fabrication from item statuses.

**Dashboard wiring.** Extend the M2 money card with a "This month / Next month" block driven by `dashboardCashCard`; two rows (client / vendor lane), masked-aware. Same math source.

---

## Chantier 3 — Logistics board (`/logistics`)

**Route & nav.** New `src/routes/_authenticated/logistics.tsx`, module `logistics`.

**Data layer.**
- Reuse `useItemsData` (already merges `is_fee` and non-money fields). Filter `!is_fee`.
- Existing `useUpdateItem` writes `logistics_location` and `delivery_address_pending`; `updated_at` refreshes via trigger.

**Screen layout.**
1. **Pending addresses banner** — sticky top strip listing items with `delivery_address_pending === true`; "Confirm address" opens the M2 item drawer at the address field.
2. **Board** — columns from `LOGISTICS_LOCATIONS` plus an "Unset" column for null. Compact cards: title, room name, vendor name, status dot. Drag-and-drop between columns via `@dnd-kit/core`; if not installed, fall back to a one-tap "Move to…" popover (reported as deferred, not blocking).
3. **Parties panel** — right sidebar listing vendors + people with logistics roles (Paige, Brownstone Movers, storage). Name, address, phone from existing fields. Explicit callout: "Open point: PC Richard storage facility name TBC."
4. **Manifest view** — tab "France container manifest": items in `('france_ship','mississippi_truck','mississippi_warehouse')`, printable.
5. **Install-day view** — tab "Install day": every item not yet at residence grouped by current `logistics_location`, printable.

---

## Verification (after each chantier)

- `bun run test:security` green; no RLS/policy/view/function/grant/trigger changed (only column adds).
- Preview-as `money_visibility='none'`: every money figure on the new screens is placeholder; cash call and room summary render redacted/empty.
- `rg` shows no spend/gap/lane arithmetic outside `budgetMath.ts`.
- With zero payments: `/cashflow` and the Dashboard cash card show empty state, no fabricated rows.
- Report anything deferred (dnd library fallback, unclassified categories from the axis backfill, etc.).
