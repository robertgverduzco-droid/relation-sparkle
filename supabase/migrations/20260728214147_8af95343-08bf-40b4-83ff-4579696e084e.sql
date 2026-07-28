-- Athena usage log for later billing (Stripe deferred)
CREATE TABLE public.athena_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  seconds integer,
  input_tokens integer,
  output_tokens integer,
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  billed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.athena_usage_log TO authenticated;
GRANT ALL ON public.athena_usage_log TO service_role;
ALTER TABLE public.athena_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.athena_usage_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own usage insert" ON public.athena_usage_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_athena_usage_user_time ON public.athena_usage_log (user_id, created_at DESC);

-- Realtime for messages already declared? Add publication if missing.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Ensure a conversation exists whenever a connection opens.
CREATE OR REPLACE FUNCTION public.ensure_conversation_for_connection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing uuid;
  intro_id uuid;
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS DISTINCT FROM 'open') THEN
    SELECT id INTO existing FROM public.conversations
      WHERE (user_a = NEW.user_low AND user_b = NEW.user_high)
         OR (user_a = NEW.user_high AND user_b = NEW.user_low)
      LIMIT 1;
    IF existing IS NULL THEN
      SELECT id INTO intro_id FROM public.introductions
        WHERE (user_a = NEW.user_low AND user_b = NEW.user_high)
           OR (user_a = NEW.user_high AND user_b = NEW.user_low)
        ORDER BY created_at DESC LIMIT 1;
      IF intro_id IS NOT NULL THEN
        INSERT INTO public.conversations (introduction_id, user_a, user_b, hidden_by)
        VALUES (intro_id, NEW.user_low, NEW.user_high, '{}'::jsonb);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_ensure_conversation ON public.connections;
CREATE TRIGGER tg_ensure_conversation
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.ensure_conversation_for_connection();