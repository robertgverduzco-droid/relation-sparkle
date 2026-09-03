-- "Something's off" must genuinely reopen the reveal, not just log a note
-- nobody reads. This column tracks whether the current (unconfirmed) reveal
-- text has already used its one AI rewrite in response to a member flag.
-- It resets to false whenever the text actually changes for any reason,
-- including the existing unrelated self-healing regeneration path.
ALTER TABLE public.reveal_summaries
  ADD COLUMN IF NOT EXISTS regenerated_once boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reveal_summaries.regenerated_once IS
  'Whether this unconfirmed reveal text has already been rewritten once in response to a member flagging it as wrong. Caps rewrites at one per text; a fresh regeneration for any reason resets it to false. Never set once confirmed_at is set.';
