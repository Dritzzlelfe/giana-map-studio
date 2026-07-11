-- Revoke direct SELECT on money columns from authenticated (idempotent)
REVOKE SELECT (gad_cost, client_price, balance_due_on_delivery)
  ON public.items FROM authenticated;

-- Recreate items_visible as SECURITY DEFINER view (column-masking pattern)
DROP VIEW IF EXISTS public.items_visible;

CREATE VIEW public.items_visible
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  id,
  room_id,
  category_id,
  vendor_id,
  title,
  description,
  sku,
  design_placement,
  qty_needed,
  qty_ordered,
  status,
  priority,
  ordered_by,
  installer,
  lead_time,
  delivery_address,
  delivery_date,
  storage_name,
  storage_address,
  logistics_location,
  option_source,
  client_paid_gad,
  gad_paid_vendor,
  CASE
    WHEN app_private.current_money_visibility() = 'full' THEN gad_cost
    ELSE NULL::numeric
  END AS gad_cost,
  CASE
    WHEN app_private.current_money_visibility() = ANY (ARRAY['full','client_price']) THEN client_price
    ELSE NULL::numeric
  END AS client_price,
  CASE
    WHEN app_private.current_money_visibility() = 'full' THEN balance_due_on_delivery
    ELSE NULL::numeric
  END AS balance_due_on_delivery,
  created_at,
  updated_at
FROM public.items
WHERE app_private.has_module_right('item','view');

ALTER VIEW public.items_visible OWNER TO postgres;

GRANT SELECT ON public.items_visible TO authenticated;