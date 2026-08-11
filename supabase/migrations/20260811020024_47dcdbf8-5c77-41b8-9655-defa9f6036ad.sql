-- 1. Step-up reauthentication grants (F-12)
CREATE TABLE public.step_up_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX step_up_grants_user_idx ON public.step_up_grants(user_id, purpose);
GRANT ALL ON public.step_up_grants TO service_role;
ALTER TABLE public.step_up_grants ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only. Members never read their own grants.

-- 2. Enforcement actions ladder
CREATE TABLE public.enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 4),
  action text NOT NULL CHECK (action IN (
    'warning','messaging_restriction','introduction_suspension',
    'account_hold','suspension','removal'
  )),
  conduct_category text NOT NULL,
  severity safety_severity NOT NULL,
  evidence_basis text NOT NULL,
  behavior_note text NOT NULL,
  immediate_path boolean NOT NULL DEFAULT false,
  prior_action_count integer NOT NULL DEFAULT 0,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_by_system text,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'substantiated'
    CHECK (review_status IN ('pending_review','substantiated','overturned','expired')),
  appeal_status text NOT NULL DEFAULT 'not_requested'
    CHECK (appeal_status IN ('not_requested','open','upheld','granted','refused_repeat')),
  restriction_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enforcement_actions_user_idx ON public.enforcement_actions(user_id, created_at DESC);
GRANT SELECT ON public.enforcement_actions TO authenticated;
GRANT ALL ON public.enforcement_actions TO service_role;
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own enforcement actions"
  ON public.enforcement_actions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Moderators and admins see all enforcement actions"
  ON public.enforcement_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER enforcement_actions_set_updated_at
  BEFORE UPDATE ON public.enforcement_actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Appeals
CREATE TABLE public.enforcement_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','upheld','granted','refused_repeat')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX enforcement_appeals_one_per_action ON public.enforcement_appeals(action_id);
GRANT SELECT, INSERT ON public.enforcement_appeals TO authenticated;
GRANT ALL ON public.enforcement_appeals TO service_role;
ALTER TABLE public.enforcement_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own appeals"
  ON public.enforcement_appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Members file their own appeals"
  ON public.enforcement_appeals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Moderators and admins see all appeals"
  ON public.enforcement_appeals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- 4. Hashed banned identifiers (F-17)
CREATE TABLE public.banned_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash text NOT NULL,
  identifier_kind text NOT NULL CHECK (identifier_kind IN ('email','phone')),
  reason_category text NOT NULL,
  action_id uuid REFERENCES public.enforcement_actions(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX banned_identifiers_hash_idx ON public.banned_identifiers(identifier_hash);
GRANT ALL ON public.banned_identifiers TO service_role;
ALTER TABLE public.banned_identifiers ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.

-- 5. Operational monitoring
CREATE TABLE public.ops_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  worst_level text NOT NULL DEFAULT 'ok' CHECK (worst_level IN ('ok','warning','elevated','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_snapshots_created_idx ON public.ops_snapshots(created_at DESC);
GRANT SELECT ON public.ops_snapshots TO authenticated;
GRANT ALL ON public.ops_snapshots TO service_role;
ALTER TABLE public.ops_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder and admins read ops snapshots"
  ON public.ops_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ops_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  level text NOT NULL CHECK (level IN ('warning','elevated','critical')),
  value numeric,
  threshold numeric,
  summary text NOT NULL,
  dedupe_key text NOT NULL,
  external_delivery text NOT NULL DEFAULT 'not_attempted'
    CHECK (external_delivery IN ('not_attempted','delivered','failed','not_configured')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_alerts_open_idx ON public.ops_alerts(resolved_at, created_at DESC);
CREATE UNIQUE INDEX ops_alerts_dedupe_idx ON public.ops_alerts(dedupe_key) WHERE resolved_at IS NULL;
GRANT SELECT, UPDATE ON public.ops_alerts TO authenticated;
GRANT ALL ON public.ops_alerts TO service_role;
ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder and admins read ops alerts"
  ON public.ops_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founder and admins acknowledge ops alerts"
  ON public.ops_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));