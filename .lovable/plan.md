## M4 — Import the real Candida Smith data

Two schema tweaks, one importer, one small app-side rule. No RLS / view / grant / trigger changes.

### 1. Migration (idempotent) — `supabase/migrations/<ts>_m4_import_prep.sql`

On `public.items`:
- `ALTER COLUMN room_id DROP NOT NULL` (already nullable per current schema — confirmed, so this step is a no-op assertion via `DO $$ ... $$`).
- `ADD COLUMN IF NOT EXISTS is_fee boolean NOT NULL DEFAULT false`
- `ADD COLUMN IF NOT EXISTS import_source text`
- `ADD COLUMN IF NOT EXISTS programa_status text`
- Partial index: `CREATE INDEX IF NOT EXISTS items_is_fee_idx ON public.items(is_fee) WHERE is_fee`.

On `public.products`:
- `ADD COLUMN IF NOT EXISTS doc_code text`
- `ADD COLUMN IF NOT EXISTS colour text`
- `ADD COLUMN IF NOT EXISTS width_text text`, `length_text text`, `height_text text`, `depth_text text` (the file's dims are free-form strings like "31.5 inches"; the existing numeric `*_in` columns stay untouched and empty for imported rows).
- `CREATE UNIQUE INDEX IF NOT EXISTS products_doc_code_uidx ON public.products(doc_code) WHERE doc_code IS NOT NULL` (Giana's inventory codes are meant to be unique).

No changes to `enforce_money_write`, `app_private.*`, any `*_visible` view, RLS policies, or GRANTs. `service_role` already has `ALL` on these tables (default in Cloud), so writes and new columns are reachable.

### 2. Importer — `scripts/import_programa.ts` + `scripts/README.md` entry

One-shot Node/TS script, run with `bun scripts/import_programa.ts <path-to-json>` (default: `/mnt/user-uploads/gad_m4_import.json`). Connects with `pg` using `PG*` env vars (no Supabase JS — we need a single session in which we `SET LOCAL request.jwt.claims`). Executed as `service_role` DB role (default from `PG*`), so RLS is bypassed but the `enforce_money_write` trigger still runs.

Flow, all in ONE transaction:

1. Resolve the Candida Smith `project_id` (`SELECT id FROM projects WHERE name='Candida Smith'`).
2. Pick a full-visibility owner profile:
   `SELECT p.id FROM profiles p JOIN roles r ON r.id=p.role_id WHERE r.money_visibility='full' ORDER BY r.key='owner' DESC, r.key='super_admin' DESC LIMIT 1`.
   Fail loudly if none exists.
3. `SET LOCAL request.jwt.claims = json_build_object('sub', <that profile id>, 'role', 'authenticated')::text` — makes `app_private.current_money_visibility()` return `'full'`, so the money-write trigger sees a legitimate `full` caller (per user instruction: pass THROUGH the guard, not around it).
4. Preload lookup maps: rooms by exact name, categories by key, existing vendors by lowercased name, existing products by id.
5. Two-pass validation over the JSON BEFORE any write:
   - `room` non-null must exist in rooms map; otherwise reject.
   - `category` must exist in categories map, unless `is_fee=true` (fees allowed null category).
   - `programa_status` must be one of `paid | partial_payment | invoiced | client_review`; otherwise reject.
   - `room=null` allowed only when `is_fee=true` OR the row is the single "project-wide" case (`room=null AND is_fee=false`), which we simply allow because it's inferred, not flagged.
   - Numeric parse of `gad_cost` / `client_price` after stripping commas; empty/null → `NULL`.
   - Report all rejects to stdout and, if any, `ROLLBACK` and exit non-zero. Do not silently skip.
6. Resolve vendors per row:
   - `supplier=null` → `vendor_id=null`.
   - `supplier="Giana Allen Design"` → upsert vendor named `"Giana Allen Design (inventory)"` with `account_status='purchased_from'`, `contact_info=supplier_email`.
   - Otherwise match case-insensitive against `vendors.name`; if none, insert with `account_status='purchased_from'` and `contact_info=supplier_email`.
   Cache newly-created vendor ids in the same pass.
7. Upsert products (`ON CONFLICT (id) DO NOTHING`, keyed by the file's deterministic uuid5 `product_id`):
   `name, brand, sku, doc_code, colour, finish, material, width_text, length_text, height_text, depth_text, default_vendor_id` (resolved vendor).
   Deterministic uuids + shared `product_id` across multiple items (e.g. FR155 in two rooms) collapse to a single product row automatically.
8. Upsert items (`ON CONFLICT (id) DO NOTHING`, keyed by `item_id`):
   `project_id, product_id, room_id (may be NULL), category_id (may be NULL when is_fee), vendor_id, title=name, description, sku, lead_time, qty_needed=parseNumeric(qty), gad_cost, client_price, gad_paid_vendor, is_fee, programa_status, import_source='programa_2026-07-13'`, and mapped `status`:
   - `paid` → `ordered`
   - `partial_payment` → `ordered`
   - `invoiced` → `committed`
   - `client_review` → `committed`
   The original value is preserved verbatim in `programa_status`.
   The `items_autofill_context` trigger will still fire but is a no-op because we always supply `project_id` and `product_id`.
9. Validation report BEFORE `COMMIT`, printed:
   - counts: items = 181, products = 153.
   - per-room item counts, checked against the expected: Living Room 34, Dining Room / Living Room 30, Roof Deck 19, Master Bedroom 17, Kitchen 15, Bedroom 3 11, Master Bathroom 10, Bedroom 2 8, Powder Room 6, Foyer 5, Bathroom 2 5, Hallway 5, project-level (room_id IS NULL) 16.
   - sum of `client_price` across items ≈ $700,637 (log actual; tolerate ±$50 rounding). Any mismatch → print diff and `ROLLBACK`.
   - counts of `is_fee=true` and `room_id IS NULL AND is_fee=false` (should be exactly 1, French Oak).
10. `COMMIT` on success; script exits 0.

Idempotency: re-running the script hits `ON CONFLICT DO NOTHING` on both products and items and produces the same validation report unchanged.

Add an npm script `import:programa` in `package.json`.

### 3. App-side exclusion — `src/lib/budgetMath.ts` and matrix/room/schedule fetchers

Single implementation point per user instruction:

- In `roomSpend(items, roomId)`: keep summing `client_price`, but include `is_fee` items scoped to that room in the room's committed total. Nothing else changes there (fees are already committed by our status mapping).
- Add `projectSpend(items)` in the same file: total committed + options across all items, including project-level (`room_id IS NULL`) and `is_fee` rows. Used later by the project-total roll-up in the Dashboard.
- In every list that displays the Matrix, room grid, or trade schedule, filter out `is_fee` and `room_id === null`. Concretely:
  - `src/components/items/ItemsTable.tsx` used by Matrix / Room views: apply the filter at the caller — `src/routes/_authenticated/index.tsx` (dashboard matrix) and `src/routes/_authenticated/room.$roomId.tsx` (room grid).
  - `src/routes/_authenticated/schedule.$categoryKey.tsx` and `schedule.index.tsx`: same filter before grouping.
  Do NOT change `loadAll()` — the raw data still includes fees; only the *views* exclude them, because Budget/Dashboard totals need them.

### 4. Do NOT

- Do not touch `enforce_money_write`, `app_private.*`, `*_visible` views, RLS policies, or GRANTs.
- Do not create Payments rows.
- Do not import media.
- Do not add a UI trigger for the importer — it stays a one-shot script.

### Verify after M4

- `bun scripts/import_programa.ts` prints the validation report with 181 / 153 / expected per-room counts and total ≈ $700,637, then exits 0.
- Re-running is a no-op (no new rows, same report).
- `bun run test:security` still green.
- In the app: Matrix and room grid show no fee rows and no project-level rows; a room's BudgetStrip committed total includes that room's fees; a fee item is still openable via its own `id` if navigated to directly (nothing hides it at the row level).
- `psql -c "SELECT count(*) FROM items WHERE import_source='programa_2026-07-13'"` returns 181.

### Deferred / open

- Project-level total UI (Dashboard "Project total" card) — the math is ready in `projectSpend`, but wiring the card is out of scope for M4 unless you want it now.
- Media, payments, inventory linkage of "Giana Allen Design (inventory)" vendor to the Inventory module — later milestones.
