-- Structured self-description (member-stated only; never inferred).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS ethnicities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ethnicity_self_describe text,
  ADD COLUMN IF NOT EXISTS religions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS religion_self_describe text;

COMMENT ON COLUMN public.profiles.ethnicities IS 'Member-stated only. Athena must never infer this from photographs, names, language or location. The literal value prefer_not_to_say is an explicit, respected answer.';
COMMENT ON COLUMN public.profiles.religions IS 'Member-stated only. prefer_not_to_say is an explicit, respected answer.';

-- profiles uses column-level UPDATE grants; new columns need them explicitly.
GRANT UPDATE (height_cm, ethnicities, ethnicity_self_describe, religions, religion_self_describe)
  ON public.profiles TO authenticated;

-- Match preferences: openness, never rankings of groups.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ethnicity_openness text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS preferred_ethnicities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS religion_openness text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS preferred_religions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS height_min_cm integer,
  ADD COLUMN IF NOT EXISTS height_max_cm integer,
  ADD COLUMN IF NOT EXISTS height_strength text NOT NULL DEFAULT 'preference',
  ADD COLUMN IF NOT EXISTS additional_notes text;

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_ethnicity_openness_check,
  DROP CONSTRAINT IF EXISTS user_preferences_religion_openness_check,
  DROP CONSTRAINT IF EXISTS user_preferences_height_strength_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_ethnicity_openness_check
    CHECK (ethnicity_openness IN ('open', 'preference', 'requirement', 'discuss_with_athena')),
  ADD CONSTRAINT user_preferences_religion_openness_check
    CHECK (religion_openness IN ('open', 'preference', 'requirement', 'discuss_with_athena')),
  ADD CONSTRAINT user_preferences_height_strength_check
    CHECK (height_strength IN ('preference', 'requirement'));

COMMENT ON COLUMN public.user_preferences.additional_notes IS 'Member-stated free text: anything else Athena should know about who they are open to meeting. Private to the member and Athena; never shown to another member.';
