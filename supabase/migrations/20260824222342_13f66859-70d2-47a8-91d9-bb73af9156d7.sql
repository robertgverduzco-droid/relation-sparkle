CREATE TABLE public.member_relational_signals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  novelty numeric NOT NULL DEFAULT 0 CHECK (novelty >= 0 AND novelty <= 1),
  structure numeric NOT NULL DEFAULT 0 CHECK (structure >= 0 AND structure <= 1),
  drive numeric NOT NULL DEFAULT 0 CHECK (drive >= 0 AND drive <= 1),
  connection numeric NOT NULL DEFAULT 0 CHECK (connection >= 0 AND connection <= 1),
  secure numeric NOT NULL DEFAULT 0.25 CHECK (secure >= 0 AND secure <= 1),
  anxious numeric NOT NULL DEFAULT 0.25 CHECK (anxious >= 0 AND anxious <= 1),
  avoidant numeric NOT NULL DEFAULT 0.25 CHECK (avoidant >= 0 AND avoidant <= 1),
  disorganized numeric NOT NULL DEFAULT 0.25 CHECK (disorganized >= 0 AND disorganized <= 1),
  temperament_coverage numeric NOT NULL DEFAULT 0 CHECK (temperament_coverage >= 0 AND temperament_coverage <= 1),
  attachment_coverage numeric NOT NULL DEFAULT 0 CHECK (attachment_coverage >= 0 AND attachment_coverage <= 1),
  refined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_relational_signals TO authenticated;
GRANT ALL ON public.member_relational_signals TO service_role;
ALTER TABLE public.member_relational_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own relational signals" ON public.member_relational_signals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tg_mrs_updated BEFORE UPDATE ON public.member_relational_signals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();