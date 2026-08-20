ALTER TABLE public.understanding_facets
  ADD COLUMN IF NOT EXISTS basis text
  CHECK (basis IS NULL OR basis IN ('stated','inferred'));

COMMENT ON COLUMN public.understanding_facets.basis IS
  'F-14 provenance: ''stated'' = the member directly expressed this; ''inferred'' = Athena''s interpretation. NULL = provenance not established (legacy rows); rendered with restrained language, never as member authorship.';