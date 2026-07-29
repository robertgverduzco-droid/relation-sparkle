# Project Milestones

## Constitutional Architecture v1 — Scaffold
Date: 2026-07-27
Status: Layered constitutional scaffold in place; substantive content migration pending.

- New tree created under `docs/constitution/` with 7 layers (L1–L7), a Voice &
  Expression cross-cutting guide, and a META-PREAMBLE governing constitutional
  evolution.
- Product architecture introduced under `docs/product/` (Relationship Support,
  Introduction Experience) — governed by, not part of, the constitution.
- Engineering logs moved to `docs/engineering/` (this file).
- Legacy documents at `docs/athena-ultimate-goal.md` and
  `docs/athena-ethical-constitution.md` preserved verbatim with SUPERSEDED
  banners pointing to canonical layers. Redirect stub added at
  `docs/MILESTONES.md`.
- Directionality rule (L1 → L7) established and enforced in each layer stub.
- No production code touched. No substantive constitutional language rewritten.

Next: content migration pass per the approved plan (`.lovable/plan.md` §2),
followed by verification checklist (§8) and a "Constitutional Architecture v1 —
Content Migrated" milestone.


## Athena Foundation Stable v1
Date: 2026-07-27
Status: Permanent rollback point — do not overwrite.

This milestone marks the first architecturally stable foundation of Athena.
Every message in Lovable is a restorable checkpoint; use the message that
introduced this file as the canonical rollback anchor for "Foundation Stable v1".

### What's included in this snapshot

**Security & data access**
- RLS enabled across all Athena tables.
- `pair_reasoning` and `pair_reasoning_history` grants + service-role policies
  applied (`supabase/migrations/20260727000000_athena_engine_permissions.sql`).

**Matchmaking engine**
- Cross-user reads routed through `supabaseAdmin` behind an authenticated caller.
- Eligibility gates enforced: foundational conversation complete
  (`last_interview_at` set), minimum facet count, minimum average confidence.
- Reasoning + presentations persisted to `pair_reasoning` with history log.

**Foundational conversation**
- ~20-minute initial conversation required before introduction eligibility.
- Welcome monologue communicates the foundation contract to the user.

**Server-function architecture (TanStack thin-wrapper compliance)**
- `src/lib/athena.functions.ts` → helpers in `src/lib/athena.server.ts`
- `src/lib/introductions.functions.ts` → helpers in `src/lib/introductions.server.ts`
- `src/lib/connections.functions.ts` → helpers in `src/lib/connections.server.ts`

**Design tokens**
- Landing page and shared surfaces use semantic CSS variables; no hardcoded
  color utilities in refactored components.

**AI model verification**
- Athena conversation, reflection, and pair reasoning routed through the
  Lovable AI Gateway via `src/lib/ai-gateway.server.ts`.

**Build & typecheck**
- Production build and TypeScript validation pass at the time of this
  milestone.

### Rollback guidance
To return to this state, restore the chat to the message that created this
file. Do not edit this entry; add new milestones below it as forward progress.


## Athena Foundation Stable v2
Date: 2026-07-29
Status: Permanent rollback point — do not overwrite.

Marks completion of Phase 2 and Phase 2.5 (Core Loop stabilization) prior to
Phase 3 (Trust, History, Explainability, PWA install).

### What's included beyond v1
- 20-minute foundational conversation pacing consumed in the Athena UI, with
  a graceful `ClosingSheet` that saves progress, runs the final reflection,
  marks the session complete, and force-triggers matchmaking.
- Durable exit-flush backup for reflection on `pagehide` / `beforeunload`.
- Server-side refresh of stale `pair_reasoning` after partner perception and
  post-meeting reflection submissions.
- Introduction capacity re-evaluated on every response (accept / decline /
  defer) for both parties, respecting the 3-active cap and cooldown.
- Moderation dashboard visible to moderators from `/profile` with a
  moderator-only link and correctly untabbed active state.
- Account controls: pause / resume matching and permanent account deletion
  from `/profile`; email verification gate enforced in `_authenticated/route.tsx`.
- Real-time messaging with mutual-match trigger; block/report affordances in
  `messages.$id.tsx`.
- Athena AI turns and reflections tracked through `athena_usage_log` for
  future billing.

### Rollback guidance
Restore the chat to the message that introduced this milestone entry. Do not
edit this entry; add Phase 3 completion as a new milestone below it.

