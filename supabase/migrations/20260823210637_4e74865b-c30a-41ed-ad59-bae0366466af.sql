-- Athena Continuous Learning & Founder Intelligence V1
-- Every table here is de-identified aggregate learning memory. No member
-- surface may read it: RLS on, zero policies, no grants to anon/authenticated.

CREATE TABLE public.athena_intelligence_versions (
  version text PRIMARY KEY,
  previous_version text,
  notes text NOT NULL DEFAULT '',
  promoted jsonb NOT NULL DEFAULT '[]'::jsonb,
  activated_by uuid REFERENCES auth.users(id),
  activated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.athena_intelligence_versions TO service_role;
ALTER TABLE public.athena_intelligence_versions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.athena_intelligence_versions (version, notes)
VALUES ('learning-1.0.0', 'Baseline: Constitution and Canonical Curriculum only. No learned intelligence in operational influence.');

CREATE TABLE public.athena_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_token text NOT NULL,
  intelligence_version text NOT NULL REFERENCES public.athena_intelligence_versions(version),
  predicted_status text NOT NULL,
  confidence_band text NOT NULL,
  confidence_numeric numeric NOT NULL,
  important_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  known_unknowns jsonb NOT NULL DEFAULT '[]'::jsonb,
  expectation text,
  learning_eligible boolean NOT NULL DEFAULT true,
  is_synthetic boolean NOT NULL DEFAULT false,
  predicted_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX athena_predictions_pair_time ON public.athena_predictions (pair_token, predicted_at);
CREATE INDEX athena_predictions_pair ON public.athena_predictions (pair_token);
GRANT SELECT, INSERT ON public.athena_predictions TO service_role;
ALTER TABLE public.athena_predictions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tg_predictions_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'athena_predictions is append-only';
END $$;

CREATE TRIGGER athena_predictions_append_only
  BEFORE UPDATE OR DELETE ON public.athena_predictions
  FOR EACH ROW EXECUTE FUNCTION public.tg_predictions_immutable();

CREATE TABLE public.athena_prediction_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.athena_predictions(id) ON DELETE CASCADE,
  pair_token text NOT NULL,
  signal_kind text NOT NULL,
  valence text NOT NULL,
  strength text NOT NULL,
  reason_category text,
  divergence text NOT NULL DEFAULT 'unknown',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX athena_prediction_outcomes_pred ON public.athena_prediction_outcomes (prediction_id);
GRANT ALL ON public.athena_prediction_outcomes TO service_role;
ALTER TABLE public.athena_prediction_outcomes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.athena_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  statement text NOT NULL,
  dimension text NOT NULL,
  status text NOT NULL DEFAULT 'observed',
  operational_influence text NOT NULL DEFAULT 'none',
  applicable_cases integer NOT NULL DEFAULT 0,
  supporting_count integer NOT NULL DEFAULT 0,
  contradicting_count integer NOT NULL DEFAULT 0,
  confidence_state text NOT NULL DEFAULT 'insufficient',
  contexts jsonb NOT NULL DEFAULT '[]'::jsonb,
  confounders jsonb NOT NULL DEFAULT '[]'::jsonb,
  alternative_explanations jsonb NOT NULL DEFAULT '[]'::jsonb,
  university_principles jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenges_education boolean NOT NULL DEFAULT false,
  is_surprise boolean NOT NULL DEFAULT false,
  sensitivity_flag text NOT NULL DEFAULT 'clear',
  sensitivity_reason text,
  intelligence_version text NOT NULL REFERENCES public.athena_intelligence_versions(version),
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.athena_hypotheses TO service_role;
ALTER TABLE public.athena_hypotheses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.athena_hypothesis_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id uuid NOT NULL REFERENCES public.athena_hypotheses(id) ON DELETE CASCADE,
  kind text NOT NULL,
  pair_token text NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX athena_hypothesis_evidence_dedupe
  ON public.athena_hypothesis_evidence (hypothesis_id, kind, pair_token);
GRANT ALL ON public.athena_hypothesis_evidence TO service_role;
ALTER TABLE public.athena_hypothesis_evidence ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.athena_hypothesis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id uuid NOT NULL REFERENCES public.athena_hypotheses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  from_status text,
  to_status text,
  from_influence text,
  to_influence text,
  note text,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  intelligence_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.athena_hypothesis_reviews TO service_role;
ALTER TABLE public.athena_hypothesis_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.athena_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id uuid NOT NULL REFERENCES public.athena_hypotheses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  surface text NOT NULL,
  expected_effect text NOT NULL,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed jsonb NOT NULL DEFAULT '{}'::jsonb,
  adverse_effects text,
  intelligence_version text NOT NULL,
  started_by uuid REFERENCES auth.users(id),
  ended_by uuid REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT ALL ON public.athena_experiments TO service_role;
ALTER TABLE public.athena_experiments ENABLE ROW LEVEL SECURITY;