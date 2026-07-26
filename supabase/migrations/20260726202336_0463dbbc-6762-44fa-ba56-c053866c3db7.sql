
ALTER TABLE public.understanding_facets
  ADD COLUMN IF NOT EXISTS needs_clarification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clarification_note text;

CREATE TABLE IF NOT EXISTS public.topic_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_key text NOT NULL,
  status text NOT NULL DEFAULT 'untouched',
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  importance numeric NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  conversation_count integer NOT NULL DEFAULT 0,
  question_count integer NOT NULL DEFAULT 0,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_topics text[] NOT NULL DEFAULT '{}',
  open_questions text[] NOT NULL DEFAULT '{}',
  needs_clarification boolean NOT NULL DEFAULT false,
  clarification_note text,
  first_discussed_at timestamptz,
  last_discussed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_map TO authenticated;
GRANT ALL ON public.topic_map TO service_role;

ALTER TABLE public.topic_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own topic map"
  ON public.topic_map
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_topic_map_user_last
  ON public.topic_map (user_id, last_discussed_at DESC NULLS LAST);

CREATE TRIGGER tg_topic_map_updated
  BEFORE UPDATE ON public.topic_map
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
