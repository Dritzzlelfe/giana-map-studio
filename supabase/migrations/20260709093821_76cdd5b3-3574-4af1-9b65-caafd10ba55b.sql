
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['items','vendors','people','rooms','categories'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete %1$s" ON public.%1$s', t);

    EXECUTE format($f$CREATE POLICY "Authenticated users can insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)$f$, t);
    EXECUTE format($f$CREATE POLICY "Authenticated users can update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)$f$, t);
    EXECUTE format($f$CREATE POLICY "Authenticated users can delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)$f$, t);
  END LOOP;
END $$;
