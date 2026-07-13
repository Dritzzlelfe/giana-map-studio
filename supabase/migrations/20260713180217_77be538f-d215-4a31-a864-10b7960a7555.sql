ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_item_or_vendor_chk;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_item_or_vendor_chk
  CHECK (item_id IS NOT NULL OR vendor_id IS NOT NULL OR invoice_num IS NOT NULL);