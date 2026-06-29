# Plan — Relational Items Layer + Multi-View Navigation

Extend the existing Project Map app with a relational data layer (`items` joining rooms × categories × vendors × people) and four views over it: Matrix (default), Schedule (per trade), Room, and the existing Mind Map. Add a derived dashboard. Keep `maps` / `map_nodes` intact.

## 1. Database migration (single idempotent migration)

New tables in `public`, each with `GRANT SELECT/INSERT/UPDATE/DELETE TO anon, authenticated`, `GRANT ALL TO service_role`, RLS enabled, and permissive v1 policies matching `map_nodes`. `updated_at` triggers reuse the existing `set_updated_at()` function.

- `rooms` — `name`, `sort_order numeric`, `active boolean`
- `categories` — `key text unique`, `label`, `sort_order numeric`
- `vendors` — `name`, `contact_name`, `contact_info`, `trade_account_no`, `account_status` (`trade_account_open` | `purchased_from`), `notes`, timestamps
- `people` — `name`, `role`, `notes`
- `items` — all fields from the spec, FKs to rooms/categories/vendors/people; indexes on `room_id`, `category_id`, `vendor_id`, `status`, `priority`, `delivery_date`; timestamps + trigger

Seeding is idempotent (`INSERT … ON CONFLICT DO NOTHING` keyed on natural keys: `categories.key`, `rooms.name`, `vendors.name`, `people.name`):
- 14 categories (incl. `drapery` separate from `upholstery`, plus `av`)
- 17 rooms verbatim from plan; `Roof Deck` with `active=false`
- ~24 vendors with correct `account_status` (Constella Tech AV + Renson = `trade_account_open`)
- 8 people with roles
- 3–5 example items (no money values) so Matrix renders non-empty

Mind map seed updates run in the same migration, scoped to the existing seeded map:
- Rename `Vestibule` → `Entry Vestibule`; keep `Foyer`; delete the "Vestibule vs Foyer" question node
- Ensure `Dining Room / Living Room` node exists under Rooms
- Rename `Walk-in Closets (Muretti)` → `Closets (Muretti)`
- Replace "Standardize naming…" node with "Use plan room names verbatim"
- Delete empty `New node` children under Furniture
- Add `Drapery` and `AV` branches under `Schedules by Trade` with the listed children
- Replace Electrical placeholder children with the real list
- Populate `Roof Deck` under Deferred with the listed children

## 2. Data layer

- `src/lib/itemsApi.ts` — CRUD for items, rooms, categories, vendors, people; a `loadAll()` that returns normalized maps for the views.
- `src/lib/useItemsData.ts` — TanStack Query hooks with optimistic updates mirroring the existing `useMapData` patterns.
- Keep the existing map API untouched.

## 3. Navigation shell

Replace the current single-route shell with a top-level view switcher (TanStack Router child routes under `/`):
- `/` → Matrix (default landing)
- `/schedule/$categoryKey`
- `/room/$roomId`
- `/map` → existing Mind Map + Outline split-screen (move the current page here)
- `/dashboard` → derived cards

Top bar gets a segmented switcher: **Matrix · Schedule · Room · Map · Dashboard**, plus the existing search/export.

## 4. Views

**Matrix (default)**: rows = active rooms, columns = categories. Each cell shows item count + status roll-up dot (green=all delivered, amber=any ordered, red=any `on_hold`/`to_order`, grey=empty) + ASAP flag. Cell click opens a side panel listing those items with inline create.

**Schedule (per trade)**: category picker → table of every item in that category across rooms. Columns: room, title, vendor, sku, qty, status, lead time, delivery date, installer. Sortable, filterable.

**Room**: room picker → all items grouped by category. Same row component as Schedule.

**Item detail editor**: drawer (reuse `NodeDrawer` styling) with all item fields, vendor/person comboboxes (searchable, "create new" inline), status/priority/logistics_location selects, money fields, dates. Autosave on blur.

**Mind Map**: unchanged, moved to `/map`.

## 5. Dashboard cards (derived, read-only)

All computed client-side from the items/vendors/people query:
- **To-Do**: `status in ('to_spec','to_order')`, grouped by room, sorted by `delivery_date asc nulls last`
- **ASAP**: `priority='asap'`
- **People & Vendors**: two lists; vendors badge `Trade account open` vs `Purchased from` so unused accounts stay visible
- **Budget cashflow**: forward forecast grouped by month of `delivery_date`. Per month show: client owes GAD (`!client_paid_gad`), GAD owes vendor (`!gad_paid_vendor`), balances due on delivery. No single total.
- **Logistics board**: kanban-style columns by `logistics_location` (France ship / Mississippi truck / Mississippi warehouse / NY / N/A)

## 6. Build order

1. Migration (schema + seeds + mind map updates) — approval gate
2. Items API + hooks
3. Navigation shell + route files
4. Matrix view + cell drill-down panel
5. Item detail drawer with vendor/person pickers
6. Schedule + Room views (share row component)
7. Dashboard cards
8. Polish: empty states, status-dot legend, ASAP badges

## Technical notes

- v1 RLS stays permissive (anon CRUD) per the existing posture; explicit "no real financial data until auth" stays the rule — example items contain no prices.
- `numeric` `sort_order` everywhere for midpoint inserts without renumbering.
- All money fields nullable; the dashboard treats null as "unknown", not zero.
- Vendor & person creation reachable from any item picker so data entry never blocks on navigation.
- The mind map seed updates are written as targeted `UPDATE`/`DELETE`/`INSERT … WHERE NOT EXISTS` statements keyed on `(map_id, parent title path, title)` so re-running the migration is safe.
- No realtime in v1 (consistent with current optimistic-UI choice).
