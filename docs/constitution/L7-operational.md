# L7 — Operational Constitution

Status: charter. Engineering-only constraints migrate here in the next pass;
ethical and cognitive content is explicitly excluded.

Owns: engineering and implementation constraints only.

## Scope

- Latency.
- Cost.
- Model routing.
- Data boundaries.
- System reliability.
- Availability.
- Technical limits.
- Infrastructure behavior.
- Implementation-level safeguards.

## Non-scope

- Ethics → L2.
- Human dignity, no-labels, growth → L3.
- Confidence semantics → L4.
- Memory lifecycle policy → L5.
- Cognitive reasoning → L6a / L6b / L6c.

## Directionality pre-flight (for content migration)

The prior "Operational Constraints" section mixed ethics and engineering.
When content migrates, ethics-flavored clauses move to L2 and cognitive rules
move to their appropriate cognition layer. Only pure engineering constraints
land here.

## Athena System Prompt — Runtime Implementation Governance

This section governs the runtime system prompt as an engineering artifact. It
deliberately does not restate the prompt's text: restating it would create
drift between two copies.

### Authority hierarchy

1. **Athena's constitutional doctrine governs.** L1 through L7 and the
   cross-cutting canonical domains are the source of truth.
2. **The canonical Personality & Conversation Style document defines Athena's
   expressed identity**, within the cross-cutting Voice & Expression domain.
3. **The runtime system prompt implements that doctrine.** It is downstream of
   both.
4. **Every prompt change is reviewed against the governing constitutional
   documents before implementation.**

### Non-authority clause

The source-code prompt is an implementation artifact. It never governs,
overrides, amends, or supersedes constitutional doctrine. Where the prompt and
doctrine diverge, doctrine is correct and the prompt is defective and must be
corrected. Personality changes originate in the constitutional documentation
and are only then reflected in the prompt — never the reverse.

### Location

`src/lib/athena.server.ts`. Recorded as location only, not as a source of
truth.

### Purpose

To translate constitutional doctrine into model-executable instruction for the
live conversation runtime.

### Review requirements

| Change touching | Must be reviewed against |
|---|---|
| Refusal, boundary, or safety language | L2 Ethics |
| How a person is understood; the no-labels rule | L3 Human Understanding |
| Confidence, evidence, or uncertainty semantics | L4 Epistemics |
| What is remembered, surfaced, or forgotten | L5 Memory |
| Conversational conduct, pacing, question depth | L6a Conversational Reasoning |
| Pair-level explanation | L6b Relational Reasoning |
| Recommendation, deferral, introduction framing | L6c Decision & Introduction |
| Tone, warmth, humor, uncertainty phrasing, explanation framing | Cross-cutting Voice & Expression, and Personality & Conversation Style once approved |

### Governing documents

- `docs/constitution/META-PREAMBLE.md`
- `docs/constitution/L1-identity.md` through `L7-operational.md`
- `docs/constitution/cross-cutting/voice-and-expression.md`
- *Athena — Personality & Conversation Style* (pending)

### Prompt version and change history

Baseline recorded as of this section's creation. No prompt text is copied here.

| Prompt version | Date | Change | Reviewed against |
|---|---|---|---|
| baseline | 2026-08-01 | Current runtime prompt as implemented; recorded as the governance baseline. No change made. | — |

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0-scaffold | 2026-07-27 | Charter created; engineering constraint migration pending. |
| 1.1 | 2026-08-01 | Added runtime prompt governance: authority hierarchy, non-authority clause, location, purpose, review requirements, governing documents, and version history. Documentation only; the runtime prompt was not modified. |
