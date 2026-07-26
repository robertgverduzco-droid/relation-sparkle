CREATE TABLE public.interview_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_shares TO authenticated;
GRANT SELECT ON public.interview_shares TO anon;
GRANT ALL ON public.interview_shares TO service_role;

ALTER TABLE public.interview_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shares"
  ON public.interview_shares FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read active shares by token"
  ON public.interview_shares FOR SELECT
  TO anon, authenticated
  USING (revoked_at IS NULL);

CREATE TRIGGER set_interview_shares_updated_at
  BEFORE UPDATE ON public.interview_shares
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX interview_shares_user_id_idx ON public.interview_shares(user_id);
CREATE INDEX interview_shares_token_idx ON public.interview_shares(token);