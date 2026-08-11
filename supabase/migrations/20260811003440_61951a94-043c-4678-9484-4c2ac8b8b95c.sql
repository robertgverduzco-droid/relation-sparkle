-- 1. Least privilege: signed-out visitors have no table privileges at all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- 2. Administrative audit log (append-only).
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'service',
  action text NOT NULL,
  data_class smallint NOT NULL DEFAULT 4,
  subject_id uuid,
  resource text,
  purpose text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_subject_idx ON public.admin_audit_log (subject_id);

-- 3. Consent records (versioned, append-only per grant/revoke).
CREATE TABLE public.member_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_key text NOT NULL,
  version text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.member_consents TO authenticated;
GRANT ALL ON public.member_consents TO service_role;
ALTER TABLE public.member_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own consents" ON public.member_consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "members record own consents" ON public.member_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX member_consents_user_idx ON public.member_consents (user_id, consent_key, created_at DESC);

-- 4. Security kill switches.
CREATE TABLE public.security_kill_switches (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  note text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_kill_switches TO authenticated;
GRANT ALL ON public.security_kill_switches TO service_role;
ALTER TABLE public.security_kill_switches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read switch state" ON public.security_kill_switches
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.security_kill_switches (key, note) VALUES
  ('matchmaking', 'Pair reasoning and introduction presentation'),
  ('messaging', 'Member-to-member messaging'),
  ('athena_conversation', 'Athena AI conversation (text and voice)'),
  ('account_creation', 'New member sign-up'),
  ('data_export', 'Member data export generation'),
  ('notifications', 'Notification delivery')
ON CONFLICT (key) DO NOTHING;