DROP POLICY IF EXISTS "members read switch state" ON public.security_kill_switches;

CREATE POLICY "admins and founders read switch state"
ON public.security_kill_switches
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'founder'::app_role)
);