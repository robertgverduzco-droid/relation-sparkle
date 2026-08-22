-- =========================================================================
-- V1 STABILIZATION — least privilege, system-owned field protection,
-- monotonic foundational completion, photo moderation integrity.
-- =========================================================================

-- --- 1. Blanket hygiene: no member-facing role may ever hold these ---------
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated, anon', t.relname);
  END LOOP;
END $$;

-- --- 2. Member-owned tables: unchanged rights, explicit -------------------
REVOKE ALL ON public.user_preferences FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
REVOKE ALL ON public.user_prompts FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prompts TO authenticated;
REVOKE ALL ON public.user_readiness FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_readiness TO authenticated;
REVOKE ALL ON public.notification_preferences FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
REVOKE ALL ON public.blocks FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
REVOKE ALL ON public.member_consents FROM authenticated;
GRANT SELECT, INSERT ON public.member_consents TO authenticated;
REVOKE ALL ON public.understanding_revisions FROM authenticated;
GRANT SELECT, INSERT ON public.understanding_revisions TO authenticated;
REVOKE ALL ON public.enforcement_appeals FROM authenticated;
GRANT SELECT, INSERT ON public.enforcement_appeals TO authenticated;
REVOKE ALL ON public.athena_usage_log FROM authenticated;
GRANT SELECT, INSERT ON public.athena_usage_log TO authenticated;

-- --- 3. profiles: column-level member edits only --------------------------
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, birth_date, gender, pronouns, city, region, country,
              location_lat, location_lng, bio, height_cm, ethnicities,
              ethnicity_self_describe, religions, religion_self_describe, smoking)
  ON public.profiles TO authenticated;

-- --- 4. conversations: system owns membership and last_message_at ---------
REVOKE ALL ON public.conversations FROM authenticated;
GRANT SELECT ON public.conversations TO authenticated;
GRANT UPDATE (hidden_by) ON public.conversations TO authenticated;

-- --- 5. messages: sender writes, recipient marks read only ---------------
REVOKE ALL ON public.messages FROM authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

-- --- 6. Relational state tables: read-only to members --------------------
REVOKE ALL ON public.connections FROM authenticated;
GRANT SELECT ON public.connections TO authenticated;
DROP POLICY IF EXISTS "connections_participants_update" ON public.connections;

REVOKE ALL ON public.relationship_focus FROM authenticated;
GRANT SELECT ON public.relationship_focus TO authenticated;
DROP POLICY IF EXISTS "members create own focus" ON public.relationship_focus;
DROP POLICY IF EXISTS "members update own focus" ON public.relationship_focus;

REVOKE ALL ON public.member_transitions FROM authenticated;
GRANT SELECT ON public.member_transitions TO authenticated;
DROP POLICY IF EXISTS "own transitions updatable" ON public.member_transitions;

REVOKE ALL ON public.post_meeting_reflections FROM authenticated;
GRANT SELECT ON public.post_meeting_reflections TO authenticated;
DROP POLICY IF EXISTS "reflections_owner_all" ON public.post_meeting_reflections;
CREATE POLICY "reflections_owner_select" ON public.post_meeting_reflections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.partner_perception FROM authenticated;
GRANT SELECT ON public.partner_perception TO authenticated;
DROP POLICY IF EXISTS "author manages own perception" ON public.partner_perception;
CREATE POLICY "author reads own perception" ON public.partner_perception
  FOR SELECT TO authenticated USING (auth.uid() = author_id);

REVOKE ALL ON public.reflection_submissions FROM authenticated;
GRANT SELECT ON public.reflection_submissions TO authenticated;
DROP POLICY IF EXISTS "Members add their own reflection submissions" ON public.reflection_submissions;

REVOKE ALL ON public.introduction_responses FROM authenticated;
GRANT SELECT ON public.introduction_responses TO authenticated;
DROP POLICY IF EXISTS "own response" ON public.introduction_responses;
CREATE POLICY "own response readable" ON public.introduction_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.introduction_feedback FROM authenticated;
GRANT SELECT ON public.introduction_feedback TO authenticated;
DROP POLICY IF EXISTS "own feedback rw" ON public.introduction_feedback;
CREATE POLICY "own feedback readable" ON public.introduction_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.introduction_attraction FROM authenticated;
GRANT SELECT ON public.introduction_attraction TO authenticated;
DROP POLICY IF EXISTS "attraction_owner_all" ON public.introduction_attraction;
CREATE POLICY "attraction owner readable" ON public.introduction_attraction
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.notifications FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- --- 7. meeting proposals: created only in the proposed state -------------
REVOKE ALL ON public.meeting_proposals FROM authenticated;
GRANT SELECT, INSERT ON public.meeting_proposals TO authenticated;
DROP POLICY IF EXISTS "meeting_proposals_participants_update" ON public.meeting_proposals;
DROP POLICY IF EXISTS "meeting_proposals_participants_insert" ON public.meeting_proposals;
CREATE POLICY "meeting_proposals_participants_insert" ON public.meeting_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND status = 'proposed'
    AND confirmed_at IS NULL
    AND completed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.id = meeting_proposals.connection_id
        AND (auth.uid() = c.user_low OR auth.uid() = c.user_high)
    )
  );

-- --- 8. Athena-derived understanding stores: read-only to members ---------
REVOKE ALL ON public.user_intelligence FROM authenticated;
GRANT SELECT ON public.user_intelligence TO authenticated;
DROP POLICY IF EXISTS "intel_owner_all" ON public.user_intelligence;
CREATE POLICY "intel_owner_select" ON public.user_intelligence
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.topic_map FROM authenticated;
GRANT SELECT ON public.topic_map TO authenticated;
DROP POLICY IF EXISTS "own topic map" ON public.topic_map;
CREATE POLICY "own topic map readable" ON public.topic_map
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.understanding_facets FROM authenticated;
GRANT SELECT ON public.understanding_facets TO authenticated;
DROP POLICY IF EXISTS "own facets" ON public.understanding_facets;
CREATE POLICY "own facets readable" ON public.understanding_facets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.facet_history FROM authenticated;
GRANT SELECT ON public.facet_history TO authenticated;
DROP POLICY IF EXISTS "insert own facet history" ON public.facet_history;

REVOKE INSERT, UPDATE, DELETE ON public.pair_reasoning FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pair_reasoning_history FROM authenticated;

-- --- 9. Roles, entitlements, safety: read-only to members -----------------
REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

REVOKE ALL ON public.membership_entitlements FROM authenticated;
GRANT SELECT ON public.membership_entitlements TO authenticated;

REVOKE ALL ON public.entitlement_events FROM authenticated;
GRANT SELECT ON public.entitlement_events TO authenticated;

REVOKE ALL ON public.safety_flags FROM authenticated;
GRANT SELECT ON public.safety_flags TO authenticated;

REVOKE ALL ON public.enforcement_actions FROM authenticated;
GRANT SELECT ON public.enforcement_actions TO authenticated;

REVOKE ALL ON public.data_export_requests FROM authenticated;
GRANT SELECT ON public.data_export_requests TO authenticated;

REVOKE ALL ON public.reports FROM authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT UPDATE (status, resolved_by, resolved_at, resolution_note) ON public.reports TO authenticated;

-- --- 10. Photographs: moderation is never member-writable -----------------
REVOKE ALL ON public.user_photos FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_photos TO authenticated;
GRANT UPDATE (position, is_primary, alt_text) ON public.user_photos TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_photos_moderation_is_system_owned()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- auth.uid() is non-null only for a member-authenticated statement.
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.moderation := 'pending'::public.moderation_status;
    ELSE
      NEW.moderation := OLD.moderation;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_photos_moderation_guard ON public.user_photos;
CREATE TRIGGER user_photos_moderation_guard
  BEFORE INSERT OR UPDATE ON public.user_photos
  FOR EACH ROW EXECUTE FUNCTION public.tg_photos_moderation_is_system_owned();

-- --- 11. Foundational completion is monotonic -----------------------------
REVOKE ALL ON public.interview_sessions FROM authenticated;
GRANT SELECT, INSERT ON public.interview_sessions TO authenticated;
GRANT UPDATE (messages) ON public.interview_sessions TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_foundational_completion_monotonic()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE allow_reset boolean;
BEGIN
  allow_reset := coalesce(current_setting('athena.allow_foundational_reset', true), 'off') = 'on';
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.completed_at := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL AND NOT allow_reset THEN
    NEW.completed_at := OLD.completed_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS interview_sessions_completion_monotonic ON public.interview_sessions;
CREATE TRIGGER interview_sessions_completion_monotonic
  BEFORE INSERT OR UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_foundational_completion_monotonic();

-- --- 12. service_role keeps full reach on everything ----------------------
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;