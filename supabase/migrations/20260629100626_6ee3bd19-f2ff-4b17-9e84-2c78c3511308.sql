ALTER TABLE public.map_nodes
  ADD COLUMN IF NOT EXISTS pos_x numeric,
  ADD COLUMN IF NOT EXISTS pos_y numeric;