ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hobbies text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS hobbies_note text,
  ADD COLUMN IF NOT EXISTS drinking text;

GRANT UPDATE (hobbies, hobbies_note, drinking) ON public.profiles TO authenticated;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS drinking_openness text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS preferred_drinking text[] NOT NULL DEFAULT '{}'::text[];

GRANT INSERT (drinking_openness, preferred_drinking) ON public.user_preferences TO authenticated;
GRANT UPDATE (drinking_openness, preferred_drinking) ON public.user_preferences TO authenticated;