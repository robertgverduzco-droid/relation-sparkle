ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_by_moderator boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.suspended_by_moderator IS
  'True while the current is_paused hold was imposed by moderation, not the member''s own choice. Never member-writable; cleared only by a moderator reinstating the account.';

ALTER TABLE public.reveal_summaries
  ADD COLUMN IF NOT EXISTS regenerated_once boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reveal_summaries.regenerated_once IS
  'Whether this unconfirmed reveal text has already been rewritten once in response to a member flagging it as wrong. Caps rewrites at one per text; a fresh regeneration for any reason resets it to false. Never set once confirmed_at is set.';