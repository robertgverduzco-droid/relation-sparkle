ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS smoking text;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS age_strength text NOT NULL DEFAULT 'preference',
  ADD COLUMN IF NOT EXISTS children_strength text NOT NULL DEFAULT 'preference',
  ADD COLUMN IF NOT EXISTS smoking_openness text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS preferred_smoking text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_smoking_check
  CHECK (smoking IS NULL OR smoking IN ('no','occasionally','yes','prefer_not_to_say'));

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_age_strength_check
  CHECK (age_strength IN ('preference','requirement'));

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_children_strength_check
  CHECK (children_strength IN ('preference','requirement'));

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_smoking_openness_check
  CHECK (smoking_openness IN ('open','preference','requirement','discuss_with_athena'));