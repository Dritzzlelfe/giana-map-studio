
CREATE OR REPLACE FUNCTION public.items_autofill_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project uuid;
  v_product uuid;
BEGIN
  IF NEW.project_id IS NULL THEN
    SELECT id INTO v_project FROM public.projects ORDER BY created_at ASC LIMIT 1;
    NEW.project_id := v_project;
  END IF;
  IF NEW.product_id IS NULL THEN
    INSERT INTO public.products (name, sku, default_vendor_id)
    VALUES (COALESCE(NULLIF(NEW.title,''),'Untitled'), NEW.sku, NEW.vendor_id)
    RETURNING id INTO v_product;
    NEW.product_id := v_product;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_items_autofill_context ON public.items;
CREATE TRIGGER trg_items_autofill_context
BEFORE INSERT ON public.items
FOR EACH ROW EXECUTE FUNCTION public.items_autofill_context();
