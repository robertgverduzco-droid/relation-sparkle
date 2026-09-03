-- Moderator-imposed account holds are not member-liftable.
--
-- Previously a moderator "suspend" action and a member's own pause toggle
-- shared the single `is_paused` flag, so a member could clear a moderation
-- hold on themselves from /profile with no distinction from an ordinary
-- self-pause. This column marks that the current hold was imposed by
-- moderation; only a moderator (via the service role) may ever clear it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_by_moderator boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.suspended_by_moderator IS
  'True while the current is_paused hold was imposed by moderation, not the member''s own choice. Never member-writable; cleared only by a moderator reinstating the account.';
