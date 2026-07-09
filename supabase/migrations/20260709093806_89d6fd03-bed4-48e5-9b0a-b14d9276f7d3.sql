
-- Restrict access on core tables to authenticated users only.
-- Removes overly-permissive `USING (true)` policies granted to the public/anon role.

-- items
DROP POLICY IF EXISTS "v1 anyone can read items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can insert items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can update items" ON public.items;
DROP POLICY IF EXISTS "v1 anyone can delete items" ON public.items;
REVOKE ALL ON public.items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
CREATE POLICY "Authenticated users can read items" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update items" ON public.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete items" ON public.items FOR DELETE TO authenticated USING (true);

-- vendors
DROP POLICY IF EXISTS "v1 anyone can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "v1 anyone can delete vendors" ON public.vendors;
REVOKE ALL ON public.vendors FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
CREATE POLICY "Authenticated users can read vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vendors" ON public.vendors FOR DELETE TO authenticated USING (true);

-- people
DROP POLICY IF EXISTS "v1 anyone can read people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can insert people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can update people" ON public.people;
DROP POLICY IF EXISTS "v1 anyone can delete people" ON public.people;
REVOKE ALL ON public.people FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
CREATE POLICY "Authenticated users can read people" ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert people" ON public.people FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update people" ON public.people FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete people" ON public.people FOR DELETE TO authenticated USING (true);

-- rooms
DROP POLICY IF EXISTS "v1 anyone can read rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "v1 anyone can delete rooms" ON public.rooms;
REVOKE ALL ON public.rooms FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
CREATE POLICY "Authenticated users can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (true);

-- categories
DROP POLICY IF EXISTS "v1 anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can insert categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can update categories" ON public.categories;
DROP POLICY IF EXISTS "v1 anyone can delete categories" ON public.categories;
REVOKE ALL ON public.categories FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
CREATE POLICY "Authenticated users can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE TO authenticated USING (true);
