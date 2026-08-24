-- Onboarding Screen 1: optional freeform "anything else you'd like to share".
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intro_note text;
GRANT SELECT (intro_note), UPDATE (intro_note) ON public.profiles TO authenticated;

-- The reveal (pre-payment personality summary). System-written, member-read,
-- member-confirmed. Never a score, never a label.
CREATE TABLE IF NOT EXISTS public.reveal_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  member_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reveal_summaries TO authenticated;
GRANT ALL ON public.reveal_summaries TO service_role;

ALTER TABLE public.reveal_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own reveal" ON public.reveal_summaries;
CREATE POLICY "Members read their own reveal"
  ON public.reveal_summaries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS reveal_summaries_set_updated_at ON public.reveal_summaries;
CREATE TRIGGER reveal_summaries_set_updated_at
  BEFORE UPDATE ON public.reveal_summaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();