CREATE TABLE public.membership_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key text,
  status text NOT NULL DEFAULT 'none',
  provider text NOT NULL DEFAULT 'none',
  environment text NOT NULL DEFAULT 'development',
  product_id text,
  original_transaction_id text,
  billing_period text,
  current_period_end timestamptz,
  grace_until timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  granted_by uuid REFERENCES auth.users(id),
  grant_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_status_known CHECK (status IN ('none','active','grace','canceled_active','expired','revoked')),
  CONSTRAINT membership_provider_known CHECK (provider IN ('none','apple_app_store','web_billing','internal_test')),
  CONSTRAINT membership_environment_known CHECK (environment IN ('development','production'))
);

GRANT SELECT ON public.membership_entitlements TO authenticated;
GRANT ALL ON public.membership_entitlements TO service_role;

ALTER TABLE public.membership_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_owner_select"
  ON public.membership_entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER membership_entitlements_set_updated_at
  BEFORE UPDATE ON public.membership_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_guard_internal_test_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.provider = 'internal_test' AND NEW.environment = 'production' THEN
    RAISE EXCEPTION 'internal_test entitlements may never be marked production';
  END IF;
  IF NEW.provider = 'internal_test' AND NEW.grant_reason IS NULL THEN
    RAISE EXCEPTION 'internal_test entitlements require a recorded grant_reason';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER membership_entitlements_guard_internal_test
  BEFORE INSERT OR UPDATE ON public.membership_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_internal_test_entitlement();

CREATE TABLE public.entitlement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL,
  plan_key text,
  product_id text,
  actor text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entitlement_events_user_idx ON public.entitlement_events (user_id, created_at DESC);

GRANT SELECT ON public.entitlement_events TO authenticated;
GRANT ALL ON public.entitlement_events TO service_role;

ALTER TABLE public.entitlement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entitlement_events_owner_select"
  ON public.entitlement_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());