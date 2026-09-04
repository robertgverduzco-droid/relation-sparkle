ALTER TABLE public.pair_reasoning
  ADD COLUMN IF NOT EXISTS lapsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS lapse_reminded_at timestamptz;

GRANT SELECT (lapsed_at) ON public.pair_reasoning TO authenticated;

CREATE INDEX IF NOT EXISTS pair_reasoning_open_presented_idx
  ON public.pair_reasoning (status)
  WHERE lapsed_at IS NULL;