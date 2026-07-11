
-- STAGE 1 — projects ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_select ON public.projects FOR SELECT USING (app_private.has_module_right('item','view'));
CREATE POLICY projects_insert ON public.projects FOR INSERT WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY projects_update ON public.projects FOR UPDATE USING (app_private.has_module_right('item','edit')) WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY projects_delete ON public.projects FOR DELETE USING (app_private.has_module_right('item','edit'));
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.projects (name, address)
SELECT 'Candida Smith', '8 West 19th Street, Floor 11, New York NY 10011'
WHERE NOT EXISTS (SELECT 1 FROM public.projects WHERE name = 'Candida Smith');

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
DO $$
DECLARE v_project uuid;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE name = 'Candida Smith' LIMIT 1;
  UPDATE public.rooms SET project_id = v_project WHERE project_id IS NULL;
  UPDATE public.items SET project_id = v_project WHERE project_id IS NULL;
END$$;
ALTER TABLE public.rooms ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.items ALTER COLUMN project_id SET NOT NULL;

-- STAGE 2 — products ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, brand text,
  width_in numeric, length_in numeric, height_in numeric, depth_in numeric,
  finish text, material text, sku text,
  default_vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_insert ON public.products;
DROP POLICY IF EXISTS products_update ON public.products;
DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT USING (app_private.has_module_right('item','view'));
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY products_update ON public.products FOR UPDATE USING (app_private.has_module_right('item','edit')) WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY products_delete ON public.products FOR DELETE USING (app_private.has_module_right('item','edit'));
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);
DO $$
DECLARE r RECORD; new_pid uuid;
BEGIN
  FOR r IN SELECT id, title, sku, vendor_id FROM public.items WHERE product_id IS NULL LOOP
    INSERT INTO public.products (name, sku, default_vendor_id)
    VALUES (COALESCE(NULLIF(r.title,''),'Untitled'), r.sku, r.vendor_id)
    RETURNING id INTO new_pid;
    UPDATE public.items SET product_id = new_pid WHERE id = r.id;
  END LOOP;
END$$;
ALTER TABLE public.items ALTER COLUMN product_id SET NOT NULL;

-- STAGE 3 — inventory_records, library_entries -------------------------
CREATE TABLE IF NOT EXISTS public.inventory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ownership text NOT NULL CHECK (ownership IN ('gad','client_owned')),
  location text,
  resale_status text CHECK (resale_status IN ('available','reserved','sold','listed')),
  listed_website boolean NOT NULL DEFAULT false,
  listed_chairish boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_records TO authenticated;
GRANT ALL ON public.inventory_records TO service_role;
ALTER TABLE public.inventory_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_records_select ON public.inventory_records;
DROP POLICY IF EXISTS inventory_records_insert ON public.inventory_records;
DROP POLICY IF EXISTS inventory_records_update ON public.inventory_records;
DROP POLICY IF EXISTS inventory_records_delete ON public.inventory_records;
CREATE POLICY inventory_records_select ON public.inventory_records FOR SELECT USING (app_private.has_module_right('inventory','view'));
CREATE POLICY inventory_records_insert ON public.inventory_records FOR INSERT WITH CHECK (app_private.has_module_right('inventory','edit'));
CREATE POLICY inventory_records_update ON public.inventory_records FOR UPDATE USING (app_private.has_module_right('inventory','edit')) WITH CHECK (app_private.has_module_right('inventory','edit'));
CREATE POLICY inventory_records_delete ON public.inventory_records FOR DELETE USING (app_private.has_module_right('inventory','edit'));
DROP TRIGGER IF EXISTS trg_inventory_records_updated_at ON public.inventory_records;
CREATE TRIGGER trg_inventory_records_updated_at BEFORE UPDATE ON public.inventory_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.library_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('workspace','project')),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  stock_on_hand text,
  price_per_unit numeric,
  price_unit text CHECK (price_unit IN ('sqft','yard','each')),
  source_contact text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE, DELETE ON public.library_entries TO authenticated;
REVOKE SELECT ON public.library_entries FROM authenticated;
GRANT SELECT (id, product_id, scope, project_id, room_id, stock_on_hand, price_unit, source_contact, notes, created_at, updated_at)
  ON public.library_entries TO authenticated;
GRANT ALL ON public.library_entries TO service_role;
ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS library_entries_select ON public.library_entries;
DROP POLICY IF EXISTS library_entries_insert ON public.library_entries;
DROP POLICY IF EXISTS library_entries_update ON public.library_entries;
DROP POLICY IF EXISTS library_entries_delete ON public.library_entries;
CREATE POLICY library_entries_select ON public.library_entries FOR SELECT USING (app_private.has_module_right('library','view'));
CREATE POLICY library_entries_insert ON public.library_entries FOR INSERT WITH CHECK (app_private.has_module_right('library','edit'));
CREATE POLICY library_entries_update ON public.library_entries FOR UPDATE USING (app_private.has_module_right('library','edit')) WITH CHECK (app_private.has_module_right('library','edit'));
CREATE POLICY library_entries_delete ON public.library_entries FOR DELETE USING (app_private.has_module_right('library','edit'));
DROP TRIGGER IF EXISTS trg_library_entries_updated_at ON public.library_entries;
CREATE TRIGGER trg_library_entries_updated_at BEFORE UPDATE ON public.library_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STAGE 4 — phases, payments, budgets, room targets, approvals ---------
CREATE TABLE IF NOT EXISTS public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL, sort_order numeric NOT NULL DEFAULT 0,
  axis text NOT NULL CHECK (axis IN ('construction','ffe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phases TO authenticated;
GRANT ALL ON public.phases TO service_role;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS phases_select ON public.phases;
DROP POLICY IF EXISTS phases_insert ON public.phases;
DROP POLICY IF EXISTS phases_update ON public.phases;
DROP POLICY IF EXISTS phases_delete ON public.phases;
CREATE POLICY phases_select ON public.phases FOR SELECT USING (app_private.has_module_right('budget','view'));
CREATE POLICY phases_insert ON public.phases FOR INSERT WITH CHECK (app_private.has_module_right('budget','edit'));
CREATE POLICY phases_update ON public.phases FOR UPDATE USING (app_private.has_module_right('budget','edit')) WITH CHECK (app_private.has_module_right('budget','edit'));
CREATE POLICY phases_delete ON public.phases FOR DELETE USING (app_private.has_module_right('budget','edit'));
DROP TRIGGER IF EXISTS trg_phases_updated_at ON public.phases;
CREATE TRIGGER trg_phases_updated_at BEFORE UPDATE ON public.phases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE v_project uuid;
BEGIN
  SELECT id INTO v_project FROM public.projects WHERE name = 'Candida Smith' LIMIT 1;
  IF v_project IS NOT NULL THEN
    INSERT INTO public.phases (project_id, name, sort_order, axis)
    SELECT v_project, x.name, x.sort_order, x.axis
    FROM (VALUES
      ('Demolition', 1::numeric, 'construction'),
      ('Rough-in', 2::numeric, 'construction'),
      ('Install', 3::numeric, 'construction'),
      ('FF&E', 1::numeric, 'ffe')
    ) AS x(name, sort_order, axis)
    WHERE NOT EXISTS (SELECT 1 FROM public.phases p WHERE p.project_id = v_project AND p.name = x.name AND p.axis = x.axis);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  amount numeric,
  direction text NOT NULL CHECK (direction IN ('client_to_gad','gad_to_vendor')),
  state text NOT NULL CHECK (state IN ('paid','due','reserved')),
  due_date date,
  phase_id uuid REFERENCES public.phases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE, DELETE ON public.payments TO authenticated;
REVOKE SELECT ON public.payments FROM authenticated;
GRANT SELECT (id, item_id, direction, state, due_date, phase_id, created_at, updated_at) ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_select ON public.payments;
DROP POLICY IF EXISTS payments_insert ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;
DROP POLICY IF EXISTS payments_delete ON public.payments;
CREATE POLICY payments_select ON public.payments FOR SELECT USING (app_private.has_module_right('cashflow','view'));
CREATE POLICY payments_insert ON public.payments FOR INSERT WITH CHECK (app_private.has_module_right('cashflow','edit'));
CREATE POLICY payments_update ON public.payments FOR UPDATE USING (app_private.has_module_right('cashflow','edit')) WITH CHECK (app_private.has_module_right('cashflow','edit'));
CREATE POLICY payments_delete ON public.payments FOR DELETE USING (app_private.has_module_right('cashflow','edit'));
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  construction_budget numeric, ffe_budget numeric,
  per_unit_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
REVOKE SELECT ON public.budgets FROM authenticated;
GRANT SELECT (id, project_id, created_at, updated_at) ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS budgets_select ON public.budgets;
DROP POLICY IF EXISTS budgets_insert ON public.budgets;
DROP POLICY IF EXISTS budgets_update ON public.budgets;
DROP POLICY IF EXISTS budgets_delete ON public.budgets;
CREATE POLICY budgets_select ON public.budgets FOR SELECT USING (app_private.has_module_right('budget','view'));
CREATE POLICY budgets_insert ON public.budgets FOR INSERT WITH CHECK (app_private.has_module_right('budget','edit'));
CREATE POLICY budgets_update ON public.budgets FOR UPDATE USING (app_private.has_module_right('budget','edit')) WITH CHECK (app_private.has_module_right('budget','edit'));
CREATE POLICY budgets_delete ON public.budgets FOR DELETE USING (app_private.has_module_right('budget','edit'));
DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- rooms target_amount
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS target_amount numeric;
REVOKE SELECT ON public.rooms FROM authenticated;
GRANT SELECT (id, name, sort_order, active, created_at, updated_at, project_id) ON public.rooms TO authenticated;

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  decided_by uuid REFERENCES public.people(id) ON DELETE SET NULL,
  decided_at timestamptz,
  mode text NOT NULL CHECK (mode IN ('dashboard','verbal_logged','declined')),
  logged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_select ON public.approvals;
DROP POLICY IF EXISTS approvals_insert ON public.approvals;
DROP POLICY IF EXISTS approvals_update ON public.approvals;
DROP POLICY IF EXISTS approvals_delete ON public.approvals;
CREATE POLICY approvals_select ON public.approvals FOR SELECT USING (app_private.has_module_right('approvals','view'));
CREATE POLICY approvals_insert ON public.approvals FOR INSERT WITH CHECK (app_private.has_module_right('approvals','edit'));
CREATE POLICY approvals_update ON public.approvals FOR UPDATE USING (app_private.has_module_right('approvals','edit')) WITH CHECK (app_private.has_module_right('approvals','edit'));
CREATE POLICY approvals_delete ON public.approvals FOR DELETE USING (app_private.has_module_right('approvals','edit'));

-- STAGE 5 — documents & media -----------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('contract','gc_contract','permit','building_paperwork','other')),
  related_party uuid REFERENCES public.people(id) ON DELETE SET NULL,
  title text NOT NULL, file_url text, expires_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_update ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT USING (app_private.has_module_right('library','view'));
CREATE POLICY documents_insert ON public.documents FOR INSERT WITH CHECK (app_private.has_module_right('library','edit'));
CREATE POLICY documents_update ON public.documents FOR UPDATE USING (app_private.has_module_right('library','edit')) WITH CHECK (app_private.has_module_right('library','edit'));
CREATE POLICY documents_delete ON public.documents FOR DELETE USING (app_private.has_module_right('library','edit'));
DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  lookbook_section text,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('photo','reference','lookbook')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS media_select ON public.media;
DROP POLICY IF EXISTS media_insert ON public.media;
DROP POLICY IF EXISTS media_update ON public.media;
DROP POLICY IF EXISTS media_delete ON public.media;
CREATE POLICY media_select ON public.media FOR SELECT USING (app_private.has_module_right('lookbook','view'));
CREATE POLICY media_insert ON public.media FOR INSERT WITH CHECK (app_private.has_module_right('lookbook','edit'));
CREATE POLICY media_update ON public.media FOR UPDATE USING (app_private.has_module_right('lookbook','edit')) WITH CHECK (app_private.has_module_right('lookbook','edit'));
CREATE POLICY media_delete ON public.media FOR DELETE USING (app_private.has_module_right('lookbook','edit'));

-- STAGE 6 — money definer views ---------------------------------------
DROP VIEW IF EXISTS public.payments_visible;
CREATE VIEW public.payments_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT p.id, p.item_id, p.direction, p.state, p.due_date, p.phase_id, p.created_at, p.updated_at,
  CASE
    WHEN p.direction = 'gad_to_vendor' THEN CASE WHEN app_private.current_money_visibility() = 'full' THEN p.amount ELSE NULL END
    WHEN p.direction = 'client_to_gad' THEN CASE WHEN app_private.current_money_visibility() IN ('full','client_price') THEN p.amount ELSE NULL END
    ELSE NULL
  END AS amount
FROM public.payments p
WHERE app_private.has_module_right('cashflow','view');
ALTER VIEW public.payments_visible OWNER TO postgres;
GRANT SELECT ON public.payments_visible TO authenticated;

DROP VIEW IF EXISTS public.budgets_visible;
CREATE VIEW public.budgets_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT b.id, b.project_id, b.created_at, b.updated_at,
  CASE WHEN app_private.current_money_visibility() = 'full' THEN b.construction_budget ELSE NULL END AS construction_budget,
  CASE WHEN app_private.current_money_visibility() IN ('full','client_price') THEN b.ffe_budget ELSE NULL END AS ffe_budget,
  CASE WHEN app_private.current_money_visibility() = 'full' THEN b.per_unit_rates ELSE NULL END AS per_unit_rates
FROM public.budgets b
WHERE app_private.has_module_right('budget','view');
ALTER VIEW public.budgets_visible OWNER TO postgres;
GRANT SELECT ON public.budgets_visible TO authenticated;

DROP VIEW IF EXISTS public.library_entries_visible;
CREATE VIEW public.library_entries_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT l.id, l.product_id, l.scope, l.project_id, l.room_id, l.stock_on_hand,
  l.price_unit, l.source_contact, l.notes, l.created_at, l.updated_at,
  CASE WHEN app_private.current_money_visibility() = 'full' THEN l.price_per_unit ELSE NULL END AS price_per_unit
FROM public.library_entries l
WHERE app_private.has_module_right('library','view');
ALTER VIEW public.library_entries_visible OWNER TO postgres;
GRANT SELECT ON public.library_entries_visible TO authenticated;

DROP VIEW IF EXISTS public.room_targets_visible;
CREATE VIEW public.room_targets_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT r.id AS room_id,
  CASE WHEN app_private.current_money_visibility() IN ('full','client_price') THEN r.target_amount ELSE NULL END AS target_amount
FROM public.rooms r;
ALTER VIEW public.room_targets_visible OWNER TO postgres;
GRANT SELECT ON public.room_targets_visible TO authenticated;

-- STAGE 7 — verification --------------------------------------------
DO $$
DECLARE
  n_rooms_missing int; n_items_missing int;
  n_products int; n_items int; n_items_no_product int;
  bad_priv int := 0;
BEGIN
  SELECT count(*) INTO n_rooms_missing FROM public.rooms WHERE project_id IS NULL;
  SELECT count(*) INTO n_items_missing FROM public.items WHERE project_id IS NULL;
  SELECT count(*) INTO n_products FROM public.products;
  SELECT count(*) INTO n_items FROM public.items;
  SELECT count(*) INTO n_items_no_product FROM public.items WHERE product_id IS NULL;
  IF has_column_privilege('authenticated','public.payments','amount','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  IF has_column_privilege('authenticated','public.budgets','construction_budget','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  IF has_column_privilege('authenticated','public.budgets','ffe_budget','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  IF has_column_privilege('authenticated','public.budgets','per_unit_rates','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  IF has_column_privilege('authenticated','public.rooms','target_amount','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  IF has_column_privilege('authenticated','public.library_entries','price_per_unit','SELECT') THEN bad_priv := bad_priv + 1; END IF;
  RAISE NOTICE 'rooms_missing=% items_missing=% products=% items=% items_no_product=% money_leaks=%',
    n_rooms_missing, n_items_missing, n_products, n_items, n_items_no_product, bad_priv;
  IF n_rooms_missing > 0 OR n_items_missing > 0 OR n_items_no_product > 0 OR bad_priv > 0 THEN
    RAISE EXCEPTION 'M1 pass B verification failed (rooms_missing=% items_missing=% items_no_product=% money_leaks=%)',
      n_rooms_missing, n_items_missing, n_items_no_product, bad_priv;
  END IF;
END$$;
