# Athena Reflection Flow — Technical Specification (7 Decisions)

Nothing below removes, renames, or weakens existing behavior. The current reflection component, the legacy free-form reflection conversation, the private partner-perception questions, the safety/report system, matchmaking gates, and the 3-introduction cap all remain exactly as implemented.

## Conflict review (read this first)

Three items need your decision before implementation:

1. **Relationship Focus Mode does not exist in the codebase.** You refer to it as "already approved," but there is no such system in code or in the constitution docs. I will not invent a second one. Recommendation: build mutual-yes as a small `connections.status = 'mutual_interest'` transition plus an Athena acknowledgement, and leave a documented hook for Focus Mode when you supply that spec. If Focus Mode was specified elsewhere, send it and I'll integrate into it instead.
2. **"Complete every required reflection before another introduction"** conflicts with today's eligibility gate, which only counts open connections. This adds a new blocking condition: an unsubmitted reflection on a concluded introduction will hold up matchmaking. That is a real behavior change for members who go quiet. Recommend a 14-day grace expiry so a silent member is never permanently locked out.
3. **Multiple reflections vs. one row per connection.** Today `post_meeting_reflections` is effectively one submitted row per member per connection. Supporting repeat reflections requires either many rows or a history table. Recommendation below is the smaller of the two.

## 1. One member selects "No"

- Keep `applyReflectionOutcome` exactly as it is (closes connection, marks pair closed).
- Add: when it closes, write a `system` message into the pair's conversation with neutral copy — "This introduction has concluded. Continuing requires mutual interest from both people." No identity, no reasoning, no quoted answers.
- Add: set `connections.close_reason = 'reflection_complete'` (already done) and mark the *other* member's reflection as `required = true` so Athena invites them to reflect privately.
- The deciding member's follow-up questions already run before closure — unchanged.

## 2. Reflection timing

Use existing signals; do not add new tracking.

A reflection becomes available when **either**:
- a `meeting_proposals` row for the connection reaches `status = 'completed'` or its `scheduled_for` is more than 4 hours in the past, **or**
- the pair has exchanged messages on at least two distinct calendar days *and* the connection is at least 72 hours old.

Before that, the Reflect tab shows Athena's gentle "not yet" state instead of the question flow. This is a UI gate plus one server-side check — no schema change.

## 3. "I'm Not Sure Yet"

- No change to slots: the introduction stays open and keeps occupying one of three.
- No replacement introduction is created (already true).
- Add a lightweight check-in: if the last `not_sure` reflection is 10+ days old and there have been no new messages and no new meeting proposal since, Athena surfaces a Today-card prompt inviting another reflection or a conversation. Driven by timestamps at read time — no cron, no new table.

## 4. Multiple reflections

Smallest additive change: drop the one-row assumption instead of adding a table.

- Add `sequence integer not null default 1` to `post_meeting_reflections`; remove the unique constraint on (connection_id, user_id) if present and index the pair instead.
- Each submission inserts a **new** row; earlier rows are never updated or deleted.
- `getGuidedReflection` returns the latest row for prefill plus a `history` array for display.
- The connection detail view gains a collapsed "Earlier reflections" list.
- `applyReflectionOutcome` acts only on the newest submission.

## 5. Mutual "Yes"

- On submit, if the other member's most recent submitted reflection also has `continue_decision = 'yes'`, set `connections.status = 'mutual_interest'` (new allowed value; `open` remains valid and nothing that reads `open` breaks — reads become `in ('open','mutual_interest')`).
- Athena posts one system message to both: interest is mutual. Nothing else changes.
- This is the entry point Focus Mode will later attach to. No parallel system is created.

## 6. Safety

- No change to reports, blocks, safety flags, or the moderation dashboard.
- Add a quiet text link — "Report a safety concern" — at the foot of the reflection card that opens the **existing** report dialog already used on the connection screen.

## 7. Athena's response

- After a submission, one short generated acknowledgement via the existing AI gateway, tone-matched to the member's feeling tags and free text.
- Hard constraints in the prompt: never advise, never nudge toward or away from continuing, never reference the other member's answers, 2-3 sentences.
- Falls back to the existing static `REFLECTION_CLOSINGS` copy if the model call fails, so the flow never breaks.

## Technical summary

| Area | Change |
|---|---|
| Migration | `post_meeting_reflections.sequence`, `required` flag, relax uniqueness; allow `connections.status = 'mutual_interest'` |
| `connections.server.ts` | availability predicate, mutual-yes detection, check-in predicate, acknowledgement prompt |
| `connections.functions.ts` | insert-not-upsert, return history, post system messages, extend eligibility gate |
| `reflection-flow.tsx` | not-yet state, earlier-reflections list, safety link, Athena acknowledgement |
| `introductions.server.ts` | eligibility also requires no outstanding required reflection (14-day grace) |
| Docs | update `docs/product/relationship-support.md` and `docs/technical/DEPENDENCY_MAP.md` |

No existing file is rewritten; all edits are extensions.

## What I need from you

- Approve or correct the three conflict items above (especially Focus Mode).
- Confirm the 14-day grace on the reflection-blocks-matchmaking rule.
