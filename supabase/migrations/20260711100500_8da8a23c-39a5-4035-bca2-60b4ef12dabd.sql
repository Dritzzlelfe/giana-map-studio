GRANT SELECT (
  id, room_id, category_id, vendor_id, title, description, sku, design_placement,
  qty_needed, qty_ordered, status, priority, ordered_by, installer, lead_time,
  delivery_address, delivery_date, storage_name, storage_address, logistics_location,
  option_source, client_paid_gad, gad_paid_vendor, created_at, updated_at
) ON public.items TO authenticated;