
ALTER FUNCTION public.items_autofill_context() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.items_autofill_context() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.items_autofill_context() FROM anon, authenticated;
