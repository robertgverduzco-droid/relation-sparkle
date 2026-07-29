ALTER TABLE public.post_meeting_reflections
  ADD COLUMN IF NOT EXISTS feeling_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS feeling_other text,
  ADD COLUMN IF NOT EXISTS most_genuine text,
  ADD COLUMN IF NOT EXISTS greatest_difference text,
  ADD COLUMN IF NOT EXISTS self_understanding text,
  ADD COLUMN IF NOT EXISTS continue_decision text,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS anything_else text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE public.post_meeting_reflections
  DROP CONSTRAINT IF EXISTS post_meeting_reflections_continue_decision_check;

ALTER TABLE public.post_meeting_reflections
  ADD CONSTRAINT post_meeting_reflections_continue_decision_check
  CHECK (continue_decision IS NULL OR continue_decision IN ('yes','no','not_sure'));