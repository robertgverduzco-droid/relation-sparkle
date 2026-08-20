ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_synthetic_idx ON public.profiles (is_synthetic);

CREATE TABLE public.synthetic_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  note text,
  requested_size integer NOT NULL,
  created_size integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.synthetic_batches TO service_role;

ALTER TABLE public.synthetic_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.synthetic_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.synthetic_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  label text NOT NULL,
  credential_issued_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX synthetic_accounts_batch_idx ON public.synthetic_accounts (batch_id);
CREATE UNIQUE INDEX synthetic_accounts_user_idx ON public.synthetic_accounts (user_id);

GRANT ALL ON public.synthetic_accounts TO service_role;

ALTER TABLE public.synthetic_accounts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER synthetic_batches_set_updated_at
  BEFORE UPDATE ON public.synthetic_batches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER synthetic_accounts_set_updated_at
  BEFORE UPDATE ON public.synthetic_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();