DO $$
DECLARE cols text; money_cols text[] := ARRAY['target_amount'];
BEGIN
  SELECT string_agg(format('%I', column_name), ',') INTO cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='rooms'
    AND NOT (column_name = ANY(money_cols));
  EXECUTE format('GRANT SELECT (%s) ON public.rooms TO authenticated', cols);
END $$;