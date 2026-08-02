-- Ending choice: the three paths a member may take after a connection ends.
CREATE TABLE public.member_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  choice text CHECK (choice IN ('rest','resume','talk')),
  chosen_at timestamp with time zone,
  hold_until timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX member_transitions_open_idx
  ON public.member_transitions (user_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.member_transitions TO authenticated;
GRANT ALL ON public.member_transitions TO service_role;
ALTER TABLE public.member_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transitions readable" ON public.member_transitions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own transitions updatable" ON public.member_transitions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER member_transitions_updated_at BEFORE UPDATE ON public.member_transitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Relationship Focus Mode: a mutual, intentional transition in Athena's role.
CREATE TABLE public.relationship_focus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL UNIQUE REFERENCES public.connections(id) ON DELETE CASCADE,
  user_low uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  low_opted_in_at timestamp with time zone,
  high_opted_in_at timestamp with time zone,
  started_at timestamp with time zone,
  last_checkin_at timestamp with time zone,
  ended_at timestamp with time zone,
  ended_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.relationship_focus TO authenticated;
GRANT ALL ON public.relationship_focus TO service_role;
ALTER TABLE public.relationship_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own focus" ON public.relationship_focus
  FOR SELECT TO authenticated USING (user_low = auth.uid() OR user_high = auth.uid());
CREATE POLICY "members create own focus" ON public.relationship_focus
  FOR INSERT TO authenticated WITH CHECK (user_low = auth.uid() OR user_high = auth.uid());
CREATE POLICY "members update own focus" ON public.relationship_focus
  FOR UPDATE TO authenticated USING (user_low = auth.uid() OR user_high = auth.uid())
  WITH CHECK (user_low = auth.uid() OR user_high = auth.uid());
CREATE TRIGGER relationship_focus_updated_at BEFORE UPDATE ON public.relationship_focus
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();