
CREATE POLICY "item_photos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'item-photos'
  AND app_private.has_module_right('lookbook', 'view')
);

CREATE POLICY "item_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-photos'
  AND app_private.has_module_right('lookbook', 'edit')
);

CREATE POLICY "item_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'item-photos'
  AND app_private.has_module_right('lookbook', 'edit')
)
WITH CHECK (
  bucket_id = 'item-photos'
  AND app_private.has_module_right('lookbook', 'edit')
);

CREATE POLICY "item_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-photos'
  AND app_private.has_module_right('lookbook', 'edit')
);
