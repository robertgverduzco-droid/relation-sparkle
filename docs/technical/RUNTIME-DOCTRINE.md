# Runtime Doctrine Layer

Status: implementation artifact. Governed by `docs/constitution/L7-operational.md`.
This document describes how canonical doctrine reaches the live runtime. It is
never a source of truth; the Constitution and the Canonical Curriculum are.

## Module

`src/lib/athena-doctrine.server.ts`

| Export | Doctrine source |
|---|---|
| `L4_EPISTEMICS` | `docs/constitution/L4-epistemics.md` |
| `L5_MEMORY` | `docs/constitution/L5-memory.md` |
| `L7_OPERATIONAL` | `docs/constitution/L7-operational.md` |
| `UNIVERSITY_BASELINE` | `docs/education/final-integration.md` — compact synthesis of all seven colleges, plus the Educational Reasoning Standard, Faculty Principle, and Non-Quotation / Non-Imitation Standard |
| `COLLEGE_MODULES` | One compact depth module per college in `docs/education/colleges/` |
| `runtimeDoctrine(mode, recentMemberText)` | Composition entry point |

## Composition

Baseline on every surface: L4 + L5 + L7 + the University synthesis.

The compact college depth modules in this file are now the *baseline* layer
only. Situational educational depth is retrieved from the full indexed corpus by
`src/lib/education-retrieval.server.ts`, and doctrine plus retrieval are
composed in exactly one place —
`src/lib/education-context.server.ts` (`reasoningContext()`), which every
reasoning surface calls. See
[`EDUCATION-RETRIEVAL.md`](./EDUCATION-RETRIEVAL.md).

No faculty roster, quote, document name, or citation ever reaches the model as
material to reproduce, on either layer.

## Surfaces

| Surface | Mode | Call site |
|---|---|---|
| Live member conversation | `conversation` | `src/lib/athena.functions.ts` — `askAthena` |
| Live spoken conversation | `voice` | `src/lib/athena.functions.ts` — `askAthena` via `src/routes/api/eleven-agent-chat.ts`, plus `src/routes/api/realtime-education.ts` mid-session |
| Conversation reflection (Living Profile refinement) | `reflection` | `src/lib/athena.functions.ts` — `reflectAthena` |
| Pair compatibility reasoning | `pair` | `src/lib/introductions.server.ts` — `reasonPair` |
| Post-meeting reflection with a member | `meeting` | `src/lib/connections.server.ts` — `reflectSystemPrompt` |

## Living Profile injection (L4 / L5)

`summarizeLivingProfile` in `src/lib/athena.server.ts` no longer emits a numeric
confidence percentage. Each facet is now rendered as:

- a qualitative confidence band (`held lightly`, `reasonably understood`,
  `well-understood`),
- a provenance marker (`stated` where evidence exists, otherwise `inferred`),
- a staleness marker where the facet has not been refined in 120 days,
- an unresolved-tension marker where clarification is pending.

This satisfies L4's prohibition on presenting confidence as a score and L5's
requirement to keep stated and inferred understanding distinct.

## Change control

Any edit to this layer is reviewed against the governing documents listed in
L7 §"Review requirements" before implementation, and recorded in the L7 prompt
version table.
