ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS foundational_milestone_at timestamptz;

COMMENT ON COLUMN public.interview_sessions.foundational_milestone_at IS
  'Once-ever timestamp: the foundational-readiness pause/closing opportunity has been delivered to this member. Server-owned and monotonic; never cleared. Distinct from completed_at and from matchmaking readiness.';