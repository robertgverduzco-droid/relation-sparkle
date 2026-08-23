ALTER TABLE public.understanding_facets DROP CONSTRAINT IF EXISTS understanding_facets_basis_check;
ALTER TABLE public.understanding_facets ADD CONSTRAINT understanding_facets_basis_check CHECK (
  basis IS NULL OR basis = ANY (ARRAY['stated'::text,'inferred'::text,'self_report'::text,'observed'::text,'repeated_pattern'::text,'hypothesis'::text])
);
ALTER TABLE public.understanding_facets ADD COLUMN IF NOT EXISTS contradiction_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.understanding_facets ADD COLUMN IF NOT EXISTS first_observed_at timestamptz;
UPDATE public.understanding_facets SET first_observed_at = created_at WHERE first_observed_at IS NULL;
COMMENT ON COLUMN public.understanding_facets.basis IS 'Evidence ladder rung. self_report/observed/repeated_pattern/inferred/hypothesis. Legacy values: stated (= self_report), inferred.';
COMMENT ON COLUMN public.understanding_facets.contradiction_count IS 'How many times later evidence has materially conflicted with this understanding. Lowers claim strength.';
COMMENT ON COLUMN public.understanding_facets.first_observed_at IS 'When this understanding was first formed; with refined_at it gives the observation window.';