CREATE OR REPLACE FUNCTION public.tg_predictions_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'athena_predictions is append-only';
  END IF;
  -- DELETE is permitted only for the permanent-deletion path, which sets the
  -- flag below. The Permanent Deletion Standard outranks append-only history.
  IF coalesce(current_setting('athena.allow_prediction_purge', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'athena_predictions may only be deleted by the member purge path';
  END IF;
  RETURN OLD;
END $$;

GRANT DELETE ON public.athena_predictions TO service_role;

CREATE OR REPLACE FUNCTION public.purge_predictions_for_tokens(_tokens text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  PERFORM set_config('athena.allow_prediction_purge', 'on', true);
  WITH d AS (
    DELETE FROM public.athena_predictions WHERE pair_token = ANY(_tokens) RETURNING 1
  )
  SELECT count(*) INTO removed FROM d;
  DELETE FROM public.athena_prediction_outcomes WHERE pair_token = ANY(_tokens);
  DELETE FROM public.athena_hypothesis_evidence WHERE pair_token = ANY(_tokens);
  PERFORM set_config('athena.allow_prediction_purge', 'off', true);
  RETURN removed;
END $$;

REVOKE ALL ON FUNCTION public.purge_predictions_for_tokens(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_predictions_for_tokens(text[]) TO service_role;