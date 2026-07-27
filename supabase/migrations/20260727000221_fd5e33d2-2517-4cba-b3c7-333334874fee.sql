-- Ensure the matchmaking engine (running server-side with the service role)
-- can create, update, and record history for pair reasoning. Regular users
-- continue to only see pairs presented to them; history remains internal.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_reasoning TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pair_reasoning_history TO service_role;

DROP POLICY IF EXISTS "service role manages pair reasoning" ON public.pair_reasoning;
CREATE POLICY "service role manages pair reasoning"
  ON public.pair_reasoning
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service role writes pair history" ON public.pair_reasoning_history;
CREATE POLICY "service role writes pair history"
  ON public.pair_reasoning_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);