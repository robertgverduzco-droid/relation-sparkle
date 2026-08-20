ALTER TABLE public.user_intelligence
  ADD COLUMN IF NOT EXISTS understanding_reviewed_at timestamptz;

COMMENT ON COLUMN public.user_intelligence.understanding_reviewed_at IS
  'When the member last opened their Living Profile review surface. Used only to mark, subtly, that a section has evolved since. Never a count, score or engagement metric.';