ALTER TABLE public.reveal_summaries
  ADD COLUMN IF NOT EXISTS source_facet_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.reveal_summaries.source_facet_count IS
  'How many facets of understanding the reveal was written from. 0 means it was generated with no source material and may be regenerated while unconfirmed.';