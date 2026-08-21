-- Regression repair: public.profiles UPDATE is column-scoped (A-08). The
-- `smoking` column was added by the structured self-description work after the
-- column grants were written, so the authenticated member had no privilege to
-- write it -> "permission denied for table profiles" on the qualifying save.
-- Server-owned columns (onboarding_stage, onboarding_completed_at, is_paused,
-- learning_opt_out, is_synthetic, timestamps) intentionally remain ungranted.
GRANT UPDATE (smoking) ON public.profiles TO authenticated;