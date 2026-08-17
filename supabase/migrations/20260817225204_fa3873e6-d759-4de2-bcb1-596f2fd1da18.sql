-- A-07: Athena's private understanding is not member-writable.
REVOKE INSERT, UPDATE, DELETE ON public.understanding_facets FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.facet_history FROM authenticated;
GRANT SELECT ON public.understanding_facets TO authenticated;
GRANT SELECT ON public.facet_history TO authenticated;
GRANT ALL ON public.understanding_facets TO service_role;
GRANT ALL ON public.facet_history TO service_role;

-- A-08: profiles are self-editable only for member-owned identity columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  display_name, birth_date, gender, pronouns, city, region, country,
  bio, location_lat, location_lng
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- A-09: durable, cross-instance rate limiting for abuse-sensitive actions.
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_counters TO service_role;

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_counters_service_only"
  ON public.rate_limit_counters FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER rate_limit_counters_set_updated_at
  BEFORE UPDATE ON public.rate_limit_counters
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Atomic consume: returns true when the caller is still within the window budget.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _key text, _limit integer, _window_ms integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur public.rate_limit_counters%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limit_counters (bucket_key, count, reset_at)
  VALUES (_key, 1, now() + make_interval(secs => _window_ms / 1000.0))
  ON CONFLICT (bucket_key) DO UPDATE
    SET count = CASE
          WHEN public.rate_limit_counters.reset_at < now() THEN 1
          ELSE public.rate_limit_counters.count + 1
        END,
        reset_at = CASE
          WHEN public.rate_limit_counters.reset_at < now()
            THEN now() + make_interval(secs => _window_ms / 1000.0)
          ELSE public.rate_limit_counters.reset_at
        END
  RETURNING * INTO cur;

  RETURN cur.count <= _limit;
END $$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;