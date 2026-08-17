# Athena Design Decision Register

## v1.4 — updated 2026-08-17

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
| D-02 | D1/D4 | What exactly is Athena's abstract presence — form, behavior, and its responses to listening, processing, speaking, recognition, transition, connection? Is there a mark? | Open — D4 sets governing behavior principles (no orb by default, presence before symbol); form still unselected. Depends on X-05, F-17 |
| D-03 | D1 | Connection-field geometry, density, movement, color, connection frequency and choreography; how to keep it a metaphor rather than a matchmaking diagram. | Open — depends on X-19, F-19 |
| D-04 | D2 | Exact type families, the serif/sans pairing question, scale, weights, line length and the reading-comfort standard for extended conversation. | Open |
| D-05 | D3 | Exact palette and tokens for the arrival and interior environments; gold usage rules; organic secondaries; connection/relational color. | Open — structural direction set by D3; depends on F-11, F-12, X-11, X-12 |
| D-06 | D5 | Sonic signature: existence, length, notes, intervals, instrumentation, timbre, tuning; whether the current landing chime is retired or replaced. | Open — D5 §19 governing: ~3 restrained tones, warm harmonic body, subtle synthetic air, 1–3s, non-jingle. Depends on X-07, F-05 |
| D-08 | D6 | The five-photo structure: minimum count, whether categories are required or suggested, and how the uploader guides intentional selection. | Open |
| D-09 | D6 | Progressive revelation sequence — what precedes photography, and how staged revelation avoids becoming a game. | Open — F-33 controlling; do not implement from the Foundation alone |
| D-10 | D3/D4 | Material vocabulary: depth, shadow, translucency, texture, and the arrival→interior transition treatment. | Open — D3 §14–§15 sets governing direction; values unresolved |
| D-11 | D4 | Animation timing, easing, ceremony restraint and the complete reduced-motion equivalents for each meaningful state. | Open — D4 sets the three-level motion hierarchy; values unresolved. F-16 baseline implemented and protected |
| D-12 | D5 | Voice selection and direction (character, pacing, adaptive delivery), replacing the provisional voice. | Open — D5 §§1–12 governing: lower-middle feminine register, subtly synthetic purity, contextual restrained modulation. Runtime still defaults to stock `shimmer`. F-04, F-05 |
| D-13 | D4/D5/D6 | Haptics and microinteraction vocabulary, if any. | Open — D4 §8 and D5 §20 permit functional/safety use only, never reward conditioning. F-21 (optional) |
| D-15 | D1 | Does Athena have a mark at all, and if so what is it? No mark is selected by D1; owl / helmet / goddess / A-monogram / brain / heart / infinity / neural-network defaults are excluded unless genuinely transformed. | Open — depends on D-02 |
| D-16 | D1/D3/D4 | Connection-field connection frequency: what rate reads as rarity rather than abundance, and how the field stays an honest metaphor rather than implied matchmaking activity. | Open — extends D-03; runtime currently reads as abundance |
| D-17 | D1/D2 | Container policy: which objects genuinely deserve a card, and what replaces cardified surfaces (spacing, typography, material separation) elsewhere. | Open — governing direction set by D2 §9; component rules still open; runtime is broadly cardified |
| D-18 | D2 | Exact type scale and responsive behavior: step sizes, fluid vs. breakpoint scaling, display sizing on narrow screens. | Open |
| D-19 | D2 | Exact line-height, measure and letter-spacing scales for body, conversation and display. | Open |
| D-20 | D2 | Exact spacing scale and the responsive grid (mobile/tablet/desktop), plus container radius. | Open |
| D-21 | D2 | Conversation layout: correspondence composition, whether bubbles exist at all, and how member/Athena distinction is expressed. | Open — D2 §6 rejects bubble dependence |
| D-22 | D2 | Introduction layout composition under single-person dominance and progressive revelation. | Open — depends on D-09, F-31, F-33 |
| D-23 | D3 | Exact dark anchor: which near-black family (midnight, charcoal, ink, deep mineral, restrained blue-black/violet-black) and how dimensional depth is produced. | Open |
| D-24 | D3 | Exact warm anchor: which luminous ivory/stone family reads illuminated rather than cream, and survives long-conversation comfort. | Open |
| D-25 | D3 | Accent survival testing: does antique gold survive? does sage survive? does lavender/plum survive? plus Athena-presence color and connection-event color. | Open — Athena/connection color depends on D4 (D-02) |
| D-26 | D3 | Exact semantic palette: success, warning, error, safety, destructive, disabled, focus, selected — with non-color-only signals. | Open |
| D-27 | D3 | Token architecture and material values: environment/surface/text/border/Athena/relational/organic/significance/safety/destructive/focus families, plus opacity, shadow, blur, gradient and radius values. | Open — includes reconciling hardcoded runtime color drift |
| D-28 | D3 | Global appearance preference: is a user-selectable light/dark setting appropriate alongside environmental choreography, and how does system appearance interact with it? | Open — D3 §18 forbids conflating the two |
| D-29 | D3 | Final dark→warm transition behavior: where it occurs, how it is choreographed, and its reduced-motion equivalent. | Open — F-16 controlling |
| D-30 | D4 | Athena's functional-state behaviors: exact listening, processing, speaking, quiet and recognition treatments, and how each stays distinguishable from network, offline, service, transcription and voice failure. | Open — F-18 controlling; runtime currently uses generic pulse |
| D-31 | D4 | Connection-event choreography: what a connection looks like when it must preserve two distinguishable individuals rather than merging them; also mutual-curiosity, Focus Mode, ending, return and successful-departure transitions. | Open — runtime currently merges paired points into one, contradicting D4 §3 |
| D-32 | D4 | Routine transition timing: whether the current 1200ms global route entrance adds coherence or sluggishness, and the final page-transition and microinteraction vocabulary. | Open — D4 §8 requires quick, restrained routine transitions |
| D-33 | D4 | Motion performance budget and animation technology: frame targets, CPU/GPU/battery/thermal limits for ambient behavior, and the implementation approach. | Open |
| D-34 | D4 | Introduction and human-handoff choreography: how Athena frames, the human emerges, and Athena recedes — plus the photograph-appearance motion. | Open — depends on D-09; F-31, F-33 controlling |
| D-35 | D5 | Sound control surface: where voice on/off, stop, mute, auto-play, playback speed, volume and caption/transcript visibility live, how preferences persist, and the fate of the uncontrolled landing chime. | Open — F-04, X-06 controlling; runtime chime currently has no control |
| D-36 | D5 | Production voice: provider, synthesis model, named voice, exact pitch, speech rate and modulation parameters, chosen through the D5 §25 audition set and blind comparison. | Open — D5 canonizes no provider or voice |
| D-37 | D5 | Spoken composition: how long text responses are segmented for voice while preserving meaning, and how voice-length differs from text-length. | Open — D5 §17 |
| D-38 | D5 | Sonic signature implementation: notes, intervals, tuning, timbre realization, duration, audio format, and synchronization with D4 presence (attention → organization → settling). | Open — depends on D-06, D-30 |
| D-39 | D5 | Event sound treatments: arrival, Athena readiness, introduction, mutual curiosity, Focus Mode, ending, successful departure, error, safety and notification — which exist at all, and their restraint bounds. | Open — D5 §§21–22; no dating-app match sound, no reward loop |
| D-40 | D5 | Barge-in technology: how natural interruption is detected and how Athena yields, including failure and false-trigger behavior. | Open — E4 barge-in decision preserved |
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
4. **Cardification, continuity, icons (D1 review).** Interior surfaces are
   broadly cardified; arrival and interior do not yet share a material/accent
   language; iconography is generic with no restraint policy. Recorded as
   inputs to D2–D6, not repaired.
5. **Hardcoded color drift (D3 review).** `src/components/landing-background.tsx`
   hardcodes a literal light-blue-to-white sky gradient, and
   `src/routes/__root.tsx` hardcodes a `theme-color` value; both sit outside
   the token system. The runtime light/dark pair is structured as a
   conventional theme rather than as choreographed environmental states.
   Recorded as downstream implementation work under D-27/D-28; not repaired.
6. **Merging connection pairs (D4 review).** The landing field merges two
   paired points into a single object, contradicting D4 §3 "connection
   preserves two". Pairing also recurs often enough to read as abundance
   rather than rarity. Recorded under D-31/D-16; not repaired.
7. **Generic motion states (D4 review).** `animate-pulse` serves the recording
   state, the thinking indicator and skeletons; a 1200ms global route entrance
   applies broadly. Recorded under D-30/D-32 as implementation evidence only.
8. **Voice & sonic divergence (D5 review).** The landing chime is synthesized
   on arrival with no mute, no persisted preference and no member control
   (`src/components/landing-background.tsx`), in tension with D5 §15 and F-04.
   The TTS route (`src/routes/api/tts.ts`) defaults to a stock `shimmer` voice
   selected for availability rather than through the audition protocol. No
   designed sonic signature exists, long responses receive no voice-specific
   segmentation, and no playback-speed/caption/auto-play preference surface
   exists. Recorded under D-06/D-12/D-35/D-37/D-38; not repaired.
9. **Progressive revelation still absent.** Introductions contain no counterpart
   photography, so no revelation sequence exists to evaluate. Preserved as
   D-09/X-33; explicitly not implemented in this pass.

---

# Revision history

| Version | Date | Description |
|---|---|---|
| 1.5 | 2026-08-17 | D5 — Voice & Sonic Identity v1.0 canonized. D-35–D-40 added; D-06, D-12 and D-13 annotated with D5's governing direction. Provisional `shimmer` voice and uncontrolled landing chime recorded as runtime implementation evidence only. Voice/text equivalence (F-04) and voice-privacy boundaries preserved; no acoustic profiling authority created. No runtime change. |
| 1.4 | 2026-08-17 | D4 — Athena Presence & Motion v1.0 canonized. D-30–D-34 added; D-02, D-03, D-11, D-13 and D-16 annotated with D4's governing direction. Merging connection pairs, connection abundance, generic pulse states and the 1200ms route entrance recorded as runtime evidence. Reduced-motion baseline preserved. No runtime change. |
| 1.3 | 2026-08-17 | D3 — Color, Light & Material v1.0 canonized. D-23–D-29 added; D-05 and D-10 annotated with D3's governing direction. Hardcoded color drift recorded as downstream work. Accessibility contrast baseline preserved. No runtime change. |
| 1.2 | 2026-08-17 | D2 — Typography & Composition v1.0 canonized. D-18–D-22 added; D-17 annotated with D2's governing container direction. Broad cardification and sub-44px links preserved as implementation gaps. No runtime change. |
| 1.1 | 2026-08-17 | D1 — Visual Identity v1.0 canonized. D-15–D-17 added as open design questions; D1 review observations recorded. No runtime change. |
| 1.0 | 2026-08-17 | Register established alongside Design Foundation v1.0. D-01 and D-07 recorded as binding founder design decisions; D-02–D-14 recorded as open. No runtime, UI, CSS, token, typography, color, asset, animation, sound, voice or photography change made. |
