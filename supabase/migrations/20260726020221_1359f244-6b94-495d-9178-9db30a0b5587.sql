
-- =========================
-- Enums
-- =========================
CREATE TYPE public.onboarding_stage AS ENUM ('welcome','identity','intelligence','preferences','readiness','prompts','photos','complete');
CREATE TYPE public.match_status AS ENUM ('proposed','accepted_by_a','accepted_by_b','mutual','declined','expired');
CREATE TYPE public.message_kind AS ENUM ('text','system','date_proposal','safety_notice');
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.safety_severity AS ENUM ('low','medium','high','critical');

-- =========================
-- Helper: updated_at
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  birth_date DATE,
  gender TEXT,
  pronouns TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  bio TEXT,
  onboarding_stage public.onboarding_stage NOT NULL DEFAULT 'welcome',
  onboarding_completed_at TIMESTAMPTZ,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner_all" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- user_intelligence (personal understanding narrative)
-- =========================
CREATE TABLE public.user_intelligence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  core_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  life_direction TEXT,
  self_understanding TEXT,
  emotional_patterns TEXT,
  communication_style TEXT,
  attachment_style TEXT,
  conflict_style TEXT,
  daily_lifestyle TEXT,
  ideal_week TEXT,
  meaning_of_relationship TEXT,
  ai_insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_intelligence TO authenticated;
GRANT ALL ON public.user_intelligence TO service_role;
ALTER TABLE public.user_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intel_owner_all" ON public.user_intelligence FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_intel_updated BEFORE UPDATE ON public.user_intelligence FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- user_preferences (partner preferences)
-- =========================
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeking_genders TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  age_min INT,
  age_max INT,
  max_distance_km INT,
  relationship_intent TEXT,
  wants_children TEXT,
  deal_breakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  lifestyle_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_owner_all" ON public.user_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- user_readiness (relationship readiness reflection)
-- =========================
CREATE TABLE public.user_readiness (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emotional_availability INT,
  time_availability INT,
  clarity_of_want INT,
  healing_notes TEXT,
  ready_reflection TEXT,
  overall_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_readiness TO authenticated;
GRANT ALL ON public.user_readiness TO service_role;
ALTER TABLE public.user_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ready_owner_all" ON public.user_readiness FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ready_updated BEFORE UPDATE ON public.user_readiness FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- user_prompts (voice/depth prompts)
-- =========================
CREATE TABLE public.user_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_key TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prompts TO authenticated;
GRANT ALL ON public.user_prompts TO service_role;
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompts_owner_all" ON public.user_prompts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON public.user_prompts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- user_photos
-- =========================
CREATE TABLE public.user_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  moderation public.moderation_status NOT NULL DEFAULT 'pending',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_photos TO authenticated;
GRANT ALL ON public.user_photos TO service_role;
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_owner_all" ON public.user_photos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================
-- matches (proposed introduction pair)
-- =========================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.match_status NOT NULL DEFAULT 'proposed',
  ai_context TEXT,
  ai_why JSONB NOT NULL DEFAULT '{}'::jsonb,
  compatibility_score INT,
  decided_by_a_at TIMESTAMPTZ,
  decided_by_b_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_distinct_users CHECK (user_a <> user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX matches_user_a_idx ON public.matches(user_a);
CREATE INDEX matches_user_b_idx ON public.matches(user_b);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_participant_select" ON public.matches FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "matches_participant_update" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() IN (user_a, user_b)) WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- introductions (both accepted)
-- =========================
CREATE TABLE public.introductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_opening TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.introductions TO authenticated;
GRANT ALL ON public.introductions TO service_role;
ALTER TABLE public.introductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intro_participant_select" ON public.introductions FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));

-- =========================
-- conversations
-- =========================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_id UUID NOT NULL UNIQUE REFERENCES public.introductions(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  hidden_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conv_user_a_idx ON public.conversations(user_a);
CREATE INDEX conv_user_b_idx ON public.conversations(user_b);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_participant_select" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "conv_participant_update" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (user_a, user_b)) WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- messages
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.message_kind NOT NULL DEFAULT 'text',
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  flagged_severity public.safety_severity,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_participant_select" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
);
CREATE POLICY "messages_sender_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
);
CREATE POLICY "messages_sender_update" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b))
);

-- =========================
-- blocks
-- =========================
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_owner_all" ON public.blocks FOR ALL TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

-- =========================
-- reports
-- =========================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  details TEXT,
  severity public.safety_severity NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_reporter_select" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "reports_reporter_insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- =========================
-- safety_flags (system-generated)
-- =========================
CREATE TABLE public.safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity public.safety_severity NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_flags TO authenticated;
GRANT ALL ON public.safety_flags TO service_role;
ALTER TABLE public.safety_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_user_select" ON public.safety_flags FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =========================
-- reflections (private post-date)
-- =========================
CREATE TABLE public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  met_in_person BOOLEAN,
  connection_rating INT,
  notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflections TO authenticated;
GRANT ALL ON public.reflections TO service_role;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refl_owner_all" ON public.reflections FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_refl_updated BEFORE UPDATE ON public.reflections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
