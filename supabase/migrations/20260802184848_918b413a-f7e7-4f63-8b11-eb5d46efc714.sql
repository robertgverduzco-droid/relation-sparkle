ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_opt_out boolean NOT NULL DEFAULT false;

CREATE TABLE public.athena_outcome_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_token text NOT NULL,
  signal_kind text NOT NULL,
  valence text NOT NULL CHECK (valence IN ('positive','negative','uncertain','incomplete')),
  strength text NOT NULL CHECK (strength IN ('none','weak','moderate','strong','strongest','disqualifying')),
  reason_category text,
  is_contradictory boolean NOT NULL DEFAULT false,
  learning_version text NOT NULL DEFAULT '0',
  dedupe_key text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pair_token, signal_kind, dedupe_key)
);

GRANT SELECT ON public.athena_outcome_signals TO authenticated;
GRANT ALL ON public.athena_outcome_signals TO service_role;

ALTER TABLE public.athena_outcome_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can review outcome signals"
ON public.athena_outcome_signals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_outcome_signals_kind_time
  ON public.athena_outcome_signals (signal_kind, occurred_at DESC);
CREATE INDEX idx_outcome_signals_pair
  ON public.athena_outcome_signals (pair_token);