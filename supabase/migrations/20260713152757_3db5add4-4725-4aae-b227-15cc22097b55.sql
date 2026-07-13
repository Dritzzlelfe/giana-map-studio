ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_fee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS programa_status text;

CREATE INDEX IF NOT EXISTS items_is_fee_idx ON public.items(is_fee) WHERE is_fee;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS doc_code text,
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS width_text text,
  ADD COLUMN IF NOT EXISTS length_text text,
  ADD COLUMN IF NOT EXISTS height_text text,
  ADD COLUMN IF NOT EXISTS depth_text text;

CREATE UNIQUE INDEX IF NOT EXISTS products_doc_code_uidx
  ON public.products(doc_code) WHERE doc_code IS NOT NULL;