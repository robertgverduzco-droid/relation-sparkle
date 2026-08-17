-- A-16: least privilege for authenticated on admin/ops-only tables.
REVOKE ALL ON public.ops_alerts FROM authenticated;
REVOKE ALL ON public.ops_snapshots FROM authenticated;
REVOKE ALL ON public.banned_identifiers FROM authenticated;
REVOKE ALL ON public.purge_tombstones FROM authenticated;
REVOKE ALL ON public.restore_reconciliations FROM authenticated;
REVOKE ALL ON public.step_up_grants FROM authenticated;
REVOKE ALL ON public.athena_self_evaluations FROM authenticated;
REVOKE ALL ON public.founder_dialogue_messages FROM authenticated;

-- Outcome signals: admin review reads them through the member's own client,
-- so SELECT stays (RLS still restricts to admins); writes are admin-only.
REVOKE ALL ON public.athena_outcome_signals FROM authenticated;
GRANT SELECT ON public.athena_outcome_signals TO authenticated;

GRANT ALL ON public.ops_alerts, public.ops_snapshots, public.banned_identifiers,
  public.purge_tombstones, public.restore_reconciliations, public.step_up_grants,
  public.athena_self_evaluations, public.founder_dialogue_messages,
  public.athena_outcome_signals TO service_role;