
ALTER TABLE public.interview_shares
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ;
