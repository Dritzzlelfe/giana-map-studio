
-- =========================================================
-- 1. ROOMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v1 anyone can read rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can delete rooms" ON public.rooms;
CREATE POLICY "v1 anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update rooms" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete rooms" ON public.rooms FOR DELETE USING (true);
DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v1 anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can insert categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can update categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can delete categories" ON public.categories;
CREATE POLICY "v1 anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update categories" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete categories" ON public.categories FOR DELETE USING (true);
DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. VENDORS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact_name text,
  contact_info text,
  trade_account_no text,
  account_status text NOT NULL DEFAULT 'purchased_from',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO anon, authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v1 anyone can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can delete vendors" ON public.vendors;
CREATE POLICY "v1 anyone can read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert vendors" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update vendors" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete vendors" ON public.vendors FOR DELETE USING (true);
DROP TRIGGER IF EXISTS vendors_set_updated_at ON public.vendors;
CREATE TRIGGER vendors_set_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4. PEOPLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO anon, authenticated;
GRANT ALL ON public.people TO service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v1 anyone can read people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can insert people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can update people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can delete people" ON public.people;
CREATE POLICY "v1 anyone can read people" ON public.people FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert people" ON public.people FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update people" ON public.people FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete people" ON public.people FOR DELETE USING (true);
DROP TRIGGER IF EXISTS people_set_updated_at ON public.people;
CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. ITEMS  (the core)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  sku text,
  design_placement text,
  qty_needed numeric,
  qty_ordered numeric,
  status text,
  priority text,
  ordered_by uuid REFERENCES public.people(id) ON DELETE SET NULL,
  installer uuid REFERENCES public.people(id) ON DELETE SET NULL,
  lead_time text,
  delivery_address text,
  delivery_date date,
  storage_name text,
  storage_address text,
  logistics_location text,
  gad_cost numeric,
  client_price numeric,
  client_paid_gad boolean NOT NULL DEFAULT false,
  gad_paid_vendor boolean NOT NULL DEFAULT false,
  balance_due_on_delivery numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_room_id_idx ON public.items(room_id);
CREATE INDEX IF NOT EXISTS items_category_id_idx ON public.items(category_id);
CREATE INDEX IF NOT EXISTS items_vendor_id_idx ON public.items(vendor_id);
CREATE INDEX IF NOT EXISTS items_status_idx ON public.items(status);
CREATE INDEX IF NOT EXISTS items_priority_idx ON public.items(priority);
CREATE INDEX IF NOT EXISTS items_delivery_date_idx ON public.items(delivery_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v1 anyone can read items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can insert items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can update items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can delete items" ON public.items;
CREATE POLICY "v1 anyone can read items" ON public.items FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert items" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update items" ON public.items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete items" ON public.items FOR DELETE USING (true);
DROP TRIGGER IF EXISTS items_set_updated_at ON public.items;
CREATE TRIGGER items_set_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 6. SEED DATA (idempotent)
-- =========================================================

-- Categories
INSERT INTO public.categories (key, label, sort_order) VALUES
  ('plumbing','Plumbing',10),
  ('electrical','Electrical',20),
  ('av','AV',30),
  ('finish','Finish',40),
  ('tile_stone','Tile & Stone',50),
  ('floor','Floor',60),
  ('paint','Paint',70),
  ('wallpaper','Wallpaper',80),
  ('door','Door',90),
  ('hardware','Hardware',100),
  ('furniture','Furniture',110),
  ('upholstery','Upholstery',120),
  ('drapery','Drapery',130),
  ('kitchen','Kitchen',140)
ON CONFLICT (key) DO NOTHING;

-- Rooms (verbatim from architectural plan)
INSERT INTO public.rooms (name, sort_order, active) VALUES
  ('Entry Vestibule',10,true),
  ('Foyer',20,true),
  ('Powder Room',30,true),
  ('Living Room',40,true),
  ('Dining Room / Living Room',50,true),
  ('Upper Hallway',60,true),
  ('Hallway',70,true),
  ('Kitchen',80,true),
  ('Bathroom 2',90,true),
  ('Master Bathroom',100,true),
  ('Master Bedroom',110,true),
  ('Bedroom 2',120,true),
  ('Bedroom 3',130,true),
  ('Laundry Room',140,true),
  ('Mechanical Room',150,true),
  ('Closets (Muretti)',160,true),
  ('Roof Deck',170,false)
ON CONFLICT (name) DO NOTHING;

-- Vendors
INSERT INTO public.vendors (name, account_status, notes) VALUES
  ('AF New York','purchased_from',NULL),
  ('Avocado','purchased_from',NULL),
  ('Artistic Tile','purchased_from',NULL),
  ('The Hudson Company','purchased_from',NULL),
  ('Grand Central','purchased_from',NULL),
  ('Fantini','purchased_from',NULL),
  ('PC Richard','purchased_from',NULL),
  ('Roche Bobois','purchased_from',NULL),
  ('Muretti','purchased_from',NULL),
  ('Wuxi Eastern','purchased_from','Chinoiserie wallpaper'),
  ('Jim Thompson','purchased_from',NULL),
  ('Samuel & Sons','purchased_from',NULL),
  ('Ainsworth-Noah','purchased_from',NULL),
  ('Romo','purchased_from',NULL),
  ('Kravet','purchased_from',NULL),
  ('Lee Jofa','purchased_from',NULL),
  ('Brunschwig & Fils','purchased_from',NULL),
  ('Donghia','purchased_from',NULL),
  ('Osborne & Little','purchased_from',NULL),
  ('Better Tex','purchased_from',NULL),
  ('Blinds To Go','purchased_from',NULL),
  ('Constella Tech AV','trade_account_open',NULL),
  ('Renson','trade_account_open','Pergola')
ON CONFLICT (name) DO NOTHING;

-- People
INSERT INTO public.people (name, role, notes) VALUES
  ('Giana Allen','principal','Decides'),
  ('Abe','assistant',NULL),
  ('Candida Smith','client',NULL),
  ('Kimberly Byrne','client_assistant','Handles client-side money + trade accounts'),
  ('Joy / A Townhouse Kitchen','trade','Kitchen; has a wallpaper hanger'),
  ('Paige','trade','Receives fabrics'),
  ('Shauna','trade','Holds France items + measurements'),
  ('Reaz','other','Role to confirm')
ON CONFLICT (name) DO NOTHING;

-- Example items (no money values; only inserted if no items exist yet)
DO $$
DECLARE
  v_kitchen uuid;
  v_master_bath uuid;
  v_living uuid;
  v_bedroom2 uuid;
  c_kitchen uuid;
  c_tile uuid;
  c_furniture uuid;
  c_drapery uuid;
  vendor_muretti uuid;
  vendor_artistic uuid;
  vendor_roche uuid;
  vendor_better uuid;
  p_giana uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.items) THEN
    SELECT id INTO v_kitchen FROM public.rooms WHERE name='Kitchen';
    SELECT id INTO v_master_bath FROM public.rooms WHERE name='Master Bathroom';
    SELECT id INTO v_living FROM public.rooms WHERE name='Living Room';
    SELECT id INTO v_bedroom2 FROM public.rooms WHERE name='Bedroom 2';
    SELECT id INTO c_kitchen FROM public.categories WHERE key='kitchen';
    SELECT id INTO c_tile FROM public.categories WHERE key='tile_stone';
    SELECT id INTO c_furniture FROM public.categories WHERE key='furniture';
    SELECT id INTO c_drapery FROM public.categories WHERE key='drapery';
    SELECT id INTO vendor_muretti FROM public.vendors WHERE name='Muretti';
    SELECT id INTO vendor_artistic FROM public.vendors WHERE name='Artistic Tile';
    SELECT id INTO vendor_roche FROM public.vendors WHERE name='Roche Bobois';
    SELECT id INTO vendor_better FROM public.vendors WHERE name='Better Tex';
    SELECT id INTO p_giana FROM public.people WHERE name='Giana Allen';

    INSERT INTO public.items (room_id, category_id, vendor_id, title, description, status, priority, ordered_by, logistics_location)
    VALUES
      (v_kitchen, c_kitchen, vendor_muretti, 'EXAMPLE: Kitchen cabinets', 'Placeholder seed item — replace with real data.', 'to_spec', 'high', p_giana, 'na'),
      (v_master_bath, c_tile, vendor_artistic, 'EXAMPLE: Master bath floor tile', 'Placeholder seed item — replace with real data.', 'to_order', 'normal', p_giana, 'na'),
      (v_living, c_furniture, vendor_roche, 'EXAMPLE: Living room sofa', 'Placeholder seed item — replace with real data.', 'ordered', 'normal', p_giana, 'france_ship'),
      (v_bedroom2, c_drapery, vendor_better, 'EXAMPLE: Bedroom 2 drapery panels', 'Placeholder seed item — replace with real data.', 'to_spec', 'asap', p_giana, 'na');
  END IF;
END $$;

-- =========================================================
-- 7. MIND MAP CLEANUP (existing seeded map only)
-- =========================================================

-- Delete the resolved "Vestibule vs Foyer" question node
DELETE FROM public.map_nodes WHERE id = '7876c02e-0eeb-4158-82ab-cc8c0930b702';

-- Replace "Standardize naming..." with "Use plan room names verbatim"
UPDATE public.map_nodes
   SET title = 'Use plan room names verbatim'
 WHERE id = 'd9c633ab-dfb9-41f6-acf4-13e80c83cfc7';

-- Delete empty "New node" children under Furniture (FF and E)
DELETE FROM public.map_nodes
 WHERE parent_id = '44478565-856b-41a0-ba80-ee34090f9611'
   AND title = 'New node';

-- Add Drapery branch under Schedules by Trade (parent 8f227d59)
DO $$
DECLARE
  schedules_parent uuid := '8f227d59-ec9f-472b-bea0-4f1a1854e870';
  map_uuid uuid := 'b7c766ab-f7e2-40c4-8178-906142ff923a';
  drapery_id uuid;
  av_id uuid;
  electrical_parent uuid := '94486cc9-bf6d-401a-a041-beb32c6acdd7';
  deferred_parent uuid := 'd693372d-bfbb-4eb1-bda3-fc3bf47f1a47';
  roof_id uuid;
BEGIN
  -- Drapery
  SELECT id INTO drapery_id FROM public.map_nodes
   WHERE parent_id = schedules_parent AND title = 'Drapery';
  IF drapery_id IS NULL THEN
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category)
    VALUES (map_uuid, schedules_parent, 'Drapery', 150, 'trade')
    RETURNING id INTO drapery_id;
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category) VALUES
      (map_uuid, drapery_id, 'Better Tex for two rooms', 10, 'trade'),
      (map_uuid, drapery_id, 'Blinds To Go', 20, 'trade'),
      (map_uuid, drapery_id, 'What goes where', 30, 'trade'),
      (map_uuid, drapery_id, 'Room by room', 40, 'trade'),
      (map_uuid, drapery_id, 'Lead time', 50, 'trade'),
      (map_uuid, drapery_id, 'Hardware', 60, 'trade');
  END IF;

  -- AV
  SELECT id INTO av_id FROM public.map_nodes
   WHERE parent_id = schedules_parent AND title = 'AV';
  IF av_id IS NULL THEN
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category)
    VALUES (map_uuid, schedules_parent, 'AV', 160, 'trade')
    RETURNING id INTO av_id;
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category) VALUES
      (map_uuid, av_id, 'Constella Tech AV', 10, 'trade'),
      (map_uuid, av_id, 'Climate control + lighting system', 20, 'trade'),
      (map_uuid, av_id, 'Internet box: which rooms?', 30, 'trade'),
      (map_uuid, av_id, 'WiFi + audio on deck', 40, 'trade');
  END IF;

  -- Replace Electrical placeholder children with the real list
  DELETE FROM public.map_nodes WHERE parent_id = electrical_parent;
  INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category) VALUES
    (map_uuid, electrical_parent, 'Specialized lighting schedule (MESH)', 10, 'trade'),
    (map_uuid, electrical_parent, 'Order fixtures that go with Constella Tech AV', 20, 'trade'),
    (map_uuid, electrical_parent, 'Chandeliers: exact placement', 30, 'trade'),
    (map_uuid, electrical_parent, 'Bathroom lights: to purchase', 40, 'trade'),
    (map_uuid, electrical_parent, 'Room by room schedule', 50, 'trade'),
    (map_uuid, electrical_parent, 'Switch locations', 60, 'trade');

  -- Populate Roof Deck node under Deferred
  SELECT id INTO roof_id FROM public.map_nodes
   WHERE parent_id = deferred_parent AND title = 'Roof Deck';
  IF roof_id IS NULL THEN
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category)
    VALUES (map_uuid, deferred_parent, 'Roof Deck', 100, 'deferred')
    RETURNING id INTO roof_id;
    INSERT INTO public.map_nodes (map_id, parent_id, title, sort_order, category) VALUES
      (map_uuid, roof_id, 'Budget includes all dunnage', 10, 'deferred'),
      (map_uuid, roof_id, 'Timeline', 20, 'deferred'),
      (map_uuid, roof_id, 'Renson Pergola: choose color + shades', 30, 'deferred'),
      (map_uuid, roof_id, 'Cabinets: finalize design', 40, 'deferred'),
      (map_uuid, roof_id, 'Furniture plan + layout', 50, 'deferred'),
      (map_uuid, roof_id, 'Gather dimensions of existing purchased furniture', 60, 'deferred'),
      (map_uuid, roof_id, 'Source grill', 70, 'deferred'),
      (map_uuid, roof_id, 'Source blocks', 80, 'deferred'),
      (map_uuid, roof_id, 'Source light fixtures', 90, 'deferred'),
      (map_uuid, roof_id, 'Source pots', 100, 'deferred'),
      (map_uuid, roof_id, 'Garden designer', 110, 'deferred');
  END IF;
END $$;
