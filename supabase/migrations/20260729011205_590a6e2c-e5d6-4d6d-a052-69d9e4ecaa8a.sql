
-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own roles readable" ON public.user_roles;
CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 2) Reports moderation columns + policies
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text;

DROP POLICY IF EXISTS "moderators can read reports" ON public.reports;
CREATE POLICY "moderators can read reports" ON public.reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "moderators can resolve reports" ON public.reports;
CREATE POLICY "moderators can resolve reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- 3) Feedback → stale pair_reasoning
CREATE OR REPLACE FUNCTION public.tg_mark_pair_reasoning_stale_for_perception()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pair_reasoning
     SET is_stale = true, stale_reason = 'post-meeting signal'
   WHERE user_low IN (NEW.author_id, NEW.subject_id)
      OR user_high IN (NEW.author_id, NEW.subject_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_perception_marks_stale ON public.partner_perception;
CREATE TRIGGER tg_perception_marks_stale
AFTER INSERT OR UPDATE ON public.partner_perception
FOR EACH ROW EXECUTE FUNCTION public.tg_mark_pair_reasoning_stale_for_perception();

CREATE OR REPLACE FUNCTION public.tg_mark_pair_reasoning_stale_for_reflection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pair_reasoning
     SET is_stale = true, stale_reason = 'post-meeting reflection'
   WHERE user_low = NEW.user_id OR user_high = NEW.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_reflection_marks_stale ON public.post_meeting_reflections;
CREATE TRIGGER tg_reflection_marks_stale
AFTER INSERT OR UPDATE ON public.post_meeting_reflections
FOR EACH ROW EXECUTE FUNCTION public.tg_mark_pair_reasoning_stale_for_reflection();

-- 4) Matchmaking cooldown
ALTER TABLE public.user_intelligence
  ADD COLUMN IF NOT EXISTS last_matchmaking_at timestamptz;
