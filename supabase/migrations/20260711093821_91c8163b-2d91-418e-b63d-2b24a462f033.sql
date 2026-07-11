
REVOKE EXECUTE ON FUNCTION public.current_role_key() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_money_visibility() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_module_right(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_money_write() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_role_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_money_visibility() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_right(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
