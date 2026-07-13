# M4-bis — Financial reconciliation import & validation (revised)

Bring 42 QuickBooks payment records in as **pending** rows and let Giana/Abe confirm them inside a dedicated screen. Golden rule: **no unconfirmed payment enters any total, ever.**

## 1. Migration (single idempotent file)

`ALTER TABLE public.payments`:

- `ALTER COLUMN item_id DROP NOT NULL` — a payment can attach to an item, a vendor, or an invoice (Roche Bobois' 60% covers 26 items).
- `ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id)`
- `ADD COLUMN IF NOT EXISTS invoice_num text`
- `ADD COLUMN IF NOT EXISTS description text`
- `ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false`
- `ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES profiles(id)`
- `ADD COLUMN IF NOT EXISTS confirmed_at timestamptz`
- `ADD COLUMN IF NOT EXISTS source text` — `'manual' | 'reconciliation_import' | 'reconciliation_derived'`
- `ADD COLUMN IF NOT EXISTS dismissed boolean NOT NULL DEFAULT false`
- `CHECK (item_id IS NOT NULL OR vendor_id IS NOT NULL)`
- Backfill existing rows: `confirmed = true`, `source = 'manual'` so nothing already visible disappears.

### Grants (M1-B whitelist pattern — non-money only)

```sql
GRANT SELECT (vendor_id, invoice_num, description, confirmed,
              confirmed_by, confirmed_at, source, dismissed)
  ON public.payments TO authenticated;
```

`amount` stays revoked. Never add it to any grant.

### Do NOT touch `payments_visible`

No `CREATE OR REPLACE`, no `DROP`, no recreation. It keeps masking `amount` exactly as it does today. The M1 leak came from flipping a `*_visible` view to `security_invoker` and granting money — we are not going near that when we don't have to.

### Assertion in the same migration (fail-closed)

```sql
DO $$
BEGIN
  IF has_column_privilege('authenticated','public.payments','amount','SELECT') THEN
    RAISE EXCEPTION 'payments.amount is SELECT-able by authenticated — abort';
  END IF;
END $$;
```

RLS, `enforce_money_write`, `app_private.*`, and every other `*_visible` view stay untouched. `confirmed` is a **separate axis** from `state` — never a fourth state value.

## 2. Read path — merge pattern (same as `notes` today)

In `paymentsApi.ts`, extend both `fetchAllPayments` and `fetchPaymentsForItem` to select the new non-money columns from the **base** `payments` table and merge them onto the rows returned by `payments_visible` — identical to the current `notes` merge. `amount` continues to come exclusively from the view.

Add to the `Payment` type: `vendor_id`, `invoice_num`, `description`, `confirmed`, `confirmed_by`, `confirmed_at`, `source`, `dismissed`. Propagate into `PaymentWithMeta`.

## 3. Golden rule in `src/lib/budgetMath.ts` (single source)

Every consumer filters `p.confirmed === true && !p.dismissed` at the top:

- `pivotPayments`, `reservedTotal`, `upcomingSorted`, `dashboardCashCard`
- `derivePaymentTotals` in `usePayments.ts` (item drawer totals)

## 4. Importer — `scripts/import_reconciliation.mjs`

Same skeleton as `import_programa.mjs`: one transaction, `set_config('request.jwt.claims', ...)` to impersonate a full-visibility owner (import passes THROUGH `enforce_money_write`), deterministic ids from `payment_id`, `ON CONFLICT (id) DO NOTHING`, validation-then-rollback.

Per row: resolve `vendor_name` → `vendors.id` (create if missing — expected: **Blinds To Go**, **Osborne & Little**); insert `(id=payment_id, item_id, vendor_id, invoice_num, description, amount, direction, state, confirmed, due_date, source, phase_id=NULL, dismissed=false)`.

Expected report before commit (rollback on any drift):

- 42 rows total
- 19 `gad_to_vendor / paid / confirmed=true / reconciliation_import` → **$132,974.67**
- 19 `client_to_gad / due / confirmed=false / reconciliation_import` across invoices **00304, 00308, 00309, 00310, 00312, 00313, 00315** → **$223,541.37**
- 4 `client_to_gad / due / confirmed=false / due_date=NULL / reconciliation_derived` → **$95,698.18** (Muretti 50%, Roche Bobois 40%, Wuxi 50%, Better Tex 50%)

Wire into `scripts/README.md`.

## 5. Reconciliation screen — new tab in `/cashflow`

New `<TabsTrigger value="reconciliation">` in `src/routes/_authenticated/cashflow.tsx`, rendered **only** when `profile.role.money_visibility === 'full'`. Masked roles cannot see it (and RLS on `amount` blocks the reads anyway).

Content:

- **Banner** (when unconfirmed rows exist): `"N payments awaiting confirmation — not counted in any total until confirmed."`
- **"Needs attention"** card:
  - **Derived** — any vendor with payments but zero items in the schedule. Computed from `items` + `payments` on the client; will keep flagging future imports (Osborne & Little today).
  - **Static note** — Roche Bobois schedule $61,388.44 vs implied contract $65,441.12 (Δ $4,052.68).
- **Groups**, in order:
  1. One panel per invoice number (00304, 00308, 00309, 00310, 00312, 00313, 00315) — header row with bulk actions **Confirm invoice as paid**, **Confirm as due**, **Assign phase**.
  2. **Derived balances** (4 rows). Confirm action **requires a due date** (modal) — these become Kimberly's cash calls. Description shown verbatim.
  3. **Confirmed vendor payments** (collapsed by default, informational).
- **Per row**: date · description · vendor · amount · direction · state, plus **Confirm as paid**, **Confirm as due**, **Edit** (amount/date/phase), **Dismiss** (`dismissed=true`; row stays visible with an "excluded" badge).

Confirm writes: `confirmed=true`, `confirmed_by=auth.uid()`, `confirmed_at=now()`, chosen `state`. Small `confirmPayments(ids, patch)` bulk helper in `paymentsApi.ts`.

## 6. Verification

- Pre-confirmation: `/cashflow` Month/Phase pivots, Reserved panel, Upcoming list, Dashboard cash card, cash-call print — client lane = **$0**; vendor lane shows the 19 confirmed = $132,974.67.
- Confirm-all: client lane totals **$223,541.37**; dated derived balances appear in Upcoming.
- Re-run importer → 0 inserts.
- Masked role: reconciliation tab hidden; `payments_visible.amount` still `NULL`; direct `SELECT amount FROM payments` still denied (migration assertion covers this).
- `bun run test:security` green.

## Non-goals / do not touch

- `payments_visible` (no recreation).
- RLS policies, `enforce_money_write`, `app_private.*`, any grant on `amount`, any other `*_visible` view.
- No role-rights widening. Confirming is a non-money write; if a `client_assistant` is ever granted `cashflow:edit`, they can confirm without seeing amounts — that's an intentional Kimberly-style workflow, not a bug to "helpfully" close.
