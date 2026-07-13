-- M4-bis: reconciliation import & validation
-- 1) Loosen item_id, add reconciliation columns, CHECK constraint
-- 2) Fix regressed table-level grant on payments (base amount must stay revoked)
-- 3) Whitelist non-money new columns for authenticated
-- 4) Fail-closed assertion: amount not SELECT-able by authenticated

BEGIN;

-- --- 1. Schema changes ---------------------------------------------------

ALTER TABLE public.payments ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS vendor_id     uuid REFERENCES public.vendors(id),
  ADD COLUMN IF NOT EXISTS invoice_num   text,
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS confirmed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_by  uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS confirmed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS source        text,
  ADD COLUMN IF NOT EXISTS dismissed     boolean NOT NULL DEFAULT false;

-- Backfill existing rows so nothing already in the app disappears from totals.
UPDATE public.payments
   SET confirmed = true,
       source    = COALESCE(source, 'manual')
 WHERE confirmed = false;

-- A payment must attach to at least an item OR a vendor.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_item_or_vendor_chk;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_item_or_vendor_chk
  CHECK (item_id IS NOT NULL OR vendor_id IS NOT NULL);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_source_chk;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_source_chk
  CHECK (source IS NULL OR source IN ('manual','reconciliation_import','reconciliation_derived'));

-- --- 2. Restore the M1-B whitelist on the base table --------------------
-- A prior migration re-granted table-level SELECT on public.payments to
-- authenticated, which regressed the M1-B whitelist and exposed `amount`.
-- Revoke SELECT and re-grant column-by-column, EXCLUDING amount.
REVOKE SELECT ON public.payments FROM authenticated;

GRANT SELECT
  (id, item_id, direction, state, due_date, phase_id, notes, created_at, updated_at,
   vendor_id, invoice_num, description, confirmed, confirmed_by, confirmed_at, source, dismissed)
  ON public.payments TO authenticated;

-- --- 3. Fail-closed: amount MUST NOT be SELECT-able by authenticated ---
DO $$
BEGIN
  IF has_column_privilege('authenticated','public.payments','amount','SELECT') THEN
    RAISE EXCEPTION 'payments.amount is SELECT-able by authenticated — abort';
  END IF;
END $$;

-- payments_visible intentionally NOT touched.

COMMIT;