-- 1) History of every guided reflection submission (additive; the existing
--    post_meeting_reflections row remains the "current state" row and keeps
--    its (connection_id, user_id) uniqueness so existing upserts still work).
CREATE TABLE public.reflection_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 1,
  feeling_tags text[] NOT NULL DEFAULT '{}',
  feeling_other text,
  most_genuine text,
  greatest_difference text,
  self_understanding text,
  continue_decision text CHECK (continue_decision IN ('yes','no','not_sure')),
  decision_reason text,
  anything_else text,
  athena_acknowledgement text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reflection_submissions_conn_user_idx
  ON public.reflection_submissions (connection_id, user_id, sequence DESC);

GRANT SELECT, INSERT ON public.reflection_submissions TO authenticated;
GRANT ALL ON public.reflection_submissions TO service_role;

ALTER TABLE public.reflection_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own reflection submissions"
  ON public.reflection_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members add their own reflection submissions"
  ON public.reflection_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Additive columns on the existing reflection record.
ALTER TABLE public.post_meeting_reflections
  ADD COLUMN IF NOT EXISTS reflection_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_since timestamptz,
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS athena_acknowledgement text;

-- 3) Allow the mutual-interest connection state.
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_status_check;
ALTER TABLE public.connections ADD CONSTRAINT connections_status_check
  CHECK (status IN ('open','meeting_planned','met','mutual_interest','closed'));