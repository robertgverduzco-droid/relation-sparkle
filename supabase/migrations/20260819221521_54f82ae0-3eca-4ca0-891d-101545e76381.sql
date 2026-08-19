-- D-44 / F-33: attraction response + photo alt text + five-photo enforcement

CREATE TYPE public.attraction_response AS ENUM ('drawn','curious','unsure','not_there');

CREATE TABLE public.introduction_attraction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.pair_reasoning(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response public.attraction_response NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pair_id, user_id)
);
CREATE INDEX introduction_attraction_user_idx ON public.introduction_attraction(user_id);

-- Private to the member who recorded it. The counterpart holds no grant of any
-- kind: an attraction response is never visible to the person it concerns.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.introduction_attraction TO authenticated;
GRANT ALL ON public.introduction_attraction TO service_role;
ALTER TABLE public.introduction_attraction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attraction_owner_all" ON public.introduction_attraction
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER introduction_attraction_set_updated_at
  BEFORE UPDATE ON public.introduction_attraction
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Member-authored accessible description of their own photograph.
ALTER TABLE public.user_photos ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- D-07: five photographs is the canonical maximum, enforced at the database so
-- no client path (or race) can exceed it.
CREATE OR REPLACE FUNCTION public.tg_enforce_photo_maximum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM public.user_photos WHERE user_id = NEW.user_id;
  IF n >= 5 THEN
    RAISE EXCEPTION 'A member may have at most five photographs.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER user_photos_enforce_maximum
  BEFORE INSERT ON public.user_photos
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_photo_maximum();