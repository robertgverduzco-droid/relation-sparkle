# Athena University — Canonical Curriculum

This directory holds Athena's **education**, not her identity. Constitutional
doctrine lives in `docs/constitution/` and always outranks anything here.
Education never amends identity.

**Status: Canonical Curriculum v1.0 is COMPLETE.** All seven founding colleges
are published and unified by the Final Integration.

| Document | Purpose |
|---|---|
| [Athena University](./athena-university.md) | Canonical Curriculum v1.0 — educational architecture, colleges, faculty principle, standards. |
| [Final Integration](./final-integration.md) | Unifies all seven colleges. Establishes the Educational Reasoning Standard and the Non-Quotation and Non-Imitation Standard. |
| [Colleges](./colleges/) | Canonical curricula for each college. |
| [Faculty](./faculty/README.md) | Individual educator profiles, one file per faculty member. |

## The seven colleges

| # | College | Curriculum | Closing Integration |
|---|---|---|---|
| 1 | College of Human Nature | [college-of-human-nature.md](./colleges/college-of-human-nature.md) | [closing](./colleges/college-of-human-nature-closing-integration.md) |
| 2 | College of Relationships | (faculty profiles + closing) | [closing](./colleges/college-of-relationships-closing-integration.md) |
| 3 | College of Communication | [college-of-communication.md](./colleges/college-of-communication.md) | [closing](./colleges/college-of-communication-closing-integration.md) |
| 4 | College of Human Development | [college-of-human-development.md](./colleges/college-of-human-development.md) | [closing](./colleges/college-of-human-development-closing-integration.md) |
| 5 | College of Philosophy & Ethics | [college-of-philosophy-and-ethics.md](./colleges/college-of-philosophy-and-ethics.md) (Parts I and II) | Integrated into [Final Integration](./final-integration.md) |
| 6 | College of Culture & Humanity | [college-of-culture-and-humanity.md](./colleges/college-of-culture-and-humanity.md) | [closing](./colleges/college-of-culture-and-humanity-closing-integration.md) |
| 7 | College of Wisdom | [college-of-wisdom.md](./colleges/college-of-wisdom.md) | [closing](./colleges/college-of-wisdom-closing-integration.md) |

The College of Relationships has no separate curriculum overview file; its
scope is defined by its faculty profiles and its Closing Integration.

## Curriculum in the runtime

The curriculum reaches Athena's live reasoning through
`src/lib/athena-doctrine.server.ts`, which carries a compact synthesis of all
seven colleges and selectively retrieves at most two college depth modules per
turn. See [`docs/technical/RUNTIME-DOCTRINE.md`](../technical/RUNTIME-DOCTRINE.md).

Athena never quotes, cites, or imitates a faculty member to a member. She
reasons from her education and speaks in her own voice.

## Related, not curriculum

- `docs/research/` — source material and framework synthesis; not canonical.
- `docs/constitution/cross-cutting/evolution-engine.md` — governs how new
  knowledge is admitted and versioned.
