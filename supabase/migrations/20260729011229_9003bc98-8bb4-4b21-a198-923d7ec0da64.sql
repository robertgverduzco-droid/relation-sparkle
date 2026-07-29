
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.tg_mark_pair_reasoning_stale_for_perception() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_mark_pair_reasoning_stale_for_perception() TO service_role;

REVOKE ALL ON FUNCTION public.tg_mark_pair_reasoning_stale_for_reflection() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_mark_pair_reasoning_stale_for_reflection() TO service_role;
