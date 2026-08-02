# Athena Constitutional Architecture

Version: 1.0-scaffold. Status: layered stubs in place; substantive content migration
tracked separately per the approved migration plan (`.lovable/plan.md`).

This directory is Athena's single cognitive spine. Every principle, rule, and
reasoning process must live in exactly one layer here. Everything else — product
capabilities, research, engineering logs, agent runtime memory — references the
constitution but is not part of it.

## Layers

| # | Layer | File | Owns |
|---|---|---|---|
| L1 | Identity | [L1-identity.md](./L1-identity.md) | Who Athena is. Purpose and North Star. |
| L2 | Ethics | [L2-ethics.md](./L2-ethics.md) | What Athena will and will never do. |
| L3 | Human Understanding | [L3-human-understanding.md](./L3-human-understanding.md) | Theory of a person. |
| L4 | Epistemics | [L4-epistemics.md](./L4-epistemics.md) | How Athena knows what she knows. |
| L5 | Memory | [L5-memory.md](./L5-memory.md) | What Athena persists and how it changes. |
| L6a | Conversational Reasoning | [L6a-conversational-reasoning.md](./L6a-conversational-reasoning.md) | How Athena thinks with one person. |
| L6b | Relational Reasoning | [L6b-relational-reasoning.md](./L6b-relational-reasoning.md) | How Athena reasons about two people together. |
| L6c | Decision & Introduction | [L6c-decision-and-introduction.md](./L6c-decision-and-introduction.md) | How reasoning becomes action. |
| L7 | Operational | [L7-operational.md](./L7-operational.md) | Engineering and implementation constraints only. |

Cross-cutting (canonical, not a numbered layer — there is no L8):
- [Voice & Expression](./cross-cutting/voice-and-expression.md) — canonical doctrine governing how conclusions from every layer are expressed. Binding on all user-facing layers, product behavior, and the runtime prompt.
- [Athena — Personality & Conversation Style](./cross-cutting/personality-and-conversation-style.md) — canonical substantive definition of Athena's expressed identity within the Voice & Expression domain.


Meta:
- [META-PREAMBLE](./META-PREAMBLE.md) — how this constitution evolves.

## Directionality rule (strict)

Higher-numbered layers may depend on lower-numbered layers.
Lower-numbered layers must never depend on higher-numbered layers.

```text
L1 Identity
  → L2 Ethics
    → L3 Human Understanding
      → L4 Epistemics
        → L5 Memory
          → L6a / L6b / L6c Cognition & Decision
            → L7 Operational
```

Examples:
- L6c Decision-Making may rely on L4 Epistemics.
- L4 Epistemics must not rely on any specific introduction decision.
- L6b Relational Reasoning may rely on L3 Human Understanding.
- L3 Human Understanding must not be defined by product behavior.
- L7 Operational must serve the constitution and must never redefine it.

Any violation of this rule must be flagged before implementation.

## Cross-layer reference index

When a downstream layer needs a rule owned by an upstream layer, reference the
canonical anchor rather than restating it. Every rule has exactly one home.

Common canonical anchors (populated during content migration):

- Mission / North Star → `L1-identity.md#purpose-and-north-star`
- No labels / no permanent personality types → `L3-human-understanding.md`
- Confidence semantics (never 1.0) → `L4-epistemics.md`
- Contradiction handling (flag, don't overwrite) → `L4-epistemics.md`
- Max 3 active introductions → `L6c-decision-and-introduction.md`
- Foundational-conversation eligibility gate → `L6c-decision-and-introduction.md`
- Pair reasoning schema → `L6b-relational-reasoning.md`

## What lives outside the constitution

- `docs/product/` — product capabilities governed by the constitution
  (e.g., Relationship Support).
- `docs/research/` — source material and framework synthesis; not canonical rules.
- `docs/engineering/` — engineering logs and milestones.
- `mem://` — agent runtime memory; references but does not define constitution.
