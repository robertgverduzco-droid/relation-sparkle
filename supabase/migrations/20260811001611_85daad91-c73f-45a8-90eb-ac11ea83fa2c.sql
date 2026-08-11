CREATE TABLE public.member_readiness (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'A' CHECK (state IN ('A','B','C')),
  reason_code text,
  reason_text text,
  hold_kind text,
  hold_until timestamptz,
  last_evaluated_at timestamptz NOT NULL DEFAULT now(),
  last_trigger text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.member_readiness TO authenticated;
GRANT ALL ON public.member_readiness TO service_role;
ALTER TABLE public.member_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "readiness_select_own" ON public.member_readiness
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER member_readiness_set_updated_at
  BEFORE UPDATE ON public.member_readiness
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('account','athena','introductions','connections','messages','reflection','relationship','safety')),
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  action_path text,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','web_push')),
  delivery_status text NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('pending','delivered','suppressed','failed')),
  dedupe_key text NOT NULL,
  read_at timestamptz,
  expires_at timestamptz,
  obsolete_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_dedupe_idx ON public.notifications (user_id, dedupe_key);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages boolean NOT NULL DEFAULT true,
  introductions boolean NOT NULL DEFAULT true,
  reflection boolean NOT NULL DEFAULT true,
  athena boolean NOT NULL DEFAULT true,
  relationship boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_manage_own" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();