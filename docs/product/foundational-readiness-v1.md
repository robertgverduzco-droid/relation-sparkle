# Minimum Foundational Readiness Before Introductions — v1.0

Canonical. Governs when Athena may begin considering a member for introductions.

## Governing principle

Athena owns the determination. Member impatience, requests to "start matching now",
short answers, or willingness to accept a lesser match never lower the standard.

## Criteria (semantic, not a question count)

Meaningful understanding is required in every area below; any one of the listed
facets may satisfy an area, because members reach these truths by different routes:

| Area | Satisfying facets |
| --- | --- |
| Relationship intent | partnership_vision, life_direction, readiness |
| Values / life orientation | core_values, self_understanding, purpose_and_ambition |
| Communication and connection | communication_style, emotional_regulation, affection_and_connection |
| Everyday lifestyle | lifestyle, health_and_wellness, social_and_family |
| Relational expectations and patterns | attachment_tendencies, conflict_style, relationship_pacing |
| Boundaries and dealbreakers | boundaries |
| Physical attraction | physical_attraction_preferences |

Plus breadth: at least 9 understood facets overall. `foundational.ts`'s ≥8 touched
domains remains the rule for closing a *conversation* gracefully; matchmaking
eligibility is deliberately the higher bar.

Quality: a facet counts only when Athena has written a substantive understanding
(≥24 characters of her own prose, not a placeholder) at confidence ≥ 0.35.
This measures Athena's understanding, never the member's word count — terse
members are never penalised.

## Enforcement

`assessFoundationalReadiness()` in `src/lib/introduction-readiness.ts` is pure and
derives only from persisted understanding. `evaluateReadiness()` in
`src/lib/readiness.server.ts` returns state **A** (`foundational_gaps` /
`foundational_breadth`) when it fails, which blocks:

- `introductionGate()` for the member and for any counterpart;
- the counterpart pool filter in `introductions.server.ts` (state C only);
- therefore all pair creation and presentation.

Client state cannot influence any of this.

## Athena's conversational behavior

Guidance (`introductionReadinessGuidance`) is injected into both the text and live
spoken paths. She may not say or imply she could begin matching now; she does not
invent a number when asked how many questions remain; she holds the threshold
warmly and continues the conversation. No percentages, scores, counts, requirement
lists or progress indicators, ever.

## Existing members

No understanding is deleted and no one is re-interviewed. Members who completed
foundational mode under the previous weaker logic are simply re-evaluated against
these criteria; any missing areas are filled naturally before a new introduction.
