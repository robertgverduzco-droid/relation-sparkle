CREATE TABLE public.founder_dialogue_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('founder','athena')),
  content text NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX founder_dialogue_messages_founder_created_idx
  ON public.founder_dialogue_messages (founder_id, created_at);

GRANT SELECT ON public.founder_dialogue_messages TO authenticated;
GRANT ALL ON public.founder_dialogue_messages TO service_role;

ALTER TABLE public.founder_dialogue_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder reads own governance dialogue"
  ON public.founder_dialogue_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = founder_id AND public.has_role(auth.uid(), 'founder'));