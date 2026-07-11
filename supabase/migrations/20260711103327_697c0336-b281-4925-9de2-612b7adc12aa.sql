
DO $$
DECLARE
  t text;
  money_tables text[] := ARRAY['items','payments','budgets','library_entries','rooms'];
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF NOT (t = ANY(money_tables)) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- Money-column tables: grant per non-money column
DO $$
DECLARE
  r record;
  money_cols text[];
  cols text;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname='public'
      AND tablename IN ('items','payments','budgets','library_entries','rooms')
  LOOP
    money_cols := CASE r.tablename
      WHEN 'items' THEN ARRAY['gad_cost','client_price','balance_due_on_delivery']
      WHEN 'payments' THEN ARRAY['amount']
      WHEN 'budgets' THEN ARRAY['construction_budget','ffe_budget','per_unit_rates']
      WHEN 'library_entries' THEN ARRAY['price_per_unit']
      WHEN 'rooms' THEN ARRAY['target_amount']
    END;

    SELECT string_agg(format('%I', column_name), ',') INTO cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=r.tablename
      AND NOT (column_name = ANY(money_cols));

    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, r.tablename);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
  END LOOP;
END $$;

-- Grant SELECT on masked views to authenticated
DO $$
DECLARE v text;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname='public'
    AND viewname IN ('items_visible','payments_visible','budgets_visible','library_entries_visible','room_targets_visible')
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v);
  END LOOP;
END $$;
