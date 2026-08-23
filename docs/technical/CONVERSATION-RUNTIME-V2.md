# Athena Conversation Runtime V2

Status: implementation artifact. Governed by `docs/constitution/L6a-conversational-reasoning.md`
and `docs/constitution/cross-cutting/evidentiary-discipline.md`. Does not amend
identity, epistemics, safety, or matching.

## What changed

Before this pass, a member turn went straight to composition. Aliveness V1
governed rhythm and Evidentiary Discipline V1 governed claims, but nothing
made Athena decide *what kind of turn this is* before writing one. Provenance
was impossible by construction: the retrieval path deliberately strips faculty
and college metadata, so "where did you get that?" could only be answered with
reassurance.

## Turn planning

`src/lib/turn-runtime.ts` carries `TURN_RUNTIME_V2` — a thinking order injected
into every conversational surface, never narrated:

1. what just happened · 2. what is actually known, by category (fact,
self-report, observation, pattern, inference, unknown, education, general
knowledge) · 3. register, carried across sessions · 4. whether to lead at all ·
5. one move, not a stack · 6. questions are expensive · 7. no reflex validation ·
8. humour is recognition · 9. match energy without copying · 10. under challenge,
get better not safer · 11. know the source · 12. don't psychologise everything ·
13. self-descriptions are open questions · 14. education makes her notice more ·
15. effortless callbacks · 16. length is not a template · 17. she may have an
opinion · 18. clean corrections · 19. seriousness changes register, not
intelligence · 20. pre-send check.

`readTurn()` additionally detects challenge, opinion requests, subject-matter
turns, and provenance intent. Challenge adds a hold-your-ground block.

## Provenance mode

Member-triggered and turn-scoped. `detectProvenanceIntent()` recognises four
asks: source request, credential challenge, education inventory, exact
quotation. Only then does `src/lib/provenance.server.ts` run — a *separate*
retrieval path from `education-retrieval.server.ts`, so attribution metadata
can never leak into an ordinary turn.

It supplies:

- **Inventory** — colleges, faculty and document counts derived from the corpus
  itself (`educationInventory()`), so Athena can describe Athena University
  accurately and never claim a thinker she has not studied.
- **Attributed material** — retrieved chunks labelled with scholar, college,
  document and heading, each explicitly marked as Athena University synthesis
  rather than the scholar's own wording.
- **Quotation integrity** — `verifiedQuotations()` extracts genuinely verbatim
  wording; where there is none, the material is marked paraphrase-only.
  Fabricated quotations, titles, dates and statistics are forbidden.

The indexer (`scripts/build-education-index.ts`) now carries `college`,
`scholar` and `role` from document frontmatter into `corpus.json`. Chunk ids
and text are unchanged, so `vectors.json` remains valid; re-running with
`--no-embed` is sufficient after a metadata-only change.

## Surfaces

| Surface | Turn runtime | Provenance |
|---|---|---|
| `askAthena` (text) | always | on detected intent, same turn |
| live voice session | at session open | mid-session via `POST /api/realtime-education` |

Analytical surfaces (reflection, pair, meeting) are unchanged: they keep the
analytical register guard and never inherit provenance posture.

## Change control

Reviewed against L6a, evidentiary discipline, the Non-Quotation Standard, and
Conversational Aliveness V1. The Non-Quotation Standard is unchanged as a
default; this pass defines its single member-invited exception.
