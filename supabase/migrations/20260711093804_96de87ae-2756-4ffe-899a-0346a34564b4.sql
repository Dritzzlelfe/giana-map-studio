
-- ============================================================
-- M1 Pass A — Auth, roles, profiles, RLS foundation
-- Idempotent: safe to re-run.
-- ============================================================

-- ----- 1. TABLES -----

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  module_rights jsonb NOT NULL DEFAULT '{}'::jsonb,
  money_visibility text NOT NULL DEFAULT 'none'
    CHECK (money_visibility IN ('full','client_price','none')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_id_idx ON public.profiles(role_id);

-- updated_at triggers (reuse existing set_updated_at)
DROP TRIGGER IF EXISTS roles_set_updated_at ON public.roles;
CREATE TRIGGER roles_set_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----- 2. GRANTS: revoke anon everywhere, grant authenticated -----

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', r.tablename);
  END LOOP;
END $$;

GRANT SELECT ON public.roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Existing data tables: grant to authenticated (RLS filters). service_role always full.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_nodes TO authenticated;
GRANT ALL ON public.rooms, public.categories, public.vendors, public.people,
             public.maps, public.map_nodes TO service_role;

-- Items: column-scoped. Money columns are NOT readable directly.
REVOKE ALL ON public.items FROM authenticated;
GRANT SELECT (
  id, room_id, category_id, vendor_id, title, description, sku, design_placement,
  qty_needed, qty_ordered, status, priority, ordered_by, installer, lead_time,
  delivery_address, delivery_date, storage_name, storage_address, logistics_location,
  option_source, client_paid_gad, gad_paid_vendor, created_at, updated_at
) ON public.items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;

-- ----- 3. HELPER FUNCTIONS (SECURITY DEFINER) -----

CREATE OR REPLACE FUNCTION public.current_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.key
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid()
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_money_visibility()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(r.money_visibility, 'none')
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid()
   LIMIT 1
$$;

-- level: 'view' or 'edit'. 'edit' implies 'view'.
CREATE OR REPLACE FUNCTION public.has_module_right(_module text, _level text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_right text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT (r.module_rights ->> _module) INTO v_right
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid();
  IF v_right IS NULL THEN RETURN false; END IF;
  IF _level = 'view'  THEN RETURN v_right IN ('view','edit'); END IF;
  IF _level = 'edit'  THEN RETURN v_right = 'edit'; END IF;
  RETURN false;
END $$;

-- Convenience for admin checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_role_key() IN ('owner','super_admin','admin')
$$;

-- ----- 4. SEED SYSTEM ROLES -----

WITH defs(key, label, rights, money) AS (
  VALUES
    ('owner','Owner', jsonb_build_object(
      'matrix','edit','room','edit','schedule','edit','item','edit','budget','edit',
      'cashflow','edit','logistics','edit','library','edit','inventory','edit',
      'lookbook','edit','intake','edit','ai','edit','scheduling','edit',
      'approvals','edit','people_vendors','edit','admin','edit'), 'full'),
    ('super_admin','Super admin', jsonb_build_object(
      'matrix','edit','room','edit','schedule','edit','item','edit','budget','edit',
      'cashflow','edit','logistics','edit','library','edit','inventory','edit',
      'lookbook','edit','intake','edit','ai','edit','scheduling','edit',
      'approvals','edit','people_vendors','edit','admin','edit'), 'full'),
    ('admin','Admin', jsonb_build_object(
      'matrix','edit','room','edit','schedule','edit','item','edit','budget','edit',
      'cashflow','edit','logistics','edit','library','edit','inventory','edit',
      'lookbook','edit','intake','edit','ai','edit','scheduling','edit',
      'approvals','edit','people_vendors','edit','admin','edit'), 'full'),
    ('team','Team', jsonb_build_object(
      'matrix','edit','room','edit','schedule','edit','item','edit','budget','view',
      'cashflow','view','logistics','edit','library','edit','inventory','edit',
      'lookbook','edit','intake','edit','ai','edit','scheduling','edit',
      'approvals','edit','people_vendors','edit','admin','none'), 'full'),
    ('contractor','Contractor', jsonb_build_object(
      'matrix','none','room','view','schedule','view','item','view','budget','none',
      'cashflow','none','logistics','none','library','none','inventory','none',
      'lookbook','none','intake','none','ai','none','scheduling','view',
      'approvals','none','people_vendors','none','admin','none'), 'none'),
    ('client','Client', jsonb_build_object(
      'matrix','view','room','view','schedule','none','item','view','budget','none',
      'cashflow','none','logistics','none','library','none','inventory','none',
      'lookbook','view','intake','none','ai','none','scheduling','view',
      'approvals','view','people_vendors','none','admin','none'), 'client_price'),
    ('client_assistant','Client assistant', jsonb_build_object(
      'matrix','view','room','view','schedule','none','item','view','budget','view',
      'cashflow','view','logistics','none','library','none','inventory','none',
      'lookbook','view','intake','none','ai','none','scheduling','view',
      'approvals','view','people_vendors','none','admin','none'), 'client_price')
)
INSERT INTO public.roles (key, label, is_system, module_rights, money_visibility)
SELECT key, label, true, rights, money FROM defs
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      is_system = true,
      module_rights = EXCLUDED.module_rights,
      money_visibility = EXCLUDED.money_visibility;

-- ----- 5. PROFILE AUTO-CREATE + FIRST-OWNER BOOTSTRAP -----

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_role uuid;
  v_owner_exists boolean;
  v_assign_role uuid := NULL;
BEGIN
  SELECT id INTO v_owner_role FROM public.roles WHERE key = 'owner' LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE role_id = v_owner_role
  ) INTO v_owner_exists;

  IF (NOT v_owner_exists) OR LOWER(NEW.email) = 'g@gianaallendesign.com' THEN
    v_assign_role := v_owner_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    v_assign_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role_id = COALESCE(public.profiles.role_id, EXCLUDED.role_id);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: create profiles for existing auth users, bootstrap owner if none.
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
 WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- If no owner exists yet, promote the earliest user (and g@gianaallendesign.com if present).
DO $$
DECLARE
  v_owner_role uuid;
  v_target uuid;
BEGIN
  SELECT id INTO v_owner_role FROM public.roles WHERE key = 'owner';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role_id = v_owner_role) THEN
    SELECT p.id INTO v_target
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
     ORDER BY (LOWER(u.email) = 'g@gianaallendesign.com') DESC, u.created_at ASC
     LIMIT 1;
    IF v_target IS NOT NULL THEN
      UPDATE public.profiles SET role_id = v_owner_role WHERE id = v_target;
    END IF;
  END IF;
END $$;

-- ----- 6. RLS: ENABLE + REPLACE POLICIES -----

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_nodes ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on these tables, then recreate.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('roles','profiles','rooms','categories','vendors','people','items','maps','map_nodes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- roles: everyone signed-in reads. Admins write. System roles cannot be deleted.
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY roles_delete ON public.roles FOR DELETE TO authenticated USING (public.is_admin() AND NOT is_system);

-- profiles: user reads/updates own; admins read/update all; admins also insert.
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    -- Non-admins cannot change their own role
    public.is_admin() OR (id = auth.uid() AND role_id IS NOT DISTINCT FROM (
      SELECT role_id FROM public.profiles WHERE id = auth.uid()
    ))
  );
CREATE POLICY profiles_insert_admin ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- Helper macro-ish: create four policies for a table with a given module key.
-- We do this inline per table since Postgres has no macro.

-- rooms → module 'room'
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated USING (public.has_module_right('room','view'));
CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_module_right('room','edit'));
CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO authenticated USING (public.has_module_right('room','edit')) WITH CHECK (public.has_module_right('room','edit'));
CREATE POLICY rooms_delete ON public.rooms FOR DELETE TO authenticated USING (public.has_module_right('room','edit'));

-- categories → module 'schedule'
CREATE POLICY categories_select ON public.categories FOR SELECT TO authenticated USING (public.has_module_right('schedule','view') OR public.has_module_right('item','view') OR public.has_module_right('room','view'));
CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_module_right('schedule','edit'));
CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated USING (public.has_module_right('schedule','edit')) WITH CHECK (public.has_module_right('schedule','edit'));
CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated USING (public.has_module_right('schedule','edit'));

-- vendors → module 'people_vendors' (also readable by anyone who can view items)
CREATE POLICY vendors_select ON public.vendors FOR SELECT TO authenticated USING (public.has_module_right('people_vendors','view') OR public.has_module_right('item','view'));
CREATE POLICY vendors_insert ON public.vendors FOR INSERT TO authenticated WITH CHECK (public.has_module_right('people_vendors','edit'));
CREATE POLICY vendors_update ON public.vendors FOR UPDATE TO authenticated USING (public.has_module_right('people_vendors','edit')) WITH CHECK (public.has_module_right('people_vendors','edit'));
CREATE POLICY vendors_delete ON public.vendors FOR DELETE TO authenticated USING (public.has_module_right('people_vendors','edit'));

-- people → module 'people_vendors' (also readable by item viewers)
CREATE POLICY people_select ON public.people FOR SELECT TO authenticated USING (public.has_module_right('people_vendors','view') OR public.has_module_right('item','view'));
CREATE POLICY people_insert ON public.people FOR INSERT TO authenticated WITH CHECK (public.has_module_right('people_vendors','edit'));
CREATE POLICY people_update ON public.people FOR UPDATE TO authenticated USING (public.has_module_right('people_vendors','edit')) WITH CHECK (public.has_module_right('people_vendors','edit'));
CREATE POLICY people_delete ON public.people FOR DELETE TO authenticated USING (public.has_module_right('people_vendors','edit'));

-- items → module 'item'
CREATE POLICY items_select ON public.items FOR SELECT TO authenticated USING (public.has_module_right('item','view'));
CREATE POLICY items_insert ON public.items FOR INSERT TO authenticated WITH CHECK (public.has_module_right('item','edit'));
CREATE POLICY items_update ON public.items FOR UPDATE TO authenticated USING (public.has_module_right('item','edit')) WITH CHECK (public.has_module_right('item','edit'));
CREATE POLICY items_delete ON public.items FOR DELETE TO authenticated USING (public.has_module_right('item','edit'));

-- maps + map_nodes → module 'matrix'
CREATE POLICY maps_select ON public.maps FOR SELECT TO authenticated USING (public.has_module_right('matrix','view'));
CREATE POLICY maps_insert ON public.maps FOR INSERT TO authenticated WITH CHECK (public.has_module_right('matrix','edit'));
CREATE POLICY maps_update ON public.maps FOR UPDATE TO authenticated USING (public.has_module_right('matrix','edit')) WITH CHECK (public.has_module_right('matrix','edit'));
CREATE POLICY maps_delete ON public.maps FOR DELETE TO authenticated USING (public.has_module_right('matrix','edit'));

CREATE POLICY map_nodes_select ON public.map_nodes FOR SELECT TO authenticated USING (public.has_module_right('matrix','view'));
CREATE POLICY map_nodes_insert ON public.map_nodes FOR INSERT TO authenticated WITH CHECK (public.has_module_right('matrix','edit'));
CREATE POLICY map_nodes_update ON public.map_nodes FOR UPDATE TO authenticated USING (public.has_module_right('matrix','edit')) WITH CHECK (public.has_module_right('matrix','edit'));
CREATE POLICY map_nodes_delete ON public.map_nodes FOR DELETE TO authenticated USING (public.has_module_right('matrix','edit'));

-- ----- 7. MONEY-COLUMN VIEW + WRITE ENFORCEMENT -----

CREATE OR REPLACE VIEW public.items_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  i.id, i.room_id, i.category_id, i.vendor_id, i.title, i.description, i.sku,
  i.design_placement, i.qty_needed, i.qty_ordered, i.status, i.priority,
  i.ordered_by, i.installer, i.lead_time, i.delivery_address, i.delivery_date,
  i.storage_name, i.storage_address, i.logistics_location, i.option_source,
  i.client_paid_gad, i.gad_paid_vendor,
  CASE WHEN public.current_money_visibility() = 'full'
       THEN i.gad_cost ELSE NULL END AS gad_cost,
  CASE WHEN public.current_money_visibility() IN ('full','client_price')
       THEN i.client_price ELSE NULL END AS client_price,
  CASE WHEN public.current_money_visibility() = 'full'
       THEN i.balance_due_on_delivery ELSE NULL END AS balance_due_on_delivery,
  i.created_at, i.updated_at
FROM public.items i
WHERE public.has_module_right('item','view');

REVOKE ALL ON public.items_visible FROM PUBLIC, anon;
GRANT SELECT ON public.items_visible TO authenticated;
GRANT ALL ON public.items_visible TO service_role;

-- Enforce money-write permission by trigger.
CREATE OR REPLACE FUNCTION public.enforce_money_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vis text := public.current_money_visibility();
BEGIN
  -- service_role bypasses RLS but still runs triggers; skip enforcement for it.
  IF current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_vis = 'full' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.gad_cost IS NOT NULL OR NEW.balance_due_on_delivery IS NOT NULL THEN
      RAISE EXCEPTION 'Not permitted to set cost fields';
    END IF;
    IF v_vis <> 'client_price' AND NEW.client_price IS NOT NULL THEN
      RAISE EXCEPTION 'Not permitted to set client_price';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.gad_cost IS DISTINCT FROM OLD.gad_cost
       OR NEW.balance_due_on_delivery IS DISTINCT FROM OLD.balance_due_on_delivery THEN
      RAISE EXCEPTION 'Not permitted to change cost fields';
    END IF;
    IF v_vis <> 'client_price'
       AND NEW.client_price IS DISTINCT FROM OLD.client_price THEN
      RAISE EXCEPTION 'Not permitted to change client_price';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS items_enforce_money_write ON public.items;
CREATE TRIGGER items_enforce_money_write
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_money_write();
