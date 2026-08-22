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

## Write-path correction pass (post-verification)

Tightening ACLs without moving legitimate member actions onto a trusted write
path breaks real behaviour. Every action affected by the revoked grants was
audited against the LIVE `authenticated` grants and repaired to one shape:

1. prove intent and membership with the MEMBER-SCOPED client (RLS applies);
2. perform the transition with the SERVICE ROLE, always pinned to the caller's
   own `user_id` — never on behalf of a counterpart.

Grants are never widened to make an action work.

### Governed write paths (`src/lib/write-paths.server.ts`)
- `recordEndingChoice` — `member_transitions`
- `optIntoFocusFor` — `relationship_focus` (mutual opt-in preserved)
- `recordIntroductionResponse` — `introduction_responses`, `introduction_feedback`
- `recordAttractionFor` — `introduction_attraction`

`relationship.functions.ts` and `introductions.functions.ts` are thin wrappers
over these; the transition logic is importable and therefore testable.

### Platform-owned writes (service role inside the helper)
`notifications.server.notify` / `obsoleteNotifications`, `readiness.server`
persistence, `relationship.server.openEndingChoice`,
`connections.server.openConnectionIfMutual` / `postSystemMessage` /
`markReflectionRequired`, and matchmaking's `pair_reasoning` writes.

### Standing guards
- `src/lib/acl-manifest.ts` — the live `authenticated` grant surface, captured
  from the database, as a checked-in contract.
- `src/lib/acl-contracts.test.ts` — fails the build on any member-scoped write
  to a table or column the grants forbid (service-role aliases resolved), and
  asserts the system-owned tables stay closed.
- `src/lib/test-support.ts` — deterministic in-memory PostgREST harness whose
  member client enforces the manifest and whose admin client stands in for the
  service role.
- `src/lib/write-path.test.ts` / `src/lib/system-write-path.test.ts` — both
  halves per action: direct mutation DENIED, governed action ALLOWED, and
  acting for another member REFUSED. Suite total: 433 tests.
