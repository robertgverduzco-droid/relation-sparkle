# L5 — Memory Constitution

Status: canonical. Integration mapping migrated from
`docs/research/athena-human-understanding-framework-v1.md` §8 on 2026-07-27.
Confidence semantics remain owned by L4.

Owns: what Athena persists, how it is represented, and how it changes over
time.

## Scope

- Living Profile.
- Topic Map.
- Understanding Facets.
- Reflections.
- Pair-level memory.
- Memory lifecycle: creation, revision, revocation, forgetting, user
  correction, staleness.
- Historical context vs. current-state understanding.

## Non-scope

- Confidence semantics → L4 (memory records confidence values; it does not
  define them).
- What dimensions of a person exist → L3.
- How memory is used to reason with one person → L6a; with two people → L6b.

## Directional dependencies

- Depends on: L1, L2, L3, L4.
- Depended on by: L6a, L6b, L6c.

## Memory Surfaces

| Surface | Role |
|---|---|
| **Living Profile** | User-facing narrative surface of the L3 dimensions. Never displays scores, labels, or types. |
| **Understanding Facets** | Canonical per-dimension record. Each facet stores `current_understanding`, `confidence` (per L4), `evidence[]`, `reasoning_summary`, `needs_clarification`, `last_refined_at`. |
| **Facet History** | Preserves prior understandings with what changed and why. Implements L4's "preserve, don't overwrite" rule. |
| **Topic Map** | Internal roadmap tracking topic status (untouched, introduced, explored, deep), confidence, last discussed date, and open questions. Topics are the *conversational surface*; L3 dimensions are the *interpretation layer* above them. |
| **Reflections** | Post-conversation and post-meeting distillations that feed evidence back into facets and pair memory. |
| **Pair Reasoning + History** | Versioned pair-level memory; the shape of a pair reasoning record is owned by L6b. |

## Lifecycle Rules

- **Creation.** A facet is created the first time an L3 dimension gains
  meaningful evidence; a topic-map entry is created the first time a topic
  is introduced.
- **Revision.** Any revision writes a new history row; the prior value is
  never lost. Confidence updates follow L4.
- **Contradiction.** Contradictory evidence flags `needs_clarification` and
  is scheduled for gentle re-exploration, per L4.
- **User correction.** A user's explicit correction is authoritative for the
  fact corrected, but Athena still records the prior belief in history with
  the correction as the trigger.
- **Staleness.** Facets carry `last_refined_at`. Life events flagged by L4
  mark dependent facets stale and route them for re-exploration.
- **Forgetting.** Users may request removal of memory. Removal preserves an
  audit trail sufficient for L2 ethical review but purges the substantive
  content.

## Historical Context vs. Current State

Memory preserves useful history while allowing Athena's present understanding
to reflect who the person is today. When answering "what does Athena
understand about this person now," the current-state view is used; history
is consulted when reasoning about growth, contradiction, or re-emergence of
prior patterns.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0-scaffold | 2026-07-27 | Charter created. |
| 1.0 | 2026-07-27 | Living Profile / Topic Map / Facets lifecycle migrated from research v1 §8. |
