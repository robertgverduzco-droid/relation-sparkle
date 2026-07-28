CREATE TABLE public.partner_perception (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warmth SMALLINT CHECK (warmth BETWEEN 1 AND 5),
  honesty SMALLINT CHECK (honesty BETWEEN 1 AND 5),
  safety SMALLINT CHECK (safety BETWEEN 1 AND 5),
  chemistry SMALLINT CHECK (chemistry BETWEEN 1 AND 5),
  would_meet_again BOOLEAN,
  surprised_by TEXT,
  concerns TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, author_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_perception TO authenticated;
GRANT ALL ON public.partner_perception TO service_role;

ALTER TABLE public.partner_perception ENABLE ROW LEVEL SECURITY;

CREATE POLICY "author manages own perception"
  ON public.partner_perception
  FOR ALL
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE TRIGGER partner_perception_updated_at
  BEFORE UPDATE ON public.partner_perception
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX partner_perception_subject_idx ON public.partner_perception (subject_id);
CREATE INDEX partner_perception_connection_idx ON public.partner_perception (connection_id);