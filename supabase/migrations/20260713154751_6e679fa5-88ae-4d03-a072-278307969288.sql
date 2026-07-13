
-- M3 business columns: budgets.scope, payments.notes, categories.axis
-- No security surface touched: no RLS, no policies, no *_visible views, no grants, no enforce_money_write.

-- budgets.scope: 'project' | 'roof_deck'; each project may hold one row per scope
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'project';
DO $$ BEGIN
  ALTER TABLE public.budgets ADD CONSTRAINT budgets_scope_check CHECK (scope IN ('project','roof_deck'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_project_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_project_scope_key ON public.budgets(project_id, scope);

-- payments.notes: free-text audit trail for phase moves and manual notes
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes text;

-- categories.axis: 'construction' | 'ffe'; drives budget-axis splits
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS axis text;
DO $$ BEGIN
  ALTER TABLE public.categories ADD CONSTRAINT categories_axis_check CHECK (axis IS NULL OR axis IN ('construction','ffe'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.categories SET axis = 'construction'
 WHERE axis IS NULL AND key IN ('plumbing','electrical','av','finish','tile_stone','floor','paint','wallpaper','door','hardware','fencing','kitchen');
UPDATE public.categories SET axis = 'ffe'
 WHERE axis IS NULL AND key IN ('furniture','upholstery','drapery');

DO $$
DECLARE unclassified text;
BEGIN
  SELECT string_agg(key, ', ') INTO unclassified FROM public.categories WHERE axis IS NULL;
  IF unclassified IS NOT NULL THEN
    RAISE NOTICE 'Categories missing axis (classify manually): %', unclassified;
  END IF;
END $$;
