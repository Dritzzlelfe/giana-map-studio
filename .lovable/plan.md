## M1 Pass B — Business data model (schema + backfill + security)

One idempotent migration, internally staged. No new screens. All existing screens keep working. All existing data preserved.

### Stage 1 — Projects and scoping

- `CREATE TABLE public.projects` (name, address, status, timestamps + updated_at trigger).
- Seed one project **Candida Smith** (8 West 19th Street, Floor 11, New York NY 10011) via idempotent `INSERT ... WHERE NOT EXISTS`; capture its id into a `DO` block variable for the backfill.
- Add nullable `project_id uuid REFERENCES projects(id)` to `rooms` and `items`.
- Backfill every existing row on both tables to Candida Smith's id.
- `ALTER COLUMN project_id SET NOT NULL` on both.
- Workspace-level tables stay global: `categories`, `vendors`, `people`, `roles`, `profiles`, plus the new `products`, `inventory_records`, `library_entries`, `documents`, `media`.

### Stage 2 — Product vs context

- `CREATE TABLE public.products` (name, brand, width_in, length_in, height_in, depth_in, finish, material, sku, default_vendor_id → vendors, timestamps + trigger).
- Backfill: one row per existing `items` row (`name ← items.title`, `sku ← items.sku`, `default_vendor_id ← items.vendor_id`). Store the mapping via a temp `item_id → product_id` table inside the migration.
- Add `items.product_id uuid REFERENCES products`; populate from the mapping; `SET NOT NULL`.
- Keep `items.title/sku/description/design_placement` for now — a later cleanup migration drops the redundant identity columns after M2.

### Stage 3 — Other context records & shared pools

- `CREATE TABLE public.inventory_records` (product_id, ownership, location, resale_status, listed_website, listed_chairish, notes, timestamps + trigger).
- `CREATE TABLE public.library_entries` (product_id, scope, project_id?, room_id?, stock_on_hand, **price_per_unit numeric [money]**, price_unit, source_contact, notes, timestamps + trigger).

### Stage 4 — Money and workflow

- `CREATE TABLE public.payments` (item_id ON DELETE CASCADE, **amount [money]**, direction, state, due_date, phase_id nullable, timestamps + trigger).
- `CREATE TABLE public.budgets` — one per project (project_id UNIQUE, **construction_budget**, **ffe_budget**, **per_unit_rates jsonb**, timestamps + trigger). All numeric amounts are money.
- Add `rooms.target_amount numeric` (money) — simpler than a side table, keeps room UX single-row.
- `CREATE TABLE public.phases` (project_id, name, sort_order, axis in ('construction','ffe'), timestamps + trigger). Seed for Candida: demolition, rough-in, install on construction axis; a single "FF&E" phase on ffe axis. `payments.phase_id REFERENCES phases`.
- `CREATE TABLE public.approvals` (item_id ON DELETE CASCADE, decided_by → people null, decided_at, mode in ('dashboard','verbal_logged','declined'), logged_by → profiles, note, created_at).

### Stage 5 — Documents vs media

- `CREATE TABLE public.documents` (project_id?, room_id?, type in ('contract','gc_contract','permit','building_paperwork','other'), related_party → people?, title, file_url, expires_on?, timestamps + trigger).
- `CREATE TABLE public.media` (product_id?, item_id?, lookbook_section?, room_id?, file_url, kind in ('photo','reference','lookbook'), created_at).

### Stage 6 — Security (inherits pass A rules)

For every new table: enable RLS, GRANT to `authenticated`/`service_role` per policy, revoke anon, and add SELECT/INSERT/UPDATE/DELETE policies gated on `app_private.has_module_right(module, level)` with the following module map:

| Table | Module |
|---|---|
| projects | `item` (view = all authenticated; edit = admin-only via has_module_right('item','edit') for now) |
| products | `item` |
| inventory_records | `inventory` |
| library_entries | `library` |
| payments | `cashflow` |
| budgets | `budget` |
| rooms.target_amount | (rooms policy unchanged; column protected by money masking) |
| phases | `budget` |
| approvals | `approvals` |
| documents | `library` |
| media | `lookbook` |

**Money column protection (CRITICAL, inherits pass A):**

For each money column — `payments.amount`, `budgets.construction_budget`, `budgets.ffe_budget`, `budgets.per_unit_rates`, `rooms.target_amount`, `library_entries.price_per_unit`:

1. `REVOKE SELECT (col)` from `authenticated` on the base table.
2. Expose ONLY through a SECURITY DEFINER view (`security_invoker=false, security_barrier=true`, OWNER `postgres`), with per-column `CASE` on `app_private.current_money_visibility()`.

Definer views to create:

- `public.payments_visible` — row filter `has_module_right('cashflow','view')`; `amount` masked as:
  - `direction='gad_to_vendor'` → visible only when `'full'`
  - `direction='client_to_gad'` → visible when `'full'` or `'client_price'`
  - else NULL
- `public.budgets_visible` — row filter `has_module_right('budget','view')`; `construction_budget`, `ffe_budget`, `per_unit_rates` visible when `'full'`; `ffe_budget` also visible when `'client_price'` (client-facing total); NULL otherwise.
- `public.library_entries_visible` — row filter `has_module_right('library','view')`; `price_per_unit` visible only when `'full'`.
- For `rooms.target_amount`: create `public.rooms_visible` (or add masked column via a companion view `public.room_targets_visible`). Use a dedicated `public.room_targets_visible(room_id, target_amount)` to avoid disturbing the existing `rooms` reads — `target_amount` visible when `'full'` or `'client_price'`, else NULL.

`items_visible` is untouched — its money masking and row filter stay. Verify it still selects after `product_id`/`project_id` are added (they're non-money cols, no revoke needed; view re-created only if column list expands — this pass does NOT expose them through the view).

### Stage 7 — Wiring + verification

- Regenerate Supabase types (post-migration).
- No UI changes in this pass. `useItemsData`/`loadAll` keep reading `items_visible` and legacy `items.title/sku`; joining to `products` comes in M2.
- Update the security memory to list the new definer views as accepted linter false-positives with the same rationale as `items_visible`.
- Verification queries embedded at the end of the migration (raise notice, no-op on success):
  1. Candida project exists; `COUNT(*) FROM rooms WHERE project_id IS NULL = 0`; same for items.
  2. `COUNT(products) = COUNT(items)`; `COUNT(items WHERE product_id IS NULL) = 0`.
  3. `information_schema.column_privileges`: `authenticated` has NO SELECT on `payments.amount`, `budgets.construction_budget`, `budgets.ffe_budget`, `budgets.per_unit_rates`, `rooms.target_amount`, `library_entries.price_per_unit`.
  4. Every new table has `rowsecurity = true` and at least one policy in `pg_policies`.

### Technical notes

- Everything wrapped in `DO $$ ... $$` blocks / `CREATE ... IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `ALTER ... IF EXISTS` guards for idempotency. Policies use `DROP POLICY IF EXISTS ... ; CREATE POLICY ...`. Views use `CREATE OR REPLACE VIEW`.
- Every new public table: GRANT block before ENABLE RLS, per house rule.
- `updated_at` triggers reuse existing `public.set_updated_at()`.
- No changes to: `app_private.*` helpers, `enforce_money_write` trigger, preview-as-role guard, existing RLS on rooms/items/vendors/etc., write paths, or client code.

### Out of scope (deferred)

- New business screens (M2).
- Intake, AI, Scheduling (Phase 3).
- Dropping legacy `items.title/sku` columns (post-M2 cleanup).
- QuickBooks integration.
