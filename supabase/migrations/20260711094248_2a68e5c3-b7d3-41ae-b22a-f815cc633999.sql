DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);