CREATE TABLE public.athena_turn_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_hash text NOT NULL,
  event text NOT NULL,
  surface text NOT NULL DEFAULT 'text',
  humor_level text NOT NULL,
  serious_moment boolean NOT NULL DEFAULT false,
  notice_deferred boolean NOT NULL DEFAULT false,
  atlas_ids text[] NOT NULL DEFAULT '{}',
  exemplar_ids text[] NOT NULL DEFAULT '{}',
  provenance boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.athena_turn_decisions IS 'De-identified runtime observability: which conversational event Athena recognised and which register she used. No conversation text, no user_id, service-role only.';

GRANT ALL ON public.athena_turn_decisions TO service_role;

ALTER TABLE public.athena_turn_decisions ENABLE ROW LEVEL SECURITY;

CREATE INDEX athena_turn_decisions_created_idx ON public.athena_turn_decisions (created_at DESC);