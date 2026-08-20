# Post-Foundational Waiting Experience — V1.0

Canonical. Governs what a foundationally ready member experiences while Athena
has no introduction she can responsibly stand behind.

## Governing experience

Waiting is intentional, not empty. Once readiness is satisfied the member should
understand: Athena knows enough to begin considering introductions; she is still
coming to understand them; they never have to search through people themselves;
she will come to them when she has someone worth their attention.

No artificial activity is created to keep anyone engaged.

## Architecture

Single source of truth, no competing state:

| Concern | Owner |
| --- | --- |
| Eligibility (A/B/C, holds) | `evaluateReadiness` — `src/lib/readiness.server.ts` |
| Foundational breadth | `assessFoundationalReadiness` — `src/lib/introduction-readiness.ts` |
| Active introductions | `activeIntroductionCount`, `listMyIntroductions` |
| Candidate/uncertainty state | `pair_reasoning` + `evaluateStructuredConstraints` |
| Waiting phase + copy | `src/lib/waiting.ts` (pure), `src/lib/waiting.server.ts` (evaluation) |
| Today surface | `src/components/looking-state.tsx` via `home.tsx` |

Phases: `not_ready` → the existing readiness surface; `held` → paused, resting,
awaiting an ending choice, or Relationship Focus (waiting copy is silent);
`introduction_available` → the introduction owns the screen; `looking` → this
document.

## Minimum readiness ≠ maximum matchability

Foundational readiness only admits a member to consideration. Whether Athena has
enough evidence for a *particular* introduction remains a separate, qualitative,
per-pair judgement in `introductions.server.ts`. Sparse understanding produces
more unresolved reasoning; it is never compensated for by assuming
compatibility, and no one is broadly distributed across consideration because
they crossed the floor.

## Candidate-aware language

`evaluateWaitingState` marks `candidate: "unresolved_candidate"` only when a real
`pair_reasoning` row exists at sufficient confidence and unresolved information
prevents presentation. Only then is the "there may be someone worth considering"
language unlocked, for Athena and for Today. She never invents a waiting match,
and never reveals identity, characteristics, photographs, preferences, or the
specific reason a pair is unresolved. Uncertainty is resolved through ordinary
conversation about the member, never framed as another person's requirement.

## Optional deepening

`pickDeepeningArea` surfaces one genuine gap at a time, prioritising the seven
required areas. It is optional and stateless: no checklist, no meter, no streak,
no daily task, no membership consequence.

## Early community

`earlyCommunity` is configuration-driven and retirable. Athena may say honestly
that she is still building the community here. She never gives member counts and
never fabricates the appearance of a larger network.

## Notifications

Unchanged. A genuine introduction uses the canonical `introduction_new` path. No
notification is ever sent merely because nothing has happened.

## Forbidden in this surface

Candidate counts, activity indicators, queues, positions, countdowns, estimated
dates, match percentages, compatibility scores, scarcity, streaks, engagement
bait, claims of continuous background computation, and any V2 concierge
capability (local recommendations, date planning, travel). The layout reserves
room for those to arrive later without redesign.

## Verification

`src/lib/waiting.test.ts` covers the required scenarios and the no-score,
no-fabrication, privacy and non-pressure guarantees.
