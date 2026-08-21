-- 1. has_role no longer SECURITY DEFINER; relies on the member's own-roles read policy.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Synthetic beta account tables: explicit service-role-only, deny-all for clients.
REVOKE ALL ON public.synthetic_accounts FROM anon, authenticated;
REVOKE ALL ON public.synthetic_batches FROM anon, authenticated;
GRANT ALL ON public.synthetic_accounts TO service_role;
GRANT ALL ON public.synthetic_batches TO service_role;

DROP POLICY IF EXISTS "synthetic_accounts deny all client access" ON public.synthetic_accounts;
CREATE POLICY "synthetic_accounts deny all client access"
  ON public.synthetic_accounts FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "synthetic_batches deny all client access" ON public.synthetic_batches;
CREATE POLICY "synthetic_batches deny all client access"
  ON public.synthetic_batches FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMENT ON TABLE public.synthetic_accounts IS 'Founder-only synthetic beta accounts. Intentional deny-all for anon/authenticated; all access is service-role only via server functions.';
COMMENT ON TABLE public.synthetic_batches IS 'Founder-only synthetic beta batches. Intentional deny-all for anon/authenticated; all access is service-role only via server functions.';

-- 3. member_readiness: owner may read; writes are intentionally server-side only.
REVOKE INSERT, UPDATE, DELETE ON public.member_readiness FROM anon, authenticated;
REVOKE ALL ON public.member_readiness FROM anon;
GRANT SELECT ON public.member_readiness TO authenticated;
GRANT ALL ON public.member_readiness TO service_role;

DROP POLICY IF EXISTS "member_readiness no client writes" ON public.member_readiness;
CREATE POLICY "member_readiness no client writes"
  ON public.member_readiness AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (false);

COMMENT ON TABLE public.member_readiness IS 'Introduction readiness gate. Members may read their own row; readiness may never be self-granted, so all writes are service-role only.';