CREATE TABLE public.athena_self_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  turn_count integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_note text,
  next_conversation_intents text[] NOT NULL DEFAULT '{}',
  self_confidence numeric NOT NULL DEFAULT 0.5,
  constitution_version text NOT NULL DEFAULT '1.0',
  prompt_version text NOT NULL DEFAULT '1.2',
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);

CREATE INDEX idx_athena_self_evals_user_created ON public.athena_self_evaluations (user_id, created_at DESC);

GRANT ALL ON public.athena_self_evaluations TO service_role;

ALTER TABLE public.athena_self_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can review self-evaluations"
  ON public.athena_self_evaluations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));