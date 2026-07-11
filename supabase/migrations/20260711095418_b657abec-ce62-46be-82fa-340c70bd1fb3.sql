
-- =========================================================
-- 1) Private schema for internal helpers (not exposed via PostgREST)
-- =========================================================
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

-- =========================================================
-- 2) Recreate helpers in app_private
-- =========================================================
CREATE OR REPLACE FUNCTION app_private.current_preview_role_key()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_header text;
  v_real_role text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_header := current_setting('request.headers', true)::json ->> 'x-preview-role';
  EXCEPTION WHEN OTHERS THEN v_header := NULL;
  END;
  IF v_header IS NULL OR v_header = '' THEN RETURN NULL; END IF;

  SELECT r.key INTO v_real_role
    FROM public.profiles p JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid() LIMIT 1;

  IF v_real_role IS NULL OR v_real_role NOT IN ('owner','super_admin','admin') THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM public.roles WHERE key = v_header;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN v_header;
END $$;

CREATE OR REPLACE FUNCTION app_private.current_role_key()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_preview text := app_private.current_preview_role_key();
BEGIN
  IF v_preview IS NOT NULL THEN RETURN v_preview; END IF;
  RETURN (SELECT r.key FROM public.profiles p JOIN public.roles r ON r.id = p.role_id WHERE p.id = auth.uid() LIMIT 1);
END $$;

CREATE OR REPLACE FUNCTION app_private.current_money_visibility()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_preview text := app_private.current_preview_role_key(); v_vis text;
BEGIN
  IF v_preview IS NOT NULL THEN
    SELECT COALESCE(money_visibility,'none') INTO v_vis FROM public.roles WHERE key = v_preview;
    RETURN COALESCE(v_vis,'none');
  END IF;
  SELECT COALESCE(r.money_visibility,'none') INTO v_vis
    FROM public.profiles p JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid() LIMIT 1;
  RETURN COALESCE(v_vis,'none');
END $$;

CREATE OR REPLACE FUNCTION app_private.has_module_right(_module text, _level text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_preview text := app_private.current_preview_role_key(); v_right text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF v_preview IS NOT NULL THEN
    SELECT (module_rights ->> _module) INTO v_right FROM public.roles WHERE key = v_preview;
  ELSE
    SELECT (r.module_rights ->> _module) INTO v_right
      FROM public.profiles p JOIN public.roles r ON r.id = p.role_id
     WHERE p.id = auth.uid();
  END IF;
  IF v_right IS NULL THEN RETURN false; END IF;
  IF _level = 'view' THEN RETURN v_right IN ('view','edit'); END IF;
  IF _level = 'edit' THEN RETURN v_right = 'edit'; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.current_role_key() IN ('owner','super_admin','admin')
$$;

CREATE OR REPLACE FUNCTION app_private.enforce_money_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vis text := app_private.current_money_visibility();
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL THEN RETURN NEW; END IF;
  IF v_vis = 'full' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.gad_cost IS NOT NULL OR NEW.balance_due_on_delivery IS NOT NULL THEN
      RAISE EXCEPTION 'Not permitted to set cost fields';
    END IF;
    IF v_vis <> 'client_price' AND NEW.client_price IS NOT NULL THEN
      RAISE EXCEPTION 'Not permitted to set client_price';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.gad_cost IS DISTINCT FROM OLD.gad_cost OR NEW.balance_due_on_delivery IS DISTINCT FROM OLD.balance_due_on_delivery THEN
      RAISE EXCEPTION 'Not permitted to change cost fields';
    END IF;
    IF v_vis <> 'client_price' AND NEW.client_price IS DISTINCT FROM OLD.client_price THEN
      RAISE EXCEPTION 'Not permitted to change client_price';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner_role uuid; v_owner_exists boolean; v_assign_role uuid := NULL;
BEGIN
  SELECT id INTO v_owner_role FROM public.roles WHERE key = 'owner' LIMIT 1;
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role_id = v_owner_role) INTO v_owner_exists;
  IF (NOT v_owner_exists) OR LOWER(NEW.email) = 'g@gianaallendesign.com' THEN
    v_assign_role := v_owner_role;
  END IF;
  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), v_assign_role)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role_id = COALESCE(public.profiles.role_id, EXCLUDED.role_id);
  RETURN NEW;
END $$;

-- Lock down execute privileges
REVOKE ALL ON FUNCTION app_private.current_preview_role_key(),
                        app_private.current_role_key(),
                        app_private.current_money_visibility(),
                        app_private.has_module_right(text,text),
                        app_private.is_admin(),
                        app_private.enforce_money_write(),
                        app_private.handle_new_auth_user()
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.current_preview_role_key(),
                          app_private.current_role_key(),
                          app_private.current_money_visibility(),
                          app_private.has_module_right(text,text),
                          app_private.is_admin()
  TO authenticated;

-- =========================================================
-- 3) Rebuild all policies to reference app_private.*
-- =========================================================
-- categories
DROP POLICY IF EXISTS categories_select ON public.categories;
DROP POLICY IF EXISTS categories_insert ON public.categories;
DROP POLICY IF EXISTS categories_update ON public.categories;
DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_select ON public.categories FOR SELECT TO authenticated
  USING (app_private.has_module_right('schedule','view') OR app_private.has_module_right('item','view') OR app_private.has_module_right('room','view'));
CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('schedule','edit'));
CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated
  USING (app_private.has_module_right('schedule','edit')) WITH CHECK (app_private.has_module_right('schedule','edit'));
CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated
  USING (app_private.has_module_right('schedule','edit'));

-- items
DROP POLICY IF EXISTS items_select ON public.items;
DROP POLICY IF EXISTS items_insert ON public.items;
DROP POLICY IF EXISTS items_update ON public.items;
DROP POLICY IF EXISTS items_delete ON public.items;
CREATE POLICY items_select ON public.items FOR SELECT TO authenticated
  USING (app_private.has_module_right('item','view'));
CREATE POLICY items_insert ON public.items FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY items_update ON public.items FOR UPDATE TO authenticated
  USING (app_private.has_module_right('item','edit')) WITH CHECK (app_private.has_module_right('item','edit'));
CREATE POLICY items_delete ON public.items FOR DELETE TO authenticated
  USING (app_private.has_module_right('item','edit'));

-- map_nodes
DROP POLICY IF EXISTS map_nodes_select ON public.map_nodes;
DROP POLICY IF EXISTS map_nodes_insert ON public.map_nodes;
DROP POLICY IF EXISTS map_nodes_update ON public.map_nodes;
DROP POLICY IF EXISTS map_nodes_delete ON public.map_nodes;
CREATE POLICY map_nodes_select ON public.map_nodes FOR SELECT TO authenticated
  USING (app_private.has_module_right('matrix','view'));
CREATE POLICY map_nodes_insert ON public.map_nodes FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('matrix','edit'));
CREATE POLICY map_nodes_update ON public.map_nodes FOR UPDATE TO authenticated
  USING (app_private.has_module_right('matrix','edit')) WITH CHECK (app_private.has_module_right('matrix','edit'));
CREATE POLICY map_nodes_delete ON public.map_nodes FOR DELETE TO authenticated
  USING (app_private.has_module_right('matrix','edit'));

-- maps
DROP POLICY IF EXISTS maps_select ON public.maps;
DROP POLICY IF EXISTS maps_insert ON public.maps;
DROP POLICY IF EXISTS maps_update ON public.maps;
DROP POLICY IF EXISTS maps_delete ON public.maps;
CREATE POLICY maps_select ON public.maps FOR SELECT TO authenticated
  USING (app_private.has_module_right('matrix','view'));
CREATE POLICY maps_insert ON public.maps FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('matrix','edit'));
CREATE POLICY maps_update ON public.maps FOR UPDATE TO authenticated
  USING (app_private.has_module_right('matrix','edit')) WITH CHECK (app_private.has_module_right('matrix','edit'));
CREATE POLICY maps_delete ON public.maps FOR DELETE TO authenticated
  USING (app_private.has_module_right('matrix','edit'));

-- people
DROP POLICY IF EXISTS people_select ON public.people;
DROP POLICY IF EXISTS people_insert ON public.people;
DROP POLICY IF EXISTS people_update ON public.people;
DROP POLICY IF EXISTS people_delete ON public.people;
CREATE POLICY people_select ON public.people FOR SELECT TO authenticated
  USING (app_private.has_module_right('people_vendors','view') OR app_private.has_module_right('item','view'));
CREATE POLICY people_insert ON public.people FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('people_vendors','edit'));
CREATE POLICY people_update ON public.people FOR UPDATE TO authenticated
  USING (app_private.has_module_right('people_vendors','edit')) WITH CHECK (app_private.has_module_right('people_vendors','edit'));
CREATE POLICY people_delete ON public.people FOR DELETE TO authenticated
  USING (app_private.has_module_right('people_vendors','edit'));

-- vendors (assume same pattern)
DROP POLICY IF EXISTS vendors_select ON public.vendors;
DROP POLICY IF EXISTS vendors_insert ON public.vendors;
DROP POLICY IF EXISTS vendors_update ON public.vendors;
DROP POLICY IF EXISTS vendors_delete ON public.vendors;
CREATE POLICY vendors_select ON public.vendors FOR SELECT TO authenticated
  USING (app_private.has_module_right('people_vendors','view') OR app_private.has_module_right('item','view'));
CREATE POLICY vendors_insert ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('people_vendors','edit'));
CREATE POLICY vendors_update ON public.vendors FOR UPDATE TO authenticated
  USING (app_private.has_module_right('people_vendors','edit')) WITH CHECK (app_private.has_module_right('people_vendors','edit'));
CREATE POLICY vendors_delete ON public.vendors FOR DELETE TO authenticated
  USING (app_private.has_module_right('people_vendors','edit'));

-- rooms
DROP POLICY IF EXISTS rooms_select ON public.rooms;
DROP POLICY IF EXISTS rooms_insert ON public.rooms;
DROP POLICY IF EXISTS rooms_update ON public.rooms;
DROP POLICY IF EXISTS rooms_delete ON public.rooms;
CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (app_private.has_module_right('room','view') OR app_private.has_module_right('item','view'));
CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (app_private.has_module_right('room','edit'));
CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO authenticated
  USING (app_private.has_module_right('room','edit')) WITH CHECK (app_private.has_module_right('room','edit'));
CREATE POLICY rooms_delete ON public.rooms FOR DELETE TO authenticated
  USING (app_private.has_module_right('room','edit'));

-- profiles: use app_private.is_admin
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR app_private.is_admin());
CREATE POLICY profiles_insert_admin ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (app_private.is_admin());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR app_private.is_admin())
  WITH CHECK (app_private.is_admin() OR (id = auth.uid() AND NOT (role_id IS DISTINCT FROM (SELECT p2.role_id FROM public.profiles p2 WHERE p2.id = auth.uid()))));
CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated
  USING (app_private.is_admin());

-- roles: restrict SELECT — signed-in users see only their own role; admins see all
DROP POLICY IF EXISTS roles_select ON public.roles;
DROP POLICY IF EXISTS roles_insert ON public.roles;
DROP POLICY IF EXISTS roles_update ON public.roles;
DROP POLICY IF EXISTS roles_delete ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated
  USING (
    app_private.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role_id = roles.id)
  );
CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated
  WITH CHECK (app_private.is_admin());
CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated
  USING (app_private.is_admin()) WITH CHECK (app_private.is_admin());
CREATE POLICY roles_delete ON public.roles FOR DELETE TO authenticated
  USING (app_private.is_admin() AND NOT is_system);

-- =========================================================
-- 4) Rewire triggers to app_private functions
-- =========================================================
DROP TRIGGER IF EXISTS enforce_money_write_trg ON public.items;
DROP TRIGGER IF EXISTS items_enforce_money_write ON public.items;
CREATE TRIGGER items_enforce_money_write
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION app_private.enforce_money_write();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app_private.handle_new_auth_user();

-- =========================================================
-- 5) items_visible: recreate as SECURITY INVOKER view
-- =========================================================
DROP VIEW IF EXISTS public.items_visible;

-- Allow authenticated to read money columns; masking happens in view CASE.
-- Direct reads of public.items are still gated by items_select policy
-- (item.view module right). The dedicated items_visible view is the
-- canonical read path used by the client and applies role-based masking.
GRANT SELECT (gad_cost, client_price, balance_due_on_delivery) ON public.items TO authenticated;

CREATE VIEW public.items_visible
  WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id, room_id, category_id, vendor_id, title, description, sku,
  design_placement, qty_needed, qty_ordered, status, priority,
  ordered_by, installer, lead_time, delivery_address, delivery_date,
  storage_name, storage_address, logistics_location, option_source,
  client_paid_gad, gad_paid_vendor,
  CASE WHEN app_private.current_money_visibility() = 'full' THEN gad_cost ELSE NULL::numeric END AS gad_cost,
  CASE WHEN app_private.current_money_visibility() IN ('full','client_price') THEN client_price ELSE NULL::numeric END AS client_price,
  CASE WHEN app_private.current_money_visibility() = 'full' THEN balance_due_on_delivery ELSE NULL::numeric END AS balance_due_on_delivery,
  created_at, updated_at
FROM public.items
WHERE app_private.has_module_right('item','view');

GRANT SELECT ON public.items_visible TO authenticated;

-- =========================================================
-- 6) Drop old public helpers now that nothing references them
-- =========================================================
DROP FUNCTION IF EXISTS public.has_module_right(text,text);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.current_role_key();
DROP FUNCTION IF EXISTS public.current_money_visibility();
DROP FUNCTION IF EXISTS public.current_preview_role_key();
DROP FUNCTION IF EXISTS public.enforce_money_write();
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
