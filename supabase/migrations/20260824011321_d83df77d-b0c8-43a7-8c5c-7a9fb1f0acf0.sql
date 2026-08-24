CREATE TABLE public.athena_closet_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('closet_impression','closet_click')),
  surface TEXT NOT NULL DEFAULT 'conversation',
  session_id UUID,
  had_rapport BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.athena_closet_events TO service_role;

ALTER TABLE public.athena_closet_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX athena_closet_events_kind_idx ON public.athena_closet_events (kind, created_at DESC);
CREATE INDEX athena_closet_events_user_idx ON public.athena_closet_events (user_id, kind);