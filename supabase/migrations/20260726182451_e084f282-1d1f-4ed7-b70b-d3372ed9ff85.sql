
-- Facet keys Athena tracks over time. Extensible: add new keys without schema changes.
CREATE TABLE public.understanding_facets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facet_key text NOT NULL,
  understanding text,
  reasoning text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  refined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, facet_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.understanding_facets TO authenticated;
GRANT ALL ON public.understanding_facets TO service_role;
ALTER TABLE public.understanding_facets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own facets" ON public.understanding_facets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tg_uf_updated BEFORE UPDATE ON public.understanding_facets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Append-only history of facet refinements.
CREATE TABLE public.facet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facet_key text NOT NULL,
  understanding text,
  reasoning text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  refined_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.facet_history TO authenticated;
GRANT ALL ON public.facet_history TO service_role;
ALTER TABLE public.facet_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own facet history" ON public.facet_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "insert own facet history" ON public.facet_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_facet_history_user_facet ON public.facet_history(user_id, facet_key, refined_at DESC);

-- Pair reasoning — Athena's evolving thinking about a potential pairing.
-- user_low < user_high to enforce canonical ordering.
CREATE TABLE public.pair_reasoning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'considering',
    -- considering | withheld | introduced | closed
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text,
  alignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  complementary jsonb NOT NULL DEFAULT '[]'::jsonb,
  frictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  hard_conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  presented_to_a_at timestamptz,
  presented_to_b_at timestamptz,
  presentation_a text,   -- Athena's introduction as shown to user_low
  presentation_b text,   -- Athena's introduction as shown to user_high
  is_stale boolean NOT NULL DEFAULT false,
  stale_reason text,
  last_reasoned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_low, user_high),
  CHECK (user_low < user_high)
);
GRANT SELECT, INSERT, UPDATE ON public.pair_reasoning TO authenticated;
GRANT ALL ON public.pair_reasoning TO service_role;
ALTER TABLE public.pair_reasoning ENABLE ROW LEVEL SECURITY;
-- A user can see only pair rows they are part of, and only when Athena has
-- presented the pair to them (never raw candidate reasoning about them).
CREATE POLICY "see own presented pairs" ON public.pair_reasoning FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_low  AND presented_to_a_at IS NOT NULL)
    OR (auth.uid() = user_high AND presented_to_b_at IS NOT NULL)
  );
CREATE INDEX idx_pair_low  ON public.pair_reasoning(user_low);
CREATE INDEX idx_pair_high ON public.pair_reasoning(user_high);
CREATE INDEX idx_pair_stale ON public.pair_reasoning(is_stale) WHERE is_stale;
CREATE TRIGGER tg_pair_updated BEFORE UPDATE ON public.pair_reasoning
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Append-only history of Athena's reasoning about a pair.
CREATE TABLE public.pair_reasoning_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.pair_reasoning(id) ON DELETE CASCADE,
  user_low uuid NOT NULL,
  user_high uuid NOT NULL,
  status text NOT NULL,
  confidence numeric NOT NULL,
  reasoning text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pair_reasoning_history TO authenticated;
GRANT ALL ON public.pair_reasoning_history TO service_role;
ALTER TABLE public.pair_reasoning_history ENABLE ROW LEVEL SECURITY;
-- No user-facing read of raw history; internal only. Service role reads.
CREATE INDEX idx_prh_pair ON public.pair_reasoning_history(pair_id, reasoned_at DESC);

-- Per-user mutual consent on a presented introduction.
CREATE TABLE public.introduction_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.pair_reasoning(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('pending','accepted','declined','deferred')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pair_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.introduction_responses TO authenticated;
GRANT ALL ON public.introduction_responses TO service_role;
ALTER TABLE public.introduction_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own response" ON public.introduction_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tg_ir_updated BEFORE UPDATE ON public.introduction_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Feedback Athena learns from after an introduction has been presented.
CREATE TABLE public.introduction_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.pair_reasoning(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,   -- accepted | declined | deferred | met | continued | ended | reflection
  perspective text,     -- user's own words; Athena treats as perspective, not verdict
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.introduction_feedback TO authenticated;
GRANT ALL ON public.introduction_feedback TO service_role;
ALTER TABLE public.introduction_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback rw" ON public.introduction_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_if_pair ON public.introduction_feedback(pair_id, created_at DESC);
