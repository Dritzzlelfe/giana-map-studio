
# M1 Pass A — Auth, Roles, and RLS Foundation

Goal: lock the app behind real authentication, introduce configurable roles with per-module rights and money visibility, and enforce all of it at the database layer. No new business modules. Existing data preserved.

## 1. Authentication

- Enable Supabase email+password (simplest, no SMTP dependency for magic links); email confirmations left ON.
- Login screen already exists at `/auth`. Keep it; polish copy only.
- Auth gate: the `_authenticated` layout already redirects to `/auth`. Move any remaining top-level routes under it. Root `/` stays as the Matrix inside `_authenticated`.
- Remove anon access: revoke all grants on `public.*` from `anon` and drop any anon policies added earlier. Authenticated-only from now on.

## 2. Schema (one idempotent migration)

New tables:

- `public.roles`
  - `id uuid pk`, `key text unique`, `label text`, `is_system boolean`, `module_rights jsonb`, `money_visibility text check in ('full','client_price','none')`, timestamps.
- `public.profiles`
  - `id uuid pk references auth.users on delete cascade`, `full_name text`, `role_id uuid references roles`, `person_id uuid references people`, timestamps.

Also:
- `updated_at` triggers on both (reuse `set_updated_at`).
- Trigger on `auth.users` insert → insert into `public.profiles` with `role_id = null`, plus first-owner bootstrap: if no profile currently has the `owner` role, assign the new user `owner`. (Also matches `g@gianaallendesign.com` explicitly as a belt-and-suspenders rule.)
- Grants: `authenticated` gets SELECT/INSERT/UPDATE/DELETE on `profiles` and SELECT on `roles`; role writes gated by policy. `service_role` full.

## 3. Seed system roles (ON CONFLICT (key) DO UPDATE)

Module keys used: `matrix, room, schedule, item, budget, cashflow, logistics, library, inventory, lookbook, intake, ai, scheduling, approvals, people_vendors, admin`.

| key | modules | money |
|---|---|---|
| owner | all `edit` | full |
| super_admin | all `edit` | full |
| admin | all `edit` except `admin` config maybe `edit` | full |
| team | matrix/room/schedule/item/logistics/library/inventory/lookbook/intake/ai/scheduling/approvals/people_vendors `edit`; budget/cashflow `view`; admin `none` | full |
| contractor | room/schedule/item `view`; rest `none` | none |
| client | dashboard(matrix `view`)/lookbook/approvals `view`; rest `none` | client_price |
| client_assistant | lookbook/approvals `view`; budget/cashflow `view`; rest `none` | client_price |

All `is_system = true`.

## 4. RLS helpers and policies

Helpers (SECURITY DEFINER, STABLE, `search_path=public`):
- `current_role_key() returns text`
- `current_money_visibility() returns text`
- `has_module_right(module text, level text) returns boolean` — treats `edit` ⊇ `view`.

Enable RLS on: `roles, profiles, rooms, categories, vendors, people, items, maps, map_nodes`.

Policy posture (per table, `TO authenticated`):
- `roles`: SELECT all authenticated. INSERT/UPDATE/DELETE only when `has_module_right('admin','edit')`. Block DELETE when `is_system`.
- `profiles`: user SELECT/UPDATE own row; admin/owner/super_admin SELECT/UPDATE all (role assignment).
- Data tables (`rooms, categories, vendors, people, items, maps, map_nodes`): map each to a module — items→`item`, rooms→`room`, categories→`schedule`, vendors/people→`people_vendors`, maps/map_nodes→`matrix`. SELECT requires `view`; INSERT/UPDATE/DELETE require `edit`.

## 5. Money-column hiding (column-level enforcement)

Postgres RLS is row-level. To hide `gad_cost`/`client_price` from restricted roles at the data layer:

- Create SQL view `public.items_visible` as `SELECT` of `items` where money columns are wrapped:
  - `CASE current_money_visibility() WHEN 'full' THEN gad_cost ELSE NULL END AS gad_cost`
  - `CASE current_money_visibility() WHEN 'none' THEN NULL ELSE client_price END AS client_price`
- View is `security_invoker = true` so underlying RLS still applies.
- REVOKE all on `public.items` from `authenticated`; GRANT only through role-gated policies AND additionally REVOKE SELECT on the money columns from `authenticated` at the table level using column privileges (`REVOKE SELECT (gad_cost, client_price) ON public.items FROM authenticated; GRANT SELECT (gad_cost, client_price) ON public.items TO authenticated` — no, we cannot do conditional GRANT). Instead: keep table SELECT column grants scoped to non-money columns for `authenticated`, and require reads of money to go through `items_visible`. Writes to money columns gated by a policy that checks `current_money_visibility() = 'full'` in the WITH CHECK.
- Client-side `itemsApi` reads switch from `from('items')` to `from('items_visible')` for lists; writes still target `items` with the money-write policy enforcing full visibility.

This means even a direct PostgREST query cannot return `gad_cost`/`client_price` to a role that lacks column privileges; the view is the only supported read path and nulls values per role.

## 6. Admin screen (minimal)

New route `/_authenticated/admin` (visible only when `has_module_right('admin','edit')`; hidden in `AppShell` nav otherwise):

- Roles editor: list roles; edit `module_rights` (grid of module × [none/view/edit]) and `money_visibility`; create custom role; delete disabled when `is_system`.
- People/invite panel: list `profiles` with role assignment dropdown; "Invite by email" using `supabase.auth.admin.inviteUserByEmail` via a `createServerFn` guarded by admin check, with role pre-attached (stored in a pending mapping keyed by email, applied on profile creation trigger).
- Preview-as-role: a client-side impersonation toggle that overrides the fetched `module_rights`/`money_visibility` in memory for UI gating and refetches through `items_visible` using an admin-only server fn that runs the view under a chosen role (SET LOCAL role via SECURITY DEFINER helper that swaps `current_role_key()`); read-only mode blocks writes in the UI. Clearly labeled as preview; disabled by default.

## 7. Client wiring

- `AppShell`: show role label; hide nav entries whose module the current role lacks `view` on (matrix/schedule/room/map/dashboard/admin).
- Add `useCurrentProfile()` hook returning `{ profile, role, moduleRights, moneyVisibility }` via TanStack Query.
- `ItemDrawer` and matrix cells: hide money inputs/badges when `moneyVisibility !== 'full'`; show client price only when `client_price`.
- Existing item queries switched to `items_visible`.

## 8. Verification output after migration runs

The migration's final `RAISE NOTICE`s will confirm:
- anon grants revoked (checked against `information_schema.role_table_grants`);
- RLS enabled on all 9 tables listed;
- 7 system roles present;
- profile auto-creation trigger installed;
- first-owner bootstrap logic present;
- money-column enforcement summary: table-level column REVOKE + role-aware view `items_visible` + write policy — no path exposes money to non-`full` roles.
- Any table without a policy is listed (should be empty).

## Deferred to pass B (explicit)

Products, Payments, Budget, Cashflow, Phases, Approvals, Documents, Media, Intake modules — no schema, no UI here.

## Technical notes

- One migration file adds tables, triggers, helpers, RLS, policies, view, grants, revokes, and seed. Fully idempotent via `IF NOT EXISTS`, `ON CONFLICT`, and `CREATE OR REPLACE`.
- Server-side admin ops (`inviteUserByEmail`, preview-as-role) go through `createServerFn` + `requireSupabaseAuth`, verifying `has_role`/`admin` module right before touching `supabaseAdmin` (loaded via `await import`).
- No changes to existing rooms/categories/vendors/people/items/maps/map_nodes data.
