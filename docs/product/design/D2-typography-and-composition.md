# D2 — Typography & Composition

## v1.0 · CANONICAL (2026-08-17)

**Status:** Canonical. Second domain specification beneath the
[Design Foundation](./DESIGN-FOUNDATION-V1.md), inheriting from
[D1 — Visual Identity](./D1-visual-identity.md) (canonical v1.0, verified).

**Authority:** Subordinate. D2 sits beneath the Constitution
(`docs/constitution/`), Athena University's Canonical Curriculum, Product
Architecture, Business Architecture, Privacy & Security, Trust & Safety, the
Experience Architecture E1–E8, Experience
[Final Integration](../experience/FINAL-INTEGRATION.md), the Design Foundation,
D1, and all binding Founder Decisions (F-01–F-38, D-01, D-07). It amends none
of them. Where tension appears, the upstream authority controls and D2 is
corrected.

**Scope:** typographic personality, hierarchy, display/body/conversational
text, metadata, spacing, line length, rhythm, alignment, density, white space,
composition, container logic, and readable hierarchy across devices.

**Explicitly out of scope:** D2 selects no font family, no type scale, no
line-height or letter-spacing values, no spacing scale, no grid, no container
radius, and no final chat or introduction layout. Those remain open in the
[Design Decision Register](./DESIGN-DECISION-REGISTER.md).

**Governing question.** How should typography, spacing, hierarchy and
composition make Athena feel intelligent, mature, luxurious, readable, calm
and unmistakably coherent across arrival, conversation, introductions,
relationship states and administration?

---

## 1. Typography is Athena's visual voice

Typography is the written counterpart of Athena's spoken voice. It should
communicate intelligence, composure, warmth, precision, quiet authority,
maturity and restraint. The type system must never feel louder than Athena
herself.

## 2. Core typographic direction

Luxury automotive precision with quiet intelligence and wisdom: engineered,
premium, highly legible, contemporary, subtly distinctive, emotionally calm.

Excluded: fashion-magazine excess, generic SaaS typography, playful startup
fonts, overtly futuristic type, academic stiffness, ornate classical styling.

## 3. Two-voice system

- **Display / reflective voice** — meaningful headings, arrival statements,
  significant Athena observations, selected introduction moments, relationship
  transitions.
- **Functional / conversational voice** — conversation, controls, navigation,
  settings, metadata, longer body text.

The pairing itself (serif or otherwise) remains unresolved (D-04).

## 4. Display type must be rare

Display type signals significance, reflection, transition or emotional weight.
It does not belong on every card, page or label. If everything is elevated,
nothing is.

## 5. Body text is the workhorse

Athena is conversation-heavy. Body text must support long reading sessions,
emotional material, nuanced reasoning, mobile screens, accessibility and mixed
ages. Legibility outranks stylistic novelty.

## 6. Conversation as correspondence

Athena's text conversation should read as thoughtful correspondence, not a
generic messaging app: generous line spacing, controlled width, breathing room
around Athena's responses, and a subtle distinction between member and Athena.

Bubble dependence is rejected. If bubbles are ever used they must earn their
place; bright colored bubbles, tails, dense alternating stacks and messenger
mimicry are excluded.

## 7. Measure, line height, tracking, capitalization, weight

- **Line length** — controlled measure for long-form responses; never
  edge-to-edge on wide screens.
- **Line height** — generous enough for calm reading; neither technical-tight
  nor editorially loose.
- **Letter spacing** — subtle. No exaggerated tracking in body text; controlled
  tracking permitted in display where it supports restraint.
- **Capitalization** — avoid excessive all-caps; small structural labels only,
  where accessibility allows. All-caps never simulates luxury.
- **Weight** — a small, disciplined set. Hierarchy emerges from size, space,
  placement and meaning rather than constant bolding.

## 8. Hierarchy and space

The system must clearly separate primary meaning, supporting explanation,
functional action, metadata and administrative detail. A member should
immediately understand what matters most.

Space is part of the hierarchy. A larger gap can carry stronger conceptual
separation than a border, divider or additional card. D2 reduces dependence on
container chrome.

## 9. Container policy (governing direction; reconciles D-17)

> Use containers for genuine conceptual grouping, not as the default answer to
> layout.

- **Needs a container:** discrete object; actionable unit; security boundary;
  clearly grouped settings; introduction object.
- **May not need a container:** Athena response; reflection; simple text block;
  single action; state explanation.

Card-on-card presentation should be reduced: excess cards produce a dashboard
feeling, product modularity, fragmentation and generic SaaS appearance. Athena
should feel continuous. Exact component rules remain downstream under D-17.

## 10. Composition by surface

- **Page composition** — one clear primary focus; secondary content must not
  compete; avoid multiple equal-weight zones.
- **Arrival** — extremely simple: atmospheric field, minimal presence, one
  meaningful line, one clear path forward. No navigation or feature explanation.
- **Interior** — more structure permitted while preserving calm, hierarchy,
  readability and negative space; livable for long sessions.
- **Today / Home** — answers "what matters now?" through hierarchy, not a
  widget collection. One or two focal areas, not a grid of equal cards.
- **Conversation** — Athena occupies meaningful space when active: response,
  member input, minimal persistent controls, room for presence. No interface
  machinery around every exchange.
- **Introduction** — not a profile listing. Athena framing, human meaning,
  progressive reveal, photography, member choice; one person visually dominates
  the moment (F-31, F-33).
- **Living Profile** — reflective and understandable; distinguishes
  member-stated, Athena-inferred, current, historical/change state, and
  correction/removal actions. The member is never a data dashboard.
- **Settings / administration** — conventional where clarity and speed matter,
  while preserving Athena's typography, spacing, tone and quality. Account
  administration is not poeticized.

## 11. Devices

Mobile is primary; it is not a compressed desktop, and hierarchy must remain
intentional at narrow widths. Desktop uses additional space for breathing room,
controlled side context, better reading width and spatial presence — not
stretched mobile content or unnecessary multi-column complexity. Tablet is
intentional, not an accidental breakpoint. Type scales adapt fluidly or through
disciplined breakpoints, without dramatic jumps; display type stays elegant on
small screens.

## 12. Accessibility is typographic precision

- The system must survive user text scaling; no critical control or label may
  break when text enlarges. This preserves the P0 accessibility baseline
  (F-14, X-14) established during the Experience Integration Audit.
- Typography and composition must support comfortable touch targets. The audit
  finding of three standalone text links below 44px remains an open downstream
  repair requirement; D2 forbids text-link composition that creates
  inaccessible hit areas.
- Keyboard focus must remain visible and feel intentional; visual luxury never
  erases focus indication.
- Links must be recognizable without relying on color alone; low-contrast
  "luxury" link styling is excluded.
- Metadata (timestamps, status, location area, small labels) stays visually
  secondary but readable — never ultra-light or tiny.
- Labels prioritize clarity; ordinary language beats clever language.
- Readability serves adults across a broad age range: adequate size, clear
  contrast, restrained typography, comfortable spacing. Youthful visual trends
  never outrank readability.

## 13. States and moments

- **Empty states** use composition and language, not decorative filler.
- **Waiting** must feel intentional rather than empty: Athena presence, calm
  text, spacious layout, at most one meaningful optional action. No fake
  progress, no busywork (F-16, F-24).
- **Ceremony** may temporarily use more expressive typography — first arrival,
  foundational conversation completion, introduction, Focus Mode, successful
  departure — and remains rare and proportional.
- **Vulnerable moments** reduce competing text and metadata, increase breathing
  room, and keep actions secondary; the member's thought becomes primary.
- **Joyful moments** may carry slightly more energy, never loud type or
  oversized celebration text.
- **Errors** state what happened, what to do and what remains safe, in that
  hierarchy. Recovery instructions are never fine print.
- **Safety language** may become firmer and more explicit; clarity outranks
  visual softness.

## 14. Integrity constraints

- **Quotes** — Athena's statements are not repeatedly turned into decorative
  quote cards. Her language is sufficient.
- **Numbers** — functional only. Match counts, engagement statistics, ranking
  and compatibility are never typographically elevated. No human value is
  encoded through numerical emphasis (Constitution; F-31).
- **Date / time** — natural and human-readable; no technical timestamp
  formatting on member-facing surfaces.
- **Business / payment** — price, frequency, renewal and cancellation must be
  easy to understand. Hierarchy is never used to obscure cost.
- **Compositional privacy** — sensitive information is never displayed more
  prominently than necessary; controlled preview, discreet hierarchy and
  thoughtful labels reinforce privacy.

## 15. Influences

Editorial influence is permitted in hierarchy, spacing, composition and pacing
— not magazine aesthetics; interaction remains primary. Automotive influence is
permitted in precision, alignment, controlled weight and information discipline
— not dense instrument-panel layouts. Wisdom reads as confidence, calm, absence
of visual panic, deliberate emphasis and room — never ornament.

Typography and spacing create tempo: dense reads fast, spacious reads slow.
Athena modulates tempo by context.

## 16. Future token structure (roles only)

A limited typography token set should eventually define roles: display, title,
heading, body, conversation, label, metadata, button. A coherent spacing scale
should apply consistently across conversation, containers, forms, introduction
and settings. A simple responsive grid should support mobile, tablet and
desktop, aiding alignment without rigidity. No values are selected here.

## 17. Governing principles

> Typography is Athena's visual voice.
> Luxury automotive precision plus quiet intelligence.
> Display type is powerful because it is rare.
> Body text must survive long conversations.
> Conversation should feel like correspondence, not generic messaging.
> Space should often do more work than borders.
> Use containers for genuine grouping, not by default.
> One screen should usually have one clear primary focus.
> Mobile is primary, not secondary.
> Visual luxury never outranks readability.
> Accessibility is part of typographic precision.
> Hierarchy should make meaning easier to understand.

---

## Canonical review record

1. **D1 status verified** — D1 — Visual Identity is canonical v1.0.
2. **Comparison** — D2 was compared against the Design Foundation, D1, E1–E8,
   Experience Final Integration, Product Architecture, Privacy & Security,
   Trust & Safety, Business Architecture and the accessibility baseline. No
   conflict found. D2 is consistent with F-14/X-14 (accessibility), F-16
   (reduced motion / no fake progress), F-24 (waiting designed), F-31 (single
   person, no comparison or scoring), F-33 (progressive revelation) and the
   Constitution's prohibition on member-facing scores and labels.
3. **No implementation values selected** — D2 chooses no font, scale, spacing
   value, grid, radius or layout.
4. **D-17 reconciled** — §9 supplies the governing container direction; the
   component-level policy remains open under D-17.
5. **Cardification** — current broad cardification is recorded as an
   implementation gap, not a doctrine conflict.
6. **Accessibility baseline preserved** — unchanged and reaffirmed.
7. **Sub-44px links** — preserved as a downstream repair requirement (D-14 /
   UX specification), not repaired here.
8. **Open decisions recorded** — D-04, D-10, D-17 extended; D-18–D-22 added to
   the Design Decision Register.
9. **No runtime change** — no CSS, token, component, typeface, layout or UI
   change was made in this pass.

### Current-runtime observations (recorded, not repaired)

- Interior surfaces are broadly cardified, including Athena responses and
  simple text blocks that §9 says may not need containers.
- `src/styles.css` currently pairs a display serif with a neutral sans; this is
  provisional and does not constitute the D-04 selection.
- Conversation surfaces lean on message-stack presentation rather than
  correspondence composition.
- Three standalone text links remain below the 44px target.

---

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-17 | D2 — Typography & Composition canonized following canonical review. No conflict found with upstream architecture. No runtime, UI, CSS, token, typography, color, asset, animation, sound, voice or photography change made. |
