-- 1. Deletion tombstones: hashed, non-identifying proof that a member exercised
--    permanent deletion. Used to replay deletion after any backup restore.
CREATE TABLE public.purge_tombstones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_hash text NOT NULL UNIQUE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'member_request',
  last_replayed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.purge_tombstones TO service_role;
ALTER TABLE public.purge_tombstones ENABLE ROW LEVEL SECURITY;
-- No policies: unreachable from anon/authenticated by design.

-- 2. Restore reconciliations: an auditable record of each deletion replay.
CREATE TABLE public.restore_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL,
  tombstones_checked integer NOT NULL DEFAULT 0,
  subjects_repurged integer NOT NULL DEFAULT 0,
  rows_removed jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.restore_reconciliations TO service_role;
ALTER TABLE public.restore_reconciliations ENABLE ROW LEVEL SECURITY;

-- 3. Understanding revisions (F-13 Change / Correction / Removal).
CREATE TABLE public.understanding_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facet_key text NOT NULL,
  revision_kind text NOT NULL CHECK (revision_kind IN ('change','correction','removal')),
  member_statement text,
  previous_understanding text,
  previous_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX understanding_revisions_user_idx ON public.understanding_revisions (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.understanding_revisions TO authenticated;
GRANT ALL ON public.understanding_revisions TO service_role;
ALTER TABLE public.understanding_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own revisions"
  ON public.understanding_revisions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members record their own revisions"
  ON public.understanding_revisions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Export requests (F-11): rate limiting + audit of personal data exports.
CREATE TABLE public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  allowlist_version text NOT NULL,
  byte_size integer,
  section_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX data_export_requests_user_idx ON public.data_export_requests (user_id, created_at DESC);
GRANT SELECT ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own export history"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);