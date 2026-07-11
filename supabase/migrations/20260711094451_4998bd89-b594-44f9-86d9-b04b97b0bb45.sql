-- Preview-as-role: helper that returns the requested preview role key
-- iff the real caller is an admin/owner/super_admin and the role exists.
CREATE OR REPLACE FUNCTION public.current_preview_role_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_header text;
  v_real_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Read preview role from request header (PostgREST exposes lowercased headers)
  BEGIN
    v_header := current_setting('request.headers', true)::json ->> 'x-preview-role';
  EXCEPTION WHEN OTHERS THEN
    v_header := NULL;
  END;

  IF v_header IS NULL OR v_header = '' THEN
    RETURN NULL;
  END IF;

  -- Only real admins can impersonate. Look up the real profile without recursion.
  SELECT r.key INTO v_real_role
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid()
   LIMIT 1;

  IF v_real_role IS NULL OR v_real_role NOT IN ('owner','super_admin','admin') THEN
    RETURN NULL;
  END IF;

  -- Verify the impersonated role exists
  PERFORM 1 FROM public.roles WHERE key = v_header;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_header;
END $$;

REVOKE EXECUTE ON FUNCTION public.current_preview_role_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_preview_role_key() TO authenticated;

-- Update current_role_key to honor preview override
CREATE OR REPLACE FUNCTION public.current_role_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview text := public.current_preview_role_key();
BEGIN
  IF v_preview IS NOT NULL THEN
    RETURN v_preview;
  END IF;
  RETURN (
    SELECT r.key
      FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
     WHERE p.id = auth.uid()
     LIMIT 1
  );
END $$;

-- Update current_money_visibility to honor preview override
CREATE OR REPLACE FUNCTION public.current_money_visibility()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview text := public.current_preview_role_key();
  v_vis text;
BEGIN
  IF v_preview IS NOT NULL THEN
    SELECT COALESCE(money_visibility, 'none') INTO v_vis
      FROM public.roles WHERE key = v_preview;
    RETURN COALESCE(v_vis, 'none');
  END IF;
  SELECT COALESCE(r.money_visibility, 'none') INTO v_vis
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
   WHERE p.id = auth.uid()
   LIMIT 1;
  RETURN COALESCE(v_vis, 'none');
END $$;

-- Update has_module_right to honor preview override
CREATE OR REPLACE FUNCTION public.has_module_right(_module text, _level text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview text := public.current_preview_role_key();
  v_right text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  IF v_preview IS NOT NULL THEN
    SELECT (module_rights ->> _module) INTO v_right
      FROM public.roles WHERE key = v_preview;
  ELSE
    SELECT (r.module_rights ->> _module) INTO v_right
      FROM public.profiles p
      JOIN public.roles r ON r.id = p.role_id
     WHERE p.id = auth.uid();
  END IF;

  IF v_right IS NULL THEN RETURN false; END IF;
  IF _level = 'view' THEN RETURN v_right IN ('view','edit'); END IF;
  IF _level = 'edit' THEN RETURN v_right = 'edit'; END IF;
  RETURN false;
END $$;

-- is_admin already delegates to current_role_key, so it automatically honors preview.