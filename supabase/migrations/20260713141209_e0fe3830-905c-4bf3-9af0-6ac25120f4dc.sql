
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS delivery_address_pending boolean NOT NULL DEFAULT false;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS ceiling_height text,
  ADD COLUMN IF NOT EXISTS width text,
  ADD COLUMN IF NOT EXISTS length text,
  ADD COLUMN IF NOT EXISTS notes text;
