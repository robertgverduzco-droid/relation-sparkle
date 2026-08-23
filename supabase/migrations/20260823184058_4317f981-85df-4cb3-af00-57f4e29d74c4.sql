CREATE TABLE public.education_retrieval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  surface text NOT NULL,
  actor_hash text,
  dense boolean NOT NULL DEFAULT false,
  concepts text[] NOT NULL DEFAULT '{}',
  candidate_count integer NOT NULL DEFAULT 0,
  retrieved_count integer NOT NULL DEFAULT 0,
  is_empty boolean NOT NULL DEFAULT true,
  injected_chars integer NOT NULL DEFAULT 0,
  chunk_ids text[] NOT NULL DEFAULT '{}',
  source_docs text[] NOT NULL DEFAULT '{}',
  scores numeric[] NOT NULL DEFAULT '{}',
  query_chars integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.education_retrieval_events TO service_role;

ALTER TABLE public.education_retrieval_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read educational retrieval telemetry"
ON public.education_retrieval_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX education_retrieval_events_created_idx
  ON public.education_retrieval_events (created_at DESC);