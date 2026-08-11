-- F-05: precise coordinates are no longer retained. No feature reads or
-- writes them; existing values are cleared and future writes are rejected.
UPDATE public.profiles
SET location_lat = NULL, location_lng = NULL
WHERE location_lat IS NOT NULL OR location_lng IS NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_precise_coordinates
  CHECK (location_lat IS NULL AND location_lng IS NULL);

COMMENT ON COLUMN public.profiles.location_lat IS 'Retired by founder decision F-05: precise coordinates are not retained.';
COMMENT ON COLUMN public.profiles.location_lng IS 'Retired by founder decision F-05: precise coordinates are not retained.';