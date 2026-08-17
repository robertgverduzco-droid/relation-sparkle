# Athena Design Decision Register

## v1.0 — established 2026-08-17

Companion to
[the Design Foundation](./DESIGN-FOUNDATION-V1.md). It records unresolved
aesthetic choices across D1–D6 so the design system cannot drift as Athena
evolves.

This register governs **design** decisions only. Experience decisions (X-01–X-38,
F-01–F-38) live in
[the Experience Decision & Implementation Register](../experience/DECISION-REGISTER.md)
and remain controlling wherever they overlap.

Each entry records: question · options considered · founder decision ·
architectural basis · accessibility implications · implementation status.

---

## Resolved founder design decisions

### D-01 — Athena has no avatar — **APPROVED (2026-08-17)**

*Question.* Should Athena be represented by a face, humanoid figure or
character?

*Options.* Human/synthetic face · humanoid avatar · character illustration ·
abstract presence only.

*Decision.* No human face, synthetic woman, digital goddess, animated talking
head or character illustration. Athena has presence without embodiment,
expressed through voice, language, light, motion, spatial behavior, sonic
identity and possibly an abstract mark.

*Basis.* Design Foundation D1 §4; E3 (Athena's Presence); Constitution L1.

*Accessibility.* Presence must never be communicated by visual state alone —
every Athena state needs a text or programmatic equivalent for screen readers,
and must survive reduced motion (F-16).

*Status:* Founder Decision — Binding · Consistent with current runtime (no
avatar exists).

### D-07 — Five member photographs maximum for V1 — **APPROVED (2026-08-17)**

*Question.* How many photographs may a member publish in V1?

*Options.* Unlimited · social-media-style many · six (current runtime) · five ·
fewer.

*Decision.* V1 explores a maximum of five, to encourage intentional selection
over accumulation. Minimums and required categories remain downstream UX
specification (see D-08).

*Basis.* Design Foundation D6 §32; E8; F-31 (no inventory or comparison).

*Accessibility.* Any photo-count UI must expose limits in text, not by
affordance alone, and describe upload/remove actions to assistive technology.

*Status:* Founder Decision — Binding · **Not yet implemented — known
divergence.** `src/components/photo-uploader.tsx` currently enforces six and
says "Up to six." No change made in this pass (canonical-review instruction 10).
Reconcile during the D6 photography specification.

---

## Open design decisions

| ID | Domain | Question | Status |
|---|---|---|---|
| D-02 | D1 | What exactly is Athena's abstract presence — form, behavior, and its responses to listening, processing, speaking, recognition, transition, connection? Is there a mark? | Open — depends on X-05, F-17 |
| D-03 | D1 | Connection-field geometry, density, movement, color, connection frequency and choreography; how to keep it a metaphor rather than a matchmaking diagram. | Open — depends on X-19, F-19 |
| D-04 | D2 | Exact type families, the serif/sans pairing question, scale, weights, line length and the reading-comfort standard for extended conversation. | Open |
| D-05 | D3 | Exact palette and tokens for the arrival and interior environments; gold usage rules; organic secondaries; connection/relational color. | Open — depends on F-11, F-12, X-11, X-12 |
| D-06 | D5 | Sonic signature: existence, length, notes, intervals, instrumentation, timbre, tuning; whether the current landing chime is retired or replaced. | Open — depends on X-07, F-05 |
| D-08 | D6 | The five-photo structure: minimum count, whether categories are required or suggested, and how the uploader guides intentional selection. | Open |
| D-09 | D6 | Progressive revelation sequence — what precedes photography, and how staged revelation avoids becoming a game. | Open — F-33 controlling; do not implement from the Foundation alone |
| D-10 | D3/D4 | Material vocabulary: depth, shadow, translucency, texture, and the arrival→interior transition treatment. | Open |
| D-11 | D4 | Animation timing, easing, ceremony restraint and the complete reduced-motion equivalents for each meaningful state. | Open — F-16 baseline implemented |
| D-12 | D5 | Voice selection and direction (character, pacing, adaptive delivery), replacing the provisional voice. | Open — F-04, F-05 |
| D-13 | D4/D6 | Haptics and microinteraction vocabulary, if any. | Open — F-21 (optional) |
| D-14 | D1–D6 | Accessibility verification of every final aesthetic choice as a beta gate: contrast, scalable text, focus, state differentiation, touch targets, screen readers, sound-off equivalents. | Open — F-14, X-14 |

---

## Findings raised during canonical review

1. **Photo-count divergence (D-07).** Runtime allows six photographs; the V1
   direction is five. Recorded, not changed.
2. **Touch targets.** Three standalone text links remain below the 44px
   minimum, carried from the P0 closure pass; belongs to D-14 and the UX
   specification.
3. **Landing chime.** An ambient chime exists on the arrival surface with no
   member control yet; its fate is D-06 under X-06/F-04.
4. **Progressive revelation still absent.** Introductions contain no counterpart
   photography, so no revelation sequence exists to evaluate. Preserved as
   D-09/X-33; explicitly not implemented in this pass.

---

# Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-17 | Register established alongside Design Foundation v1.0. D-01 and D-07 recorded as binding founder design decisions; D-02–D-14 recorded as open. No runtime, UI, CSS, token, typography, color, asset, animation, sound, voice or photography change made. |
