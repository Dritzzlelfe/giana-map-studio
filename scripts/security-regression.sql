-- Security regression checks.
-- Run after every migration:  psql -v ON_ERROR_STOP=1 -f scripts/security-regression.sql
-- Each check RAISES EXCEPTION on failure so the script exits non-zero.

DO $$
DECLARE
  v_missing text;
  v_count   int;
BEGIN
  ---------------------------------------------------------------------------
  -- 1. All public.*_visible views must run with security_invoker = true so
  --    RLS is enforced against the caller, not the view owner.
  ---------------------------------------------------------------------------
  SELECT string_agg(c.relname, ', ')
    INTO v_missing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'v'
     AND c.relname LIKE '%\_visible' ESCAPE '\'
     AND NOT COALESCE(
       (SELECT option_value::boolean
          FROM pg_options_to_table(c.reloptions)
         WHERE option_name = 'security_invoker'),
       false);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'security_invoker is not enabled on view(s): %', v_missing;
  END IF;

  ---------------------------------------------------------------------------
  -- 2. RLS must be enabled on every sensitive public table.
  ---------------------------------------------------------------------------
  SELECT string_agg(tablename, ', ')
    INTO v_missing
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
   WHERE t.schemaname = 'public'
     AND t.tablename IN (
       'items','budgets','payments','library_entries','rooms','projects',
       'profiles','user_roles','roles','vendors','people','categories',
       'phases','approvals','documents','media','inventory_records',
       'products','map_nodes','maps'
     )
     AND NOT c.relrowsecurity;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS is not enabled on table(s): %', v_missing;
  END IF;

  ---------------------------------------------------------------------------
  -- 3. `anon` must NOT have SELECT on user_roles (privilege-escalation guard).
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_count
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name = 'user_roles'
     AND grantee = 'anon'
     AND privilege_type = 'SELECT';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'anon must not have SELECT on public.user_roles';
  END IF;

  ---------------------------------------------------------------------------
  -- 4. `authenticated` must have SELECT on the money-masking views used by
  --    the app; otherwise the client bug we just fixed regresses.
  ---------------------------------------------------------------------------
  SELECT string_agg(v.table_name, ', ')
    INTO v_missing
    FROM information_schema.views v
    LEFT JOIN information_schema.role_table_grants g
      ON g.table_schema = v.table_schema
     AND g.table_name  = v.table_name
     AND g.grantee     = 'authenticated'
     AND g.privilege_type = 'SELECT'
   WHERE v.table_schema = 'public'
     AND v.table_name LIKE '%\_visible' ESCAPE '\'
     AND g.grantee IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated is missing SELECT on view(s): %', v_missing;
  END IF;

  ---------------------------------------------------------------------------
  -- 5. `has_role(uuid, app_role)` must exist as SECURITY DEFINER — the RLS
  --    policies depend on it to avoid recursion and privilege escalation.
  ---------------------------------------------------------------------------
  SELECT count(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'has_role'
     AND p.prosecdef = true;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'public.has_role must exist and be SECURITY DEFINER';
  END IF;

  ---------------------------------------------------------------------------
  -- 6. No RLS-enabled table in `public` may be completely policy-less
  --    (that silently locks the table out of the app).
  ---------------------------------------------------------------------------
  SELECT string_agg(c.relname, ', ')
    INTO v_missing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
     );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS enabled but no policies on table(s): %', v_missing;
  END IF;

  RAISE NOTICE 'security-regression: all checks passed';
END $$;
