-- 1. Retire dead, anon-readable interview_shares
DROP TABLE IF EXISTS public.interview_shares CASCADE;

-- 2. Retire orphaned legacy reflections table (superseded by
--    post_meeting_reflections + reflection_submissions)
DROP TABLE IF EXISTS public.reflections CASCADE;

-- 3. Reconcile matchmaking path: pair_reasoning -> introduction_responses ->
--    connections -> conversations. The legacy matches/introductions tables are
--    no longer written or read by any runtime code.
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_introduction_id_fkey;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS introduction_id;
DROP TABLE IF EXISTS public.introductions CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_conversation_for_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing uuid;
BEGIN
  IF NEW.status IN ('open', 'mutual_interest') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT id INTO existing FROM public.conversations
      WHERE (user_a = NEW.user_low AND user_b = NEW.user_high)
         OR (user_a = NEW.user_high AND user_b = NEW.user_low)
      LIMIT 1;
    IF existing IS NULL THEN
      INSERT INTO public.conversations (user_a, user_b, hidden_by)
      VALUES (NEW.user_low, NEW.user_high, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 4. Restrict has_role so members cannot enumerate other members' roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    -- Trusted server-side contexts (service_role / internal jobs) have no JWT.
    WHEN auth.uid() IS NULL THEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
    -- A signed-in member may only ask about themselves.
    WHEN auth.uid() = _user_id THEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
    -- Admins may ask about anyone.
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
    ELSE false
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 5. Mark remaining legacy naming (kept for data continuity only).
COMMENT ON TABLE public.interview_sessions IS
  'LEGACY NAME. This stores Athena''s ongoing foundational conversation with a member. Athena never conducts interviews; the name is retained only for data/migration continuity.';
COMMENT ON COLUMN public.user_intelligence.last_interview_at IS
  'LEGACY NAME. Timestamp of the member''s most recent foundational conversation with Athena.';