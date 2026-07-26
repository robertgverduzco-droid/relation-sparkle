
ALTER TABLE public.user_intelligence
  ADD COLUMN IF NOT EXISTS partnership_vision TEXT,
  ADD COLUMN IF NOT EXISTS readiness_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_interview_at TIMESTAMPTZ;
