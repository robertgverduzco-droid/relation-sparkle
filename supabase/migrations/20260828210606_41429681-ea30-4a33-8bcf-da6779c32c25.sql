ALTER TABLE public.live_voice_grants
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS refreshed_at timestamptz;