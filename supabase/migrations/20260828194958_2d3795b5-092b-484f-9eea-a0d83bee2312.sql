CREATE TABLE public.live_voice_grants (
  conversation_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.live_voice_grants TO service_role;

ALTER TABLE public.live_voice_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_live_voice_grants_expires_at ON public.live_voice_grants (expires_at);