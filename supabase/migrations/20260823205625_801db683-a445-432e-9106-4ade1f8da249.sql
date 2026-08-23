CREATE TABLE public.member_interaction_style (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  profanity_turns INTEGER NOT NULL DEFAULT 0,
  humor_turns INTEGER NOT NULL DEFAULT 0,
  teasing_turns INTEGER NOT NULL DEFAULT 0,
  self_deprecation_turns INTEGER NOT NULL DEFAULT 0,
  directness_turns INTEGER NOT NULL DEFAULT 0,
  member_turns INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.member_interaction_style TO authenticated;
GRANT ALL ON public.member_interaction_style TO service_role;

ALTER TABLE public.member_interaction_style ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own interaction style"
ON public.member_interaction_style FOR SELECT TO authenticated
USING (auth.uid() = user_id);