# Experience Architecture — Decision & Implementation Register

Canonical record of founder decisions and downstream implementation
requirements arising from Experience Architecture review (E1–E8).

Nothing here authorizes implementation. Items marked *Recorded — Not Yet
Implemented* are requirements to be satisfied during the named downstream
phase. Founder decisions are binding and may only be amended by a new dated
entry in this register.

Status values: **Founder Decision — Binding** · **Recorded — Not Yet
Implemented** · **Implemented** · **Verified**

---

## Part I — Founder decisions

### X-01 — Pause expiry never silently returns a member to matchmaking — **APPROVED (2026-08-17)**

*Source:* E2 — Emotional Journey (§35, §38); runtime finding in
`runMatchmakingForUser`, which currently auto-expires a `rest` state when
`hold_until` passes.

**Decision.** Expiration of `hold_until` must NOT silently return a member to
the matchmaking pool. When a selected pause period expires, the member remains
out of matchmaking until they deliberately choose to resume. Resumption is
always an explicit member act.

Athena may appropriately let the member know their selected pause period has
ended and ask whether they are ready to return. That message must carry no
pressure, no urgency, no scarcity, and no engagement-oriented language, and
must obey the notification quiet standard once X-02 is established. Silence
from the member is a valid answer and leaves them paused.

A deliberately chosen Rest/Pause state remains an intentional member state and
is never read as abandonment (consistent with F-01/F-02).

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

---

## Part II — Downstream implementation requirements

| ID | Requirement | Source | Phase | Status |
| --- | --- | --- | --- | --- |
| X-02 | Establish a formal notification **quiet standard**: frequency ceilings, absence handling (what Athena does and does not send when a member is away), and Relationship Focus Mode quieting. | E2 §15, §16, §31 | UX Specification / E4–E6 | Recorded — Not Yet Implemented |
| X-03 | Design **Waiting** as an intentional member experience — a designed product state with its own presence, pacing, and meaning — rather than a passive or empty UI state. | E2 §15 | UX Specification / E4–E6 | Recorded — Not Yet Implemented |
| X-04 | Design **restrained ceremony** for significant transitions (arrival, first introduction, mutual connection, first meeting, relationship focus, endings), proportionate and never celebratory of engagement. | E2 §42 | E4–E6 and later UX Specification | Recorded — Not Yet Implemented |
| X-05 | Express Athena's **thinking/processing state** through Athena's own visual and motion language rather than a generic spinner, wherever technically appropriate; preserve genuine latency and error clarity without artificial delay or theatrical behavior. | E3 §35; founder decision (2026-08-17) | E6 — Motion, Curiosity & Revelation / later UX Specification | Recorded — Not Yet Implemented |
| X-06 | Establish **member sound controls** (Athena voice playback, automatic speech, sound effects, notification sound, captions/transcripts) and guarantee a complete product experience with sound disabled. | E4 §33, §35; founder decision (2026-08-17) | UX Specification / Voice Prototype Stage | Recorded — Not Yet Implemented |
| X-07 | Design the **sonic signature** and per-transition sound treatment through prototyping and member testing; no provider, voice, frequency, interval, or asset is selected by E4. | E4 §21–§23, §30, §31, §50, §51; founder decision (2026-08-17) | Design System phase / Voice Prototype Stage | Recorded — Not Yet Implemented |
| X-08 | Implement **environmental and locked-screen voice privacy**: never speak intimate content aloud absent a member action or clearly understood setting; align with notification privacy doctrine. | E4 §36, §37; founder decision (2026-08-17) | UX Specification | Recorded — Not Yet Implemented |
| X-09 | Improve **voice interaction fidelity**: prompt interruption/barge-in handling, context-responsive pacing and emphasis, and graceful degradation from failed speech to text without pretending success. | E4 §12, §16, §44; founder decision (2026-08-17) | E7 / Voice Prototype Stage | Recorded — Not Yet Implemented |
| X-10 | Resolve the **entry/internal visual split**: the arrival experience (deep field, slow point motion, atmospheric depth) and the internal product surfaces (warm paper light, conventional card/border chrome, plum accent) currently read as two products. One Athena identity must span both, with context changing density and emphasis only. | E5 §38, §45, §50 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-11 | Reconcile **design tokens with the E5 palette direction**: current tokens are a warm-paper/plum system (`--paper`, `--plum`, `--ember`) with no midnight-navy anchor, antique-gold accent, or organic secondary. Retune semantic roles, dark/light application, and contrast during the design-system phase. Palette values in E5 §7 remain directional. | E5 §7–§13, §45 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-12 | Remove residual **hardcoded and non-semantic color** from presentation code (e.g. `bg-black/40–60` scrims in the Athena sheets, report sheet and photo uploader; `text-white/90` photo controls; the literal gradient in the landing background). All color must resolve to semantic tokens so dark/light and accessibility behave as one system. | E5 §8, §44, §45 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-13 | Review **progress/step indicators and any bar-like affordance** so no visual element ever ranks or scores a person. The onboarding progress bar measures a member's own flow and is permitted; no equivalent treatment may appear on introductions, profiles, or reasoning surfaces. | E5 §32, §33 | E7 / E8 and later UX Specification | Recorded — Not Yet Implemented |
| X-14 | Establish **accessibility as a visual gate**: contrast verification across both environments, scalable type, motion alternatives (reduced-motion behavior for the connection field), visible focus states, and non-color-only signaling — validated before any visual system is accepted. | E5 §44, §48, §49 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-15 | Define **visual privacy treatments** for sensitive surfaces (app-switcher/screenshot obscuring where preventable, notification content, oversized sensitive labels, shared-screen states), governed by Privacy & Security doctrine rather than aesthetics. | E5 §46; Privacy & Security Architecture v1 | UX Specification / Security review | Recorded — Not Yet Implemented |
| X-16 | Establish **reduced-motion support** across the experience: the landing connection field animates continuously with no `prefers-reduced-motion` path, and no motion-alternative standard exists. Reduced motion must yield an equivalent, not lesser, product. | E6 §50, §51; E5 §44 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-17 | Replace remaining **generic motion placeholders** with Athena-native state language: `animate-pulse` dot as the thinking indicator and the pulsing microphone/listening treatment in the Athena conversation surface. Must preserve honest latency and error reporting (see X-05). | E6 §7, §16, §18, §19 | E6 → Design System / UX Specification | Recorded — Not Yet Implemented |
| X-18 | Define **distinct operational states** in motion and language: Athena processing, network unavailable, request failed, service unavailable. One generic animated state must not obscure different realities, and atmospheric motion must never hide technical failure. | E6 §53, §54 | UX Specification | Recorded — Not Yet Implemented |
| X-19 | Specify **connection-field temporal behavior** as a production specification: independence before connection, proximity without destiny, recognition, non-fusing connection, performance/battery budgets, and reduced-motion equivalents. Current field is a provisional atmospheric implementation only. | E6 §9–§15, §52 | Visual / Sonic / Interaction Design System | Recorded — Not Yet Implemented |
| X-20 | Define **transition and ceremony choreography** (spatial continuity, routine navigation speed, arrival, foundational-conversation completion, introduction, mutual connection, Relationship Focus Mode, successful departure) with motion tokens, timings and easing. Current runtime uses a single global fade and no state-aware transitions. | E6 §33–§42, §55 | E7 / E8 and Design System | Recorded — Not Yet Implemented |
| X-21 | Define **haptics and microinteraction feedback** — sparse, meaningful, never reward conditioning — with explicit member controls and platform fallbacks. | E6 §48, §49 | Design System / UX Specification | Recorded — Not Yet Implemented |
| X-22 | Rebalance **arrival before administration**: current sequence is landing → account creation → email verification → structured onboarding (welcome/consent → identity → preferences) → first meeting with Athena. Athena's presence should be established earlier relative to administrative setup, without weakening consent or authentication requirements. | E7 §6, §9 | Member Journey / UX Specification | Recorded — Not Yet Implemented |
| X-23 | Reduce residual **questionnaire feel** in onboarding: "Step 1 · You" / "Step 2 · Open to" structured steps are acceptable for necessary information under E7 §5, but the framing, copy, and sequencing should read as setup for a conversation rather than a form to complete. | E7 §4, §5, §11, §23 | Member Journey / UX Specification | Recorded — Not Yet Implemented |
| X-24 | Specify the **post-foundational-conversation state and Waiting surface**: after completion the member must understand that Athena keeps learning, that introductions are not guaranteed immediately, that waiting is legitimate, and that no ongoing activity is required to remain eligible. Extends X-03. | E7 §25, §26, §27 | Member Journey / UX Specification | Recorded — Not Yet Implemented |
| X-25 | Specify **conversational controls and mode parity**: easy switching between voice and text, visible listening state, transcription review/correction, stop playback, disable automatic speech, and a fully viable text-only path. Depends on X-06, X-09. | E7 §15–§19, §58 | UX Specification / Voice Prototype Stage | Recorded — Not Yet Implemented |
| X-26 | Specify **navigation and the Today surface** against E7 §35–§38: current tab navigation and Today/home must answer "what matters for me right now" without becoming a feed, dashboard, or exposure of internal architecture; keep Athena reachable without visual dominance. | E7 §35–§38 | Member Journey / UX Specification | Recorded — Not Yet Implemented |
| X-27 | Consolidate **account controls discoverability**: privacy, consent, notification preferences, devices & safety, export, understanding controls (Change / Correction / Removal), Rest/Pause, subscription, and deletion must all be reachable and legible; no important control buried because it permits departure. | E7 §46–§50 | Member Journey / UX Specification | Recorded — Not Yet Implemented |
| X-28 | Establish **honest error, AI-failure and connectivity behavior** in the member interaction layer: distinguish success from failure, preserve unsent text, distinguish sending from sent, prevent duplicate submission, explain retry, and never let atmospheric motion imply continued work after failure. Extends X-18. | E7 §51–§53 | UX Specification | Recorded — Not Yet Implemented |
| X-29 | Define **payment placement and commercial separation** when Business Architecture authorizes it: no payment before the member understands Athena, pricing clarity, administrative tone, and strict separation of commercial conversion from emotional disclosure. No payment implementation exists today. | E7 §43–§45 | Business Architecture / Member Journey UX | Recorded — Not Yet Implemented |
| X-30 | Reconcile the current **Rest/Pause control** (`Pause matches` on the profile surface) with E7 §28, §29 and X-01: entering and exiting must be understandable, never punitive, and no member may silently return to active matchmaking. Governance decision X-01 controls; do not resolve it through UI. | E7 §28, §29; X-01 | Member Journey / UX Specification | Recorded — Not Yet Implemented |

---

## Part III — Founder decisions from E4 review

### F-04 — Current “shimmer” voice is provisional only — **APPROVED (2026-08-17)**

*Source:* E4 §50–§51; runtime review of current voice provider.

**Decision.** The voice currently deployed in the application is provisional and may not be treated as Athena's canonical voice. Final voice selection will occur through the E4 prototype/audition process after the Experience Architecture is complete and will be evaluated against the E4 audition scenarios and the E4 sonic test.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-05 — Natural interruption/barge-in should ultimately be supported — **APPROVED (2026-08-17)**

*Source:* E4 §16; X-09.

**Decision.** Where technically feasible, a member speaking while Athena is speaking should naturally stop Athena's output, rather than requiring the member to wait for her response to finish. Implementation belongs to the later voice interaction fidelity pass (X-09).

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-06 — Context-sensitive pacing, emphasis, pauses, and emotional register — **APPROVED (2026-08-17)**

*Source:* E4 §7, §8, §12, §39; X-09.

**Decision.** Athena's spoken delivery should ultimately support context-sensitive pacing, emphasis, pauses, and emotional register consistent with E4. These behaviors must not be implemented until the voice prototype stage. Any implementation must not introduce artificial delay, theatrical processing, or seduction/attachment engineering.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-07 — Member audio controls must eventually satisfy E4 requirements — **APPROVED (2026-08-17)**

*Source:* E4 §33, §35; X-06.

**Decision.** Member audio controls must eventually support Athena voice playback, automatic speech behavior, sound effects, notification sound, and text/caption equivalents, ensuring a complete product experience with sound disabled. Exact control set, placement, and UX belong to the later UX specification / voice prototype stage.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-08 — Sonic signature and transition sounds remain intentionally unresolved — **APPROVED (2026-08-17)**

*Source:* E4 §21–§23, §30, §31; X-07.

**Decision.** No frequencies, notes, intervals, instruments, sound assets, or musical treatments may be selected for the sonic signature or transition sounds until the architecture is complete and a dedicated research/prototyping phase has been conducted. The current absence of sound assets is intentional and approved.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-09 — Preserve voice privacy architecture — **APPROVED (2026-08-17)**

*Source:* E4 §19, §20, §36, §37; Privacy & Security Architecture v1.

**Decision.** Raw voice recording retention and acoustic/emotional profiling remain prohibited. No change to this boundary may be made without separate architectural, privacy, consent, and legal review.

*Status:* Founder Decision — Binding · Already Governed by Privacy & Security Architecture v1.

---

## Part IV — Founder decisions from E5 review

### F-10 — Entry/internal split must resolve into one Athena visual world — **APPROVED (2026-08-17)**

*Source:* E5 §38, §45, §50; X-10.

**Decision.** The entry experience and internal product surfaces must ultimately be reconciled into one coherent Athena visual world. This does not require every surface to look identical: functional density and light/dark context may vary, provided the identity remains unmistakably Athena. Resolution belongs to the Visual / Sonic / Interaction Design System.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-11 — Current palette is implementation only; E5 palette is directional — **APPROVED (2026-08-17)**

*Source:* E5 §7–§13; X-11.

**Decision.** The existing palette is preserved only as current implementation and carries no canonical authority. The E5 palette (midnight navy, warm ivory, antique gold, organic secondary) is also directional. Final palette selection belongs to the later Visual / Sonic / Interaction Design System and its prototype process.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-12 — Hardcoded color resolved during design-system implementation — **APPROVED (2026-08-17)**

*Source:* E5 §8, §44, §45; X-12.

**Decision.** Residual hardcoded and non-semantic color is not repaired now. It must be resolved during the later design-system implementation so all visual behavior is governed consistently by the final token system.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-13 — Progress language may describe a member's own process only — **APPROVED (2026-08-17)**

*Source:* E5 §32, §33; X-13.

**Decision.** Progress indicators may describe a member's own process where useful. No ranking or progress visual language may migrate into member comparison, compatibility, introductions, or matchmaking reasoning.

*Status:* Founder Decision — Binding · Partially Governed (onboarding indicator permitted; prohibition already holds in current UI).

### F-14 — Accessibility verification is a beta gate — **APPROVED (2026-08-17)**

*Source:* E5 §44, §48, §49; X-14.

**Decision.** Accessibility verification is mandatory before the visual system may be accepted for beta. This includes contrast, scalable type, motion alternatives, focus visibility, and non-color-only signaling.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

### F-15 — Visual privacy treatments resolved before beta — **APPROVED (2026-08-17)**

*Source:* E5 §46; Privacy & Security Architecture v1; X-15.

**Decision.** Visual privacy treatments must be resolved before beta and must inherit the existing Privacy & Security architecture rather than defining new privacy behavior.

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

---

# Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-17 | Register established. X-01 founder decision recorded; X-02–X-04 recorded as downstream requirements from E2 review. |
| 1.1 | 2026-08-17 | X-05 recorded: Athena thinking/processing state must be expressed through Athena's own visual and motion language rather than a generic spinner, pending E6/UX specification. |
| 1.2 | 2026-08-17 | X-06–X-09 recorded from E4 canonical review: member sound controls, sonic signature prototyping, environmental/locked-screen voice privacy, voice interaction fidelity. |
| 1.4 | 2026-08-17 | X-10–X-15 recorded from E5 canonical review: entry/internal visual split, palette/token reconciliation, hardcoded color removal, no scoring affordances, accessibility gate, visual privacy treatments. No runtime or visual changes made. |
| 1.3 | 2026-08-17 | E4 approved. Founder decisions F-04 through F-09 recorded. X-06–X-09 scope refined and linked to F-04–F-09. No runtime or sound changes made. |
| 1.5 | 2026-08-17 | E5 approved. Founder decisions F-10 through F-15 recorded (one Athena visual world; palette directional; hardcoded color deferred to design system; progress language limited to a member's own process; accessibility verification a beta gate; visual privacy resolved before beta). No runtime or visual changes made. |
| 1.6 | 2026-08-17 | X-16–X-21 recorded from E6 canonical review: reduced-motion support, Athena-native state language replacing generic pulses, distinct operational states, connection-field temporal specification, transition/ceremony choreography, haptics and microinteractions. X-05 reconciled and scoped by E6 §7. No runtime or motion changes made. |
