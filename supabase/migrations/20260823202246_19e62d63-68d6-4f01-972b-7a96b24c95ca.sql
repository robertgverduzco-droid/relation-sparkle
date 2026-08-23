-- Legacy backfill: members who crossed the foundational readiness transition
-- BEFORE interview_sessions.foundational_milestone_at existed were left NULL,
-- so their first post-migration return re-delivered the once-ever pause sheet.
--
-- A member is treated as having already crossed it when either:
--   * the foundational session was explicitly completed, or
--   * their persisted readiness evaluation reached a reason_code that is only
--     reachable AFTER the foundational-understanding check has passed.
-- Nothing here touches readiness, completed_at or matchmaking eligibility.
UPDATE public.interview_sessions s
SET foundational_milestone_at = COALESCE(s.completed_at, s.updated_at, now())
WHERE s.foundational_milestone_at IS NULL
  AND (
    s.completed_at IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.member_readiness mr
      WHERE mr.user_id = s.user_id
        AND mr.reason_code IN (
          'understanding_thin',
          'unresolved_contradictions',
          'material_uncertainty',
          'ready',
          'at_capacity'
        )
    )
  );