REVOKE SELECT (status, confidence) ON public.pair_reasoning FROM authenticated;

REVOKE ALL ON public.member_relational_signals FROM authenticated, anon;

DROP POLICY IF EXISTS "own relational signals" ON public.member_relational_signals;

CREATE POLICY "system reasons about relational signals"
  ON public.member_relational_signals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "members never touch relational signals"
  ON public.member_relational_signals AS RESTRICTIVE FOR ALL TO authenticated
  USING (false) WITH CHECK (false);