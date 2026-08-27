CREATE TABLE public.personality_variant_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  variant text NOT NULL DEFAULT 'standard' CHECK (variant IN ('standard', 'warm_experimental')),
  set_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.personality_variant_overrides TO service_role;

ALTER TABLE public.personality_variant_overrides ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tg_pvo_updated BEFORE UPDATE ON public.personality_variant_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();