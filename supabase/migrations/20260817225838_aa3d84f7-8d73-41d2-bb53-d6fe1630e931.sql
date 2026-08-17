REVOKE ALL ON public.rate_limit_counters FROM authenticated, anon;
GRANT ALL ON public.rate_limit_counters TO service_role;