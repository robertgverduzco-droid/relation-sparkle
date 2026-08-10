# Living Profile storage — `user_intelligence` vs `understanding_facets`

These two tables both hold Athena's understanding of a member. They are not
duplicates; they hold different *kinds* of understanding and have different
lifecycles. This document is the single authority on which to use.

## `understanding_facets` — the canonical Living Profile

One row per member per facet key, across the 21 dimensions defined in
`src/lib/facets.ts` (four families: Self, Emotional, Relational, Life
Structure).

- **Granularity:** one facet at a time.
- **Contents:** `understanding` (prose), `reasoning`, `evidence` (JSON),
  `confidence`, `needs_clarification`, `clarification_note`.
- **Lifecycle:** continuously refined by `reflectAthena`. Every revision is
  appended to `facet_history`, so belief change is auditable (L4 epistemics,
  L5 memory).
- **Who reads it:** conversation context, pair reasoning
  (`introductions.server.ts`), the profile review screen.

**`understanding_facets` is the source of truth for what Athena understands
about a person.** Matchmaking reasons from facets, never from
`user_intelligence`.

## `user_intelligence` — the narrative rollup and session state

Exactly one row per member.

- **Granularity:** whole person.
- **Contents:** human-readable summaries (`self_understanding`,
  `communication_style`, `partnership_vision`, `readiness_summary`,
  `life_direction`, …) plus operational state
  (`interview_target_turns`, `last_interview_at`, `profile_approved_at`,
  `last_matchmaking_at`).
- **Lifecycle:** rewritten as a rollup; not versioned. Safe to regenerate at
  any time from facets and conversation history.
- **Who reads it:** the Today/home surface, onboarding pacing and eligibility
  gates, and the profile summary presented to the member.

## Rules

1. Never write a new dimension of understanding only to `user_intelligence`.
   Facets first; the rollup is derived.
2. Never gate matchmaking on `user_intelligence` prose. Gate on facet coverage
   and confidence.
3. `last_interview_at` and `interview_target_turns` are legacy names for
   foundational-conversation state. Athena does not conduct interviews; the
   column names are retained for data continuity only and are documented as
   legacy in the database via `COMMENT ON`.
4. Deleting a member purges both tables plus `facet_history` (see
   `src/lib/account.server.ts`).
