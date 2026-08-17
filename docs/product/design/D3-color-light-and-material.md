# D3 — Color, Light & Material

## v1.0 · CANONICAL (2026-08-17)

**Status:** Canonical. Third domain specification beneath the
[Design Foundation](./DESIGN-FOUNDATION-V1.md), inheriting from
[D1 — Visual Identity](./D1-visual-identity.md) (canonical v1.0, verified) and
[D2 — Typography & Composition](./D2-typography-and-composition.md) (canonical
v1.0, verified).

**Authority:** Subordinate. D3 sits beneath the Constitution
(`docs/constitution/`), Athena University's Canonical Curriculum, Product
Architecture, Business Architecture, Privacy & Security, Trust & Safety, the
Experience Architecture E1–E8, Experience
[Final Integration](../experience/FINAL-INTEGRATION.md), the Design Foundation,
D1, D2, and all binding Founder Decisions (F-01–F-38, D-01, D-07). It amends
none of them. Where tension appears, the upstream authority controls and D3 is
corrected.

**Scope:** palette architecture, environmental color, light, darkness,
contrast, accent behavior, semantic color, surface relationships, depth,
translucency, borders, shadow, radius intent, material character and
environmental transitions.

**Explicitly out of scope:** D3 selects no production color values. No HEX,
RGB, HSL, OKLCH, opacity, shadow, blur, gradient, radius or material token is
established here. Those remain open in the
[Design Decision Register](./DESIGN-DECISION-REGISTER.md).

**Governing question.** How should color, light, darkness, depth and material
make Athena feel sophisticated, warm, intelligent, slightly futuristic,
emotionally safe and unmistakably continuous from first arrival through human
connection?

---

## 1. Color is environment before decoration

Color is not applied to the interface; it establishes the environment the
interface exists within. The governing question is never "what colors look
attractive together" but "what visual environment should this moment create".

## 2. Two environmental states, one world

- **Dark / deep** — arrival, Athena-forward moments, contemplation, important
  transitions, selected introduction moments, atmospheric presence.
- **Warm / luminous** — extended conversation, understanding, reading,
  reflection, relationship interaction, functional interior surfaces.

These are not two themes and not a component-library fork (§13). They are two
states of the same visual world, continuous through geometry, typography,
border behavior, spacing, accent and interaction.

## 3. The transition

Dark → warm should become a recognizable Athena behavior: unknown → known,
curiosity → understanding, distance → familiarity, possibility → human
presence. The system communicates this through experience, never through
member-facing symbolic explanation.

## 4. Dark does not mean black

The dark environment explores sophisticated near-black families — midnight,
charcoal, ink, deep mineral, extremely restrained blue-black or violet-black
undertones. The objective is dimensional darkness. Exact direction unresolved
(D-23).

Depth may emerge through subtle tonal variation, controlled light, atmospheric
falloff, spatial layering, connection-field depth and minimal material
separation — never through effects that compete for attention.

Darkness must create curiosity, focus, sophistication and calm. It must never
create danger, secrecy, surveillance, nightclub, gaming, cyberpunk or
seduction atmospheres.

## 5. Warm does not mean beige

The interior must not default to contemporary beige wellness. Directional
families: warm ivory, parchment-light, softened stone, mineral cream,
restrained warm gray. The interior should feel *illuminated*, not merely
cream-colored. Excluded: sterile white, yellowed parchment, generic beige.

Warm surfaces must support "I can stay here" — comfortable for reading,
listening, thinking, disclosure and reflection, without visual fatigue during
long conversation.

## 6. Anchors

- **Midnight anchor.** Directional preference for a deep midnight/charcoal
  family as the principal dark anchor: sophisticated, stable, dimensional,
  slightly futuristic, mature. Avoid obvious navy-blue application styling.
- **Luminous anchor.** Directional preference for a warm luminous ivory/stone
  family as the primary internal light environment: soft, refined, readable,
  human, expensive without opulence.

Exact hues remain unresolved (D-23, D-24).

## 7. Accent philosophy

Accent color is highly restrained and carries meaning. Members should learn
that certain color appearances indicate significance; accent is never used to
make screens colorful.

- **Antique gold** remains a strong candidate for significance, meaningful
  transition, selected focus, introduction, rare emphasis and mark detail. It
  must appear rarely enough to retain meaning, and lean muted, mineral,
  antique and restrained — never bright yellow gold, metallic gradients,
  jewelry-store, casino or trophy styling.
- **Gold is not the luxury.** If removing gold makes Athena stop feeling
  premium, the design system has failed. Luxury exists first through
  typography, spacing, proportion, material, motion, writing and precision.
- **Organic secondary** (sage a candidate) may carry human warmth, calm,
  growth, relational development and state distinction — without turning
  Athena into a wellness application.
- **Relational secondary** (lavender/plum a candidate) may carry connection,
  convergence and relational significance. The current runtime plum/lavender
  language is directional evidence only.

## 8. Current color is evidence, not authority

Existing warm-paper / plum / ember tokens may be evaluated but are not
canonical merely because they exist. Equally, the midnight/gold/organic
direction does not automatically replace them. The final palette is selected
on coherence with D1–D3 and accessibility.

## 9. Palette restraint

A small number of meaningful families: dark environmental anchor, warm
environmental anchor, primary significance accent, organic secondary,
relational secondary, semantic functional colors. Structural direction only;
token architecture is downstream (D-27).

## 10. Semantic color

Functional color stays distinguishable from aesthetic color, with clear
treatment for success, warning, error, safety, destructive action, disabled,
focus and selected. Conventional comprehension is never sacrificed to make
functional states aesthetically unusual.

- **Red** stays primarily functional: destructive actions, serious errors,
  safety-critical conditions. Red is never Athena's romantic color.
- **Green** does not mean romantic success; it remains available for familiar
  functional confirmation. Relationship success is never a green status dot.
- **Romantic clichés excluded:** bright red, hot pink, Valentine palettes,
  rose gradients, heart-associated color systems.

## 11. Color can never become a score

Color must never imply a hierarchy of human desirability. No candidate appears
brighter, more golden, more saturated or more luminous because Athena
considers them a stronger match. Member-facing compatibility remains
non-numerical and non-ranking, and visual treatment obeys the same rule.

Athena's confidence must not be expressed through glow intensity, saturation,
brightness or aura size unless the meaning is explicit and governed —
otherwise intensity becomes a hidden score.

## 12. Light as Athena language

Light may become one of Athena's most distinctive behaviors, communicating
presence, attention, emergence, transition, recognition and connection. Light
is environmental, never a special-effect layer.

- **Athena light.** Athena's abstract presence may have a characteristic light
  behavior, potentially more recognizable than an icon. Color, intensity,
  shape, falloff, movement and response remain unresolved until D4 (D-02,
  D-25).
- **Connection light.** If the connection field survives, a connection event
  may involve a restrained light change: uncommon, subtle, meaningful — never
  celebratory spectacle. Current purple/lavender behavior is evidence only.
- **Human light.** Photography retains natural human color. No heavy brand
  grade that alters skin tone, environment, clothing or authenticity. The
  interface frames the person; it never manufactures them.
- **Light and revelation.** Progressive revelation may use luminance, focus,
  spatial emphasis and material separation — never deceptive blur or
  artificial concealment to manufacture suspense (F-33).

## 13. Gradients and glow

Gradients are permitted only where they produce genuine environmental depth or
material behavior. No generic AI gradients, no rainbow intelligence, no neon
blue-purple default. Glow is extremely restrained: Athena presence, rare
connection, subtle atmospheric depth only.

## 14. Material philosophy

Surfaces feel softly dimensional, materially believable and extremely refined
— never plastic, glossy, game-like, excessively glassy or heavily
skeuomorphic.

- **Dark material:** depth, atmospheric layering, controlled luminosity.
- **Warm material:** subtle surface distinction, soft tactile suggestion,
  gentle depth.
- **Paper without paper imitation.** Warm surfaces may borrow the psychology
  of fine paper — softness, readability, tactility, warmth — without literal
  texture simulation. Athena remains digital.
- **Metal without metal imitation.** Antique-gold accents may suggest material
  quality without fake foil or chrome effects.

## 15. Depth mechanisms

- **Translucency** supports depth where layering matters, context should stay
  perceptible or spatial hierarchy benefits. Never glassmorphism for its own
  sake, and never the primary language.
- **Blur** supports modal separation, atmospheric depth, privacy and focus —
  not decoration, and never concealment for artificial curiosity.
- **Shadow** is subtle and physically coherent, used for separation, depth and
  hierarchy. No dramatic shadows that make everything float.
- **Borders** are restrained: structural clarification, input definition,
  selected state, accessibility, material separation. Do not outline every
  surface (consistent with D2 §9, space over borders).
- **Radius** reflects maturity, precision and warmth — neither severe
  industrial sharpness nor playful bubble roundness. Values unresolved (D-20).
- **Surface hierarchy** uses a limited set of levels — environment, primary
  surface, elevated surface, interactive surface, overlay. No endless nested
  elevations.

## 16. Color behavior by moment

- **Arrival.** Visually restrained: deep environmental anchor, extremely
  limited light, subtle Athena/connection accent, warm human color introduced
  gradually. Curiosity without spectacle.
- **Interior.** The palette supports humans rather than competing with them;
  skin tones, photography, text, conversation and relationship content
  dominate.
- **Introduction.** The other person is the visual event. Brand color recedes;
  photography and Athena's framing carry the moment. No high-intensity match
  colors surrounding a person (F-31, F-33).
- **Relationship.** Growing significance does not increase color intensity. A
  developing relationship must not look like game-level progression; the
  interface may become quieter.
- **Focus Mode.** Calm, deliberate, settled — never victory, exclusivity
  trophy or locked achievement.
- **Ending.** Emotionally neutral and dignified. No red default, broken-heart
  symbolism, dramatic darkness or failure language. Ending is a relationship
  state, not product failure.
- **Return.** Welcomed back with continuity, without celebration or judgment.
- **Successful departure.** Significance may be acknowledged without confetti,
  trophies, gamified completion or engagement-recapture prompts.
- **Safety.** Safety overrides aesthetic subtlety. Warnings and dangerous
  actions stay visible, understandable and differentiated. Serious information
  is never hidden inside quiet luxury styling.
- **Privacy.** Discreet, controlled, trustworthy — no security theater,
  gratuitous red banners or technical jargon. Where real risk exists, clarity
  wins.
- **Payment.** Visually part of Athena: clear, calm, transparent, unpressured.
  No techniques exploiting emotional momentum after disclosure or connection.

## 17. Accessibility is not negotiable

Every color and material decision must survive accessibility review: readable
text contrast, non-color-only state communication, focus visibility, usable
disabled states, text scaling and high-contrast resilience. The repaired
contrast baseline from the P0 closure pass is protected and must not regress
(F-14, X-14).

Muted text cannot become unreadable because low contrast looks sophisticated.
If an aesthetic color fails accessibility, the color changes — the requirement
does not.

Where platform settings reduce transparency or visual effects, hierarchy must
remain understandable; material effects can never carry essential meaning
alone. Where visual effects interact with motion, F-16 reduced-motion
equivalents apply.

Athena must stay coherent across OLED, LCD, varying brightness, outdoor mobile
use and lower-quality displays. Subtlety must not become invisibility.

## 18. Dark mode is not a theme toggle

D3 does not define Athena as a conventional user-selectable light/dark theme
system. Dark and warm are experiential states, choreographed by moment.
Whether a separate global appearance preference is appropriate — and how
system appearance preferences interact with Athena — is evaluated downstream
(D-28). Environmental choreography must not be confused with OS theme
selection; accessibility and usability are respected regardless.

## 19. Tokens and consistency

Production color uses semantic tokens, not uncontrolled hardcoded values.
Potential families: environment, surface, text, border, Athena, relational,
organic, significance, safety, destructive, focus. Naming and values are
downstream (D-27).

The same semantic meaning must not use unrelated colors across screens without
reason. Shadow, border, transparency, elevation and radius must eventually
derive from one coherent material system.

Previously audited hardcoded color values and token divergence are downstream
implementation work; D3 repairs nothing.

## 20. Tests a final palette must pass

- **Emotional.** Arrival creates curiosity; a one-hour conversation remains
  livable; introductions keep the person central; joy reads warm without
  childishness; vulnerability stays emotionally neutral; safety becomes
  unmistakable; endings preserve dignity; administration stays clear. Success
  on the landing page alone is insufficient.
- **Gender.** Not designed primarily for men or women; warmth coexists with
  strength, sophistication with softness.
- **Age.** Mature and readable across Athena's adult membership; no dependence
  on youthful trends.
- **Cultural.** No essential meaning resting on a single culturally specific
  color interpretation; functional states readable through multiple signals.
- **Five-year.** Ages gracefully; no overdependence on current trends.
- **Screenshot.** A random screen still belongs to the same visual world with
  no logo, no name and no photograph present.
- **Restraint.** Before adding a color or effect: what meaning disappears if
  it is removed? If none, remove it.

## 21. Governing principles

> Color creates environment before decoration.
> Darkness creates depth; warmth creates humanity.
> Dark does not mean black. Warm does not mean beige.
> The interior should feel illuminated, not merely light-colored.
> Luxury exists before gold is added.
> Accent color earns meaning through rarity.
> Light may become one of Athena's strongest visual languages.
> Human photographs retain natural humanity.
> Color never becomes a hidden compatibility score.
> Material should feel believable, refined, and quiet.
> Aesthetic subtlety never outranks accessibility.
> As human connection becomes more important, Athena's palette may become quieter.
> The dark arrival and warm interior are two states of one world.

---

## Canonical review record (2026-08-17)

1. **D1 and D2 canonical status verified.** Both are v1.0 canonical and
   unmodified by this pass.
2. **Conflict review** against the Design Foundation, D1, D2, E1–E8,
   Experience Final Integration, the Constitution, Privacy & Security, Trust &
   Safety, Business Architecture and Founder Decisions F-01–F-38, D-01, D-07:
   **no conflict found.** D3 reinforces two-environments/one-world (Foundation,
   D1), space over borders (D2 §9), no hidden scoring (E8, Constitution L2),
   F-31 single-person attention, F-33 progressive revelation without
   manipulation, F-14 accessibility gate and F-16 reduced motion.
3. **No production color values selected.** D3 remains directional; all values
   are deferred to the register.
4. **Runtime tokens compared as evidence only.** `src/styles.css` currently
   defines a warm-paper / ink / plum / ember system in OKLCH with a dark
   counterpart. Recorded as evidence; not preserved, not replaced.
5. **Accessibility baseline preserved.** The repaired `--muted-foreground`
   contrast values and the F-14/F-16 gates remain protected.
6. **No runtime change made.** No CSS, token, color, gradient, shadow,
   component, asset or UI modification in this pass.

### Newly recorded runtime divergences (not repaired)

- `src/components/landing-background.tsx` hardcodes a literal
  `linear-gradient(180deg, #cfe4f5 …, #ffffff)` sky — a light-blue arrival
  gradient outside the token system and inconsistent with the deep
  environmental arrival anchor (§16).
- `src/routes/__root.tsx` hardcodes `theme-color: #2B1830`, unlinked from the
  token system.
- The runtime light/dark pair is structured as a conventional theme rather
  than as choreographed environmental states (§18).
- Photo-count divergence (six vs. five, D-07) and broad cardification remain
  open from D1/D2 review.

---

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-17 | D3 — Color, Light & Material canonized following canonical review. No conflict found with upstream architecture. No runtime, UI, CSS, token, color, gradient, shadow, material, asset, animation, sound, voice or photography change made. |
