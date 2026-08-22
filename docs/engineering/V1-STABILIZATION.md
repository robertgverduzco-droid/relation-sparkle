# V1 Stabilization — Architectural Constraints

These closures are permanent constraints. Future work must not reintroduce them.

## Authority
- 18+ and required consents are enforced server-side on every onboarding stage
  advance (`onboarding.server.ts`), never by a disabled client button.
- Foundational completion is monotonic: only the server path sets
  `completed_at`, and it never clears it (DB trigger + function layer).

## Least privilege
- `authenticated` holds no blanket INSERT/UPDATE/DELETE. Member-editable
  columns are granted individually; participant IDs, pair/connection IDs,
  statuses, timestamps, moderation and computed state are system-owned and
  written only through server functions using the service-role client.
- Athena-derived stores (`user_intelligence`, `topic_map`,
  `understanding_facets`) are read-only to members; corrections flow through
  governed revision paths.
- Internal test entitlements require the founder or admin role.

## Matching truthfulness
- Seeking gender, geography and relationship intent are tri-state
  (`match-semantics.ts`). Unknown holds a pair back; it never silently passes
  and never infers a missing value.
- Relationship intent is compared semantically, not by exact string equality.
- Eligible candidates are ordered deterministically and content-neutrally.
  Profile depth is an eligibility threshold, never a ranking of people.
- Pair confidence is internal. It is never returned to a member as a number or
  as an ordinal label standing in for one.

## Privacy and readiness
- Counterpart photo retrieval releases only `moderation = 'approved'`.
- At least one approved photograph is required before introductions; the hold
  distinguishes "none yet" from "in review" and applies no pressure.
- Precise coordinates never leave the server.

## Identity-scoped client state
- Arrival and return-greeting state is keyed by account id. Two accounts on one
  browser each receive their own first welcome; the written onboarding welcome
  does not consume Athena's spoken first greeting.
