
-- CONNECTIONS: opened when both users accept an introduction.
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id UUID NOT NULL REFERENCES public.pair_reasoning(id) ON DELETE CASCADE UNIQUE,
  user_low UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','meeting_planned','met','closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_low < user_high)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_participants_select" ON public.connections
  FOR SELECT TO authenticated USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "connections_participants_update" ON public.connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_low OR auth.uid() = user_high)
  WITH CHECK (auth.uid() = user_low OR auth.uid() = user_high);
CREATE TRIGGER connections_set_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX connections_user_low_idx ON public.connections(user_low);
CREATE INDEX connections_user_high_idx ON public.connections(user_high);

-- MEETING PROPOSALS: lightweight proposals either person can make/confirm.
CREATE TABLE public.meeting_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  when_text TEXT,
  where_text TEXT,
  notes TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','completed','canceled')),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_proposals TO authenticated;
GRANT ALL ON public.meeting_proposals TO service_role;
ALTER TABLE public.meeting_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_proposals_participants_select" ON public.meeting_proposals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND (auth.uid() = c.user_low OR auth.uid() = c.user_high))
  );
CREATE POLICY "meeting_proposals_participants_insert" ON public.meeting_proposals
  FOR INSERT TO authenticated WITH CHECK (
    proposed_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND (auth.uid() = c.user_low OR auth.uid() = c.user_high))
  );
CREATE POLICY "meeting_proposals_participants_update" ON public.meeting_proposals
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND (auth.uid() = c.user_low OR auth.uid() = c.user_high))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.connections c WHERE c.id = connection_id AND (auth.uid() = c.user_low OR auth.uid() = c.user_high))
  );
CREATE TRIGGER meeting_proposals_set_updated_at BEFORE UPDATE ON public.meeting_proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX meeting_proposals_connection_idx ON public.meeting_proposals(connection_id);

-- POST-MEETING REFLECTIONS: private conversation with Athena after meeting.
CREATE TABLE public.post_meeting_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('warm','neutral','off','unsure')),
  would_meet_again BOOLEAN,
  refined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_meeting_reflections TO authenticated;
GRANT ALL ON public.post_meeting_reflections TO service_role;
ALTER TABLE public.post_meeting_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reflections_owner_all" ON public.post_meeting_reflections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER reflections_set_updated_at BEFORE UPDATE ON public.post_meeting_reflections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX reflections_connection_idx ON public.post_meeting_reflections(connection_id);
