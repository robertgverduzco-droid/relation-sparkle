# Athena Corrections Plan — Phases 1 & 2

Verified against AI Gateway logs: `openai/gpt-5.5` is live and returning HTTP 200 (e.g. log `019fa026-977f-7378-aecd-eca679a55de9`, 2026-07-26T20:38:36Z, 8419→215 tokens). No model swap needed. STT is already `openai/gpt-4o-transcribe`; TTS is `openai/gpt-4o-mini-tts` — both correctly separated from the reasoning model.

Governing anchors: L1 Identity (Mission), L6a Conversational Reasoning (foundational conversation), L6c Decision & Introduction (eligibility gate, 3-intro cap, matchmaking triggers), L4 Epistemics (contradictions & confidence), L2 Ethics (safety/pause/delete).

---

## Phase 1 — Verify and stabilize

### 1.1 Restore 20-minute foundational conversation
Anchor: `L6a-conversational-reasoning.md`, `L6c-decision-and-introduction.md#foundational-conversation-eligibility-gate`.

Files:
- `src/lib/athena.server.ts` — system prompt: any "12 minute" language → "approximately 20 minutes". Keep 12 min only as an internal check-in cue.
- `src/lib/athena.functions.ts` — `shouldAcknowledgeTime` stays at 12 min (internal courtesy check-in). Add a second, distinct closing hint at ~18–20 min (`offer_return` / `wind_down` shifts from turn-count to elapsed-minutes primary, turn-count secondary).
- `src/routes/_authenticated/athena.tsx` — completion state (marks `interview_sessions.completed_at`, `user_intelligence.profile_approved_at` eligibility) triggers at ≥20 min elapsed AND ≥10 substantive user turns, not the current turn-only threshold. Closing monologue copy updated to 20-min framing.
- `src/lib/introductions.server.ts` — eligibility gate reads `last_interview_at` + minutes elapsed in that session; ensure it requires the 20-min foundational, not the 12-min checkpoint.

Acceptance:
- New user reaching ~12 min sees one gentle time acknowledgement, conversation continues.
- At ~20 min Athena offers a natural close; completion recorded; user becomes match-eligible.
- Existing users' `completed_at` not retroactively cleared.

### 1.2 Model identifier audit (no swap)
- Confirm every `gateway("openai/…")` call in `src/lib/*.server.ts` and `src/routes/api/*.ts` uses the exact catalog id. Current state (verified): chat = `openai/gpt-5.5` ✅, STT = `openai/gpt-4o-transcribe` ✅, TTS = `openai/gpt-4o-mini-tts` ✅. No code change unless a stray id is found during the sweep.

Acceptance: `rg "openai/" src` shows only the three ids above; a fresh Athena turn logs a 200 in AI Gateway.

---

## Phase 2 — Complete the core relationship loop

### 2.1 Automatic matchmaking
Anchor: `L6c-decision-and-introduction.md`.

Triggers:
1. Foundational conversation completes (`reflectAthena` marks `profile_approved_at`).
2. A subsequent `reflectAthena` run materially changes ≥1 facet (already computed as `facetsRefined`) — schedule a re-run.
3. A `connections.status` transitions from `open` → closed OR a `matches.status` becomes `declined/expired`, freeing an intro slot.

Implementation:
- New server fn `runMatchmakingForUser(userId)` in `src/lib/introductions.server.ts` wrapping existing scoring logic; safe to call idempotently and honors the 3-active cap.
- Call sites: end of `reflectAthena` handler (when `facetsRefined > 0` OR foundational just completed); end of `blockUser` / `closeConnection` / decline flows in `src/lib/connections.server.ts` and `src/lib/introductions.server.ts` — for BOTH users involved.
- Guard with a per-user cooldown row on `user_intelligence` (`last_matchmaking_at`) to prevent thrash — min 60s between runs.

Acceptance: after foundational completes, user sees a Meet card without any manual trigger. Declining an intro frees a slot and a new candidate appears (if one exists) within one refresh.

### 2.2 Feedback loops into relational reasoning
- When a `partner_perception` or `post_meeting_reflections` row is inserted, mark all `pair_reasoning` rows for that user `is_stale = true, stale_reason = 'post-meeting signal'` (DB trigger).
- Extend `pair_reasoning.server.ts` prompt input to include latest perception scores + reflection summary for both users, weighted as recent evidence per L4 Epistemics.

Migration:
```sql
CREATE OR REPLACE FUNCTION public.tg_mark_pair_reasoning_stale_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pair_reasoning
     SET is_stale = true, stale_reason = 'post-meeting signal'
   WHERE user_low = NEW.author_id OR user_high = NEW.author_id
      OR user_low = NEW.subject_id OR user_high = NEW.subject_id;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_perception_marks_stale
AFTER INSERT ON public.partner_perception
FOR EACH ROW EXECUTE FUNCTION public.tg_mark_pair_reasoning_stale_for_user();

-- analogous trigger on post_meeting_reflections keyed on user_id
```

Acceptance: submitting perception on a connection flips affected `pair_reasoning.is_stale` to true; next matchmaking run re-reasons with the new signal.

### 2.3 Account pause & permanent deletion
Anchor: `L2-ethics.md`.

- `profiles.is_paused` already exists — add UI on `/profile`: toggle → sets flag; paused users excluded from candidate pool in `introductions.server.ts` (`WHERE is_paused = false`).
- New server fn `deleteMyAccount` (authenticated) → calls `supabaseAdmin.auth.admin.deleteUser(userId)` inside handler after re-auth confirmation prompt. Cascade already handled via `ON DELETE CASCADE` on FKs to `auth.users`.

Acceptance: pausing hides user from all future matchmaking runs; delete removes auth user + cascades; user is signed out.

### 2.4 Email verification gate
- `src/routes/_authenticated/route.tsx` `beforeLoad`: if `session.user.email_confirmed_at` is null, redirect to `/auth?verify=1` with resend button.
- Supabase auth config: ensure email confirmation is required (leave existing config).

Acceptance: unverified user cannot reach `/home`, `/athena`, `/meet`, `/chats`; verification link → normal flow.

### 2.5 Report review & moderation workflow
- New enum role via existing `user_roles` pattern (spec in system prompt): `app_role.moderator`. Migration adds enum value + `has_role` already generalized.
- New route `src/routes/_authenticated/moderation.tsx` gated by `has_role(auth.uid(),'moderator')`: lists `reports` newest-first with reporter/reported profile links, message context, and actions: dismiss, warn (system message into conversation), suspend (`profiles.is_paused = true` + note), ban (delete auth user).
- Migration: `reports` add `status text default 'open'`, `resolved_by uuid`, `resolved_at timestamptz`, `resolution_note text`. GRANTs + RLS: only moderators SELECT/UPDATE.

Acceptance: a moderator sees new reports; resolving one updates status and (if suspend) pauses the account.

---

## Deferred to Phase 3
ToS/Community Guidelines pages, conversation history browser, deep "Why Athena sees potential" explanations, PWA install prompt. Called out here only so scope is explicit.

## Out of scope this plan
Stripe/payments (user deferred), native shell packaging.
