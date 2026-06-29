
-- Schema
CREATE TABLE public.maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.map_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.map_nodes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  status text,
  priority text,
  color text,
  sort_order numeric NOT NULL DEFAULT 0,
  collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_map_nodes_parent_id ON public.map_nodes(parent_id);
CREATE INDEX idx_map_nodes_map_id ON public.map_nodes(map_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER map_nodes_set_updated_at
  BEFORE UPDATE ON public.map_nodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grants (v1 shared workspace, anon allowed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maps TO anon, authenticated;
GRANT ALL ON public.maps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_nodes TO anon, authenticated;
GRANT ALL ON public.map_nodes TO service_role;

-- RLS enabled with permissive v1 policies (single shared workspace, no real client/financial data)
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v1 anyone can read maps" ON public.maps FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert maps" ON public.maps FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update maps" ON public.maps FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete maps" ON public.maps FOR DELETE USING (true);

CREATE POLICY "v1 anyone can read map_nodes" ON public.map_nodes FOR SELECT USING (true);
CREATE POLICY "v1 anyone can insert map_nodes" ON public.map_nodes FOR INSERT WITH CHECK (true);
CREATE POLICY "v1 anyone can update map_nodes" ON public.map_nodes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "v1 anyone can delete map_nodes" ON public.map_nodes FOR DELETE USING (true);

-- Seed helper (temporary)
CREATE OR REPLACE FUNCTION public._seed_add(p_map uuid, p_parent uuid, p_title text, p_category text, p_priority text, p_order numeric)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v uuid;
BEGIN
  INSERT INTO public.map_nodes(map_id, parent_id, title, category, priority, sort_order)
  VALUES (p_map, p_parent, p_title, p_category, p_priority, p_order)
  RETURNING id INTO v;
  RETURN v;
END;
$$;

-- Seed data (idempotent: only runs when the map does not yet exist)
DO $seed$
DECLARE
  v_map uuid;
  v_root uuid;
  v_rooms uuid;
  v_sched uuid;
  v_plumb uuid; v_elec uuid; v_finish uuid; v_tile uuid; v_floor uuid;
  v_paint uuid; v_wall uuid; v_door uuid; v_hard uuid; v_uphol uuid;
  v_furn uuid;
  v_kit uuid;
  v_log uuid;
  v_bud uuid;
  v_const uuid;
  v_data uuid; v_data_item uuid;
  v_people uuid;
  v_road uuid;
  v_def uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.maps WHERE name = 'GAD App: Functional View (Needs Expression)') THEN
    RETURN;
  END IF;

  INSERT INTO public.maps(name) VALUES ('GAD App: Functional View (Needs Expression)') RETURNING id INTO v_map;

  -- Root
  v_root := public._seed_add(v_map, NULL, 'The Interface (Dashboard)', 'root', NULL, 0);

  -- Rooms
  v_rooms := public._seed_add(v_map, v_root, 'Rooms (Canonical List)', 'rooms', NULL, 100);
  PERFORM public._seed_add(v_map, v_rooms, 'Vestibule', 'rooms', NULL, 100);
  PERFORM public._seed_add(v_map, v_rooms, 'Foyer', 'rooms', NULL, 200);
  PERFORM public._seed_add(v_map, v_rooms, 'Powder Room', 'rooms', NULL, 300);
  PERFORM public._seed_add(v_map, v_rooms, 'Living Room', 'rooms', NULL, 400);
  PERFORM public._seed_add(v_map, v_rooms, 'Upper Hallway', 'rooms', NULL, 500);
  PERFORM public._seed_add(v_map, v_rooms, 'Hallway', 'rooms', NULL, 600);
  PERFORM public._seed_add(v_map, v_rooms, 'Kitchen', 'rooms', NULL, 700);
  PERFORM public._seed_add(v_map, v_rooms, 'Bathroom 2', 'rooms', NULL, 800);
  PERFORM public._seed_add(v_map, v_rooms, 'Master Bathroom', 'rooms', NULL, 900);
  PERFORM public._seed_add(v_map, v_rooms, 'Master Bedroom', 'rooms', NULL, 1000);
  PERFORM public._seed_add(v_map, v_rooms, 'Bedroom 2', 'rooms', NULL, 1100);
  PERFORM public._seed_add(v_map, v_rooms, 'Bedroom 3', 'rooms', NULL, 1200);
  PERFORM public._seed_add(v_map, v_rooms, 'Laundry Room', 'rooms', NULL, 1300);
  PERFORM public._seed_add(v_map, v_rooms, 'Mechanical Room', 'rooms', NULL, 1400);
  PERFORM public._seed_add(v_map, v_rooms, 'Open: Dining Room status', 'rooms', NULL, 1500);
  PERFORM public._seed_add(v_map, v_rooms, 'Open: Walk-in Closets (Muretti)', 'rooms', NULL, 1600);
  PERFORM public._seed_add(v_map, v_rooms, 'Open: Vestibule vs Foyer (same zone?)', 'rooms', NULL, 1700);
  PERFORM public._seed_add(v_map, v_rooms, 'Standardize naming (Bedroom 2 = Second Bedroom)', 'rooms', NULL, 1800);
  PERFORM public._seed_add(v_map, v_rooms, 'Roof Deck: deferred (Phase 2)', 'rooms', NULL, 1900);

  -- Schedules by Trade
  v_sched := public._seed_add(v_map, v_root, 'Schedules by Trade', 'schedule', NULL, 200);

  v_plumb := public._seed_add(v_map, v_sched, 'Plumbing', 'trade', NULL, 100);
  PERFORM public._seed_add(v_map, v_plumb, 'Wet rooms: Bathroom 2, Powder Room, Kitchen, Laundry, Master Bath', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_plumb, 'Ordered / to order / to spec', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_plumb, 'Account info + SKU + where bought', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_plumb, 'Vendor contact info', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_plumb, 'Delivery address', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_plumb, 'Ordered by (Reaz or Giana)', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_plumb, 'Fixture design details + placement', 'field', NULL, 700);
  PERFORM public._seed_add(v_map, v_plumb, 'Room', 'field', NULL, 800);

  v_elec := public._seed_add(v_map, v_sched, 'Electrical (NEW, to expand with Giana)', 'trade', NULL, 200);
  PERFORM public._seed_add(v_map, v_elec, 'Placeholder: full requirements to be detailed', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_elec, 'Switch locations (coordinate with Joy for kitchen)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_elec, 'Recessed lighting (MESH, whole house)', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_elec, 'Chandeliers / fixtures count per room', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_elec, 'HVAC related power (RSS sub)', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_elec, 'Per room', 'field', NULL, 600);

  v_finish := public._seed_add(v_map, v_sched, 'Finish Schedule', 'trade', NULL, 300);
  PERFORM public._seed_add(v_map, v_finish, 'Per room: room info + walls + finishes', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_finish, 'Room dimensions + ceiling height + wall schedule', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_finish, 'Aggregates: tile, floor, paint, wallpaper', 'field', NULL, 300);

  v_tile := public._seed_add(v_map, v_sched, 'Tile and Stone', 'trade', NULL, 400);
  PERFORM public._seed_add(v_map, v_tile, 'Tile per room', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_tile, 'Placement: where each tile goes in the room', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_tile, 'Storage location + who shipped', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_tile, 'Vendor + fabricator names', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_tile, 'Threshold design', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_tile, 'Per room schedule for coordination', 'field', NULL, 600);

  v_floor := public._seed_add(v_map, v_sched, 'Floor', 'trade', NULL, 500);
  PERFORM public._seed_add(v_map, v_floor, 'Floor design', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_floor, 'Installer', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_floor, 'Price per sq ft (confirm with Reaz)', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_floor, 'Arrival date', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_floor, 'Threshold design', 'field', NULL, 500);

  v_paint := public._seed_add(v_map, v_sched, 'Paint', 'trade', NULL, 600);
  PERFORM public._seed_add(v_map, v_paint, 'Per room', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_paint, 'Color', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_paint, 'Finish (eggshell / semi gloss / etc.)', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_paint, 'Surfaces: walls / baseboards / ceiling (separate)', 'field', NULL, 400);

  v_wall := public._seed_add(v_map, v_sched, 'Wallpaper', 'trade', NULL, 700);
  PERFORM public._seed_add(v_map, v_wall, 'Rooms: Powder, Bathroom 2, Bedroom 2, Kitchen panel, Master Bedroom, Foyer (pre master)', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_wall, 'Product / what', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_wall, 'Company: GAD price / client price', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_wall, 'Quantity to order', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_wall, 'Lead time', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_wall, 'Shipping address', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_wall, 'Seller contact info', 'field', NULL, 700);
  PERFORM public._seed_add(v_map, v_wall, 'Who is hanging', 'field', NULL, 800);
  PERFORM public._seed_add(v_map, v_wall, 'Drawings ASAP: Bedroom 2 + Bedroom 3 (Joy has a person)', 'action', 'asap', 900);

  v_door := public._seed_add(v_map, v_sched, 'Door', 'trade', NULL, 800);
  PERFORM public._seed_add(v_map, v_door, 'Harmon hinge door (MESH designs CAD); who makes?', 'action', 'asap', 100);
  PERFORM public._seed_add(v_map, v_door, 'Swinging door to kitchen: who designs + makes?', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_door, 'Fire door (kitchen): keep, build a frame', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_door, 'Pantry door: needed', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_door, 'Elevator door: paint option', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_door, 'Owner: Giana sources + designs all except Harmon CAD', 'field', NULL, 600);

  v_hard := public._seed_add(v_map, v_sched, 'Hardware', 'trade', NULL, 900);
  PERFORM public._seed_add(v_map, v_hard, 'All rooms', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_hard, 'Buying from', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_hard, 'Price', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_hard, 'Delivery location', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_hard, 'Finish', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_hard, 'Contractor schedule', 'field', NULL, 600);

  v_uphol := public._seed_add(v_map, v_sched, 'Upholstery', 'trade', NULL, 1000);
  PERFORM public._seed_add(v_map, v_uphol, 'Better Tex: finalize invoice', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_uphol, 'Master Bedroom panels: Blinds To Go vs Better Tex (decide)', 'field', NULL, 200);

  -- Furniture
  v_furn := public._seed_add(v_map, v_root, 'Furniture (FF and E)', 'furniture', NULL, 300);
  PERFORM public._seed_add(v_map, v_furn, 'Per room: what goes where', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_furn, 'Bought vs sold / invoice history (e.g., 50% down)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_furn, 'Purchased from whom', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_furn, 'Storage: name + address (install day coordination)', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_furn, 'Original budget spec', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_furn, 'What is needed', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_furn, 'Trade account name', 'field', NULL, 700);
  PERFORM public._seed_add(v_map, v_furn, 'Lead time', 'field', NULL, 800);
  PERFORM public._seed_add(v_map, v_furn, 'GAD pricing / client pricing', 'field', NULL, 900);
  PERFORM public._seed_add(v_map, v_furn, 'Container: where + who', 'field', NULL, 1000);
  PERFORM public._seed_add(v_map, v_furn, 'Custom bed for Bedroom 2 (COM lead time)', 'field', NULL, 1100);
  PERFORM public._seed_add(v_map, v_furn, 'Source fabric for the bed', 'field', NULL, 1200);

  -- Kitchen
  v_kit := public._seed_add(v_map, v_root, 'Kitchen (GAD scope; Joy handles the rest)', 'kitchen', NULL, 400);
  PERFORM public._seed_add(v_map, v_kit, 'Chandeliers x3', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_kit, 'Doors (pantry, swinging, fire door frame)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_kit, 'Order sinks + faucets + hardware', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_kit, 'Confirm island sink size', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_kit, 'Slab stone from Artistic Tile', 'action', 'asap', 500);
  PERFORM public._seed_add(v_map, v_kit, 'Hardware count (handles, etc.)', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_kit, 'Analyze contract (not using high gloss)', 'field', NULL, 700);

  -- Logistics
  v_log := public._seed_add(v_map, v_root, 'Logistics', 'logistics', NULL, 500);
  PERFORM public._seed_add(v_map, v_log, 'When / Who', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_log, 'Warehouses (name + address)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_log, 'Phone numbers', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_log, 'Storage volume / cost', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_log, 'Trucking quotes', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_log, 'Container: France > Mississippi > NY', 'field', NULL, 600);

  -- Budget
  v_bud := public._seed_add(v_map, v_root, 'Budget', 'budget', NULL, 600);
  PERFORM public._seed_add(v_map, v_bud, 'Overall budget, kept up to date', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_bud, 'GAD price vs client price (markup)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_bud, 'Invoice / AR history per item', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_bud, 'Roof Deck budget: signed by Candida (deferred)', 'field', NULL, 400);

  -- Construction Coordination
  v_const := public._seed_add(v_map, v_root, 'Construction Coordination', 'coordination', NULL, 700);
  PERFORM public._seed_add(v_map, v_const, 'Per room contractor sequencing schedule', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_const, 'Cross trade dependencies (tile > stone > cabinets, etc.)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_const, 'Deadlines + missing decision flags', 'field', NULL, 300);

  -- Common Data Model
  v_data := public._seed_add(v_map, v_root, 'Common Data Model (App Engine)', 'data_model', NULL, 800);
  v_data_item := public._seed_add(v_map, v_data, 'One shared item object', 'data_model', NULL, 100);
  PERFORM public._seed_add(v_map, v_data_item, 'Identity: room, category, description', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_data_item, 'Sourcing: vendor, trade account, contact, SKU, ordered by', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_data_item, 'Status: status, qty needed/ordered, lead time', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_data_item, 'Money: GAD cost, client price, invoice history', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_data_item, 'Logistics: storage (name + address), delivery address', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_data_item, 'Design: placement/details, installer', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_data, 'Filtered views per schedule', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_data, 'Distinct views (different columns): Paint, Door', 'field', NULL, 300);

  -- People / Roster
  v_people := public._seed_add(v_map, v_root, 'People / Roster (open: to confirm)', 'roster', NULL, 900);
  PERFORM public._seed_add(v_map, v_people, 'Giana Allen: Principal, decides', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_people, 'Assistant: Abe / Obaye (same person?)', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_people, 'Reaz: role to confirm (places orders; floor price per sq ft contact)', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_people, 'Paige: receives + confirms fabrics', 'field', NULL, 400);
  PERFORM public._seed_add(v_map, v_people, 'Joy: A Townhouse Kitchen (kitchen; has wallpaper hanger)', 'field', NULL, 500);
  PERFORM public._seed_add(v_map, v_people, 'Shauna: holds France items + measurements', 'field', NULL, 600);
  PERFORM public._seed_add(v_map, v_people, 'ACTION: get nominative roster + roles', 'action', NULL, 700);

  -- Build Roadmap
  v_road := public._seed_add(v_map, v_root, 'Build Roadmap', 'roadmap', NULL, 1000);
  PERFORM public._seed_add(v_map, v_road, 'WE ARE HERE: Needs Expression', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_road, '1. Specs', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_road, '2. Prototype + Database', 'field', NULL, 300);
  PERFORM public._seed_add(v_map, v_road, '3. Deployment', 'field', NULL, 400);

  -- Deferred
  v_def := public._seed_add(v_map, v_root, 'Deferred (Phase 2)', 'deferred', NULL, 1100);
  PERFORM public._seed_add(v_map, v_def, 'Roof Deck schedule (pending apartment sign off)', 'field', NULL, 100);
  PERFORM public._seed_add(v_map, v_def, 'Roof Deck floor layout', 'field', NULL, 200);
  PERFORM public._seed_add(v_map, v_def, 'Roof Deck signed budget (Candida / Dida)', 'field', NULL, 300);
END
$seed$;

DROP FUNCTION public._seed_add(uuid, uuid, text, text, text, numeric);
