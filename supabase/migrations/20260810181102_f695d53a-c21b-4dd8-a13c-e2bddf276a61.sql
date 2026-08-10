-- 1. Allow deletion of a member who has resolved reports (previously NO ACTION,
--    which blocked account deletion for moderators).
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Column-level privacy boundary on pair_reasoning.
--    Athena's internal cross-member reasoning must never reach a client, even
--    for a row the member is allowed to see. RLS protects rows; column grants
--    protect columns. Service role (server-side matchmaking) is untouched.
REVOKE SELECT ON public.pair_reasoning FROM anon;
REVOKE SELECT ON public.pair_reasoning FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pair_reasoning FROM anon;

GRANT SELECT (
  id,
  user_low,
  user_high,
  status,
  confidence,
  presentation_a,
  presentation_b,
  presented_to_a_at,
  presented_to_b_at,
  last_reasoned_at,
  created_at,
  updated_at
) ON public.pair_reasoning TO authenticated;

GRANT ALL ON public.pair_reasoning TO service_role;

-- pair_reasoning_history mirrors the same private reasoning in `snapshot`.
REVOKE SELECT ON public.pair_reasoning_history FROM anon;
REVOKE SELECT ON public.pair_reasoning_history FROM authenticated;
GRANT ALL ON public.pair_reasoning_history TO service_role;