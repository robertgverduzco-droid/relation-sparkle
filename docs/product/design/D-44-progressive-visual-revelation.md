# D-44 / F-33 — Progressive Visual Revelation & Attraction Response

## v1.0 · CANONICAL (2026-08-19)

**Status:** Canonical. Resolves Design Decision **D-44** and implements Founder
Decision **F-33** (progressive revelation) within
[D6 — Photography & Human Presentation](./D6-photography-and-human-presentation.md).

**Authority:** Subordinate to the Constitution, Privacy & Security, Trust &
Safety, E1–E8 and Experience Final Integration, the Design Foundation, D1–D6,
Final Design Integration, and all binding Founder Decisions. It amends none of
them.

**Governing principle.** Athena chooses the person. The member experiences the
person. Attraction gets room to exist without becoming the selection mechanism.

---

## 1. Final revelation sequence

One introduction. One person. The sequence is member-paced; there is no timer,
lock, countdown or suspense mechanic at any step.

1. **Athena frames the possibility.** Name, age where applicable, generalised
   area, and a single restrained sentence — the first sentence of Athena's own
   presentation. No compatibility essay, no certainty language, no number.
2. **Primary portrait.** One large, calm image at 4:5, primary first, occupying
   the surface alone. No badge, score, ranking label or metadata overlay.
3. **The member's own response.** A private, qualitative note to Athena
   (§3 below), offered but never required.
4. **Additional visual dimension.** Further photographs of the same person are
   revealed **one at a time**, on an explicit member action, up to the canonical
   five. No thumbnail grid, no carousel, no swipe.
5. **Deeper meaning on request.** Athena's full presentation and her qualitative
   confidence phrase appear only when the member asks ("What Athena sees here"),
   focus moving to that region for screen-reader and keyboard members.
6. **Decision.** The unchanged canonical accept / defer / decline control.

## 2. Visual presentation

Large 4:5 portrait in a calm rounded frame with generous surrounding space;
natural, ungraded photography; no product-card treatment, no thumbnail wall, no
side-by-side. Additional photographs stack vertically beneath the first at the
same scale — exploration, never scanning. Transition is a plain fade, suppressed
entirely under reduced motion. Athena recedes as the person appears: no presence
animation accompanies the portrait.

## 3. Attraction response

Four Athena-native, purely qualitative responses:

| Stored value | Member-facing language |
|---|---|
| `drawn` | I'm drawn to them |
| `curious` | I'm curious |
| `unsure` | I'm not sure yet |
| `not_there` | Attraction isn't there |

No numbers, percentages, stars, scales, letter grades, emoji or hidden
equivalents. Stated to the member as *between you and Athena*, with the explicit
assurance that the counterpart never sees it and that it decides nothing on its
own.

## 4. Learning and storage

Stored in `public.introduction_attraction` (pair, member, response), unique per
member per introduction, updatable and reversible. Owner-scoped RLS; the
counterpart holds no grant of any kind. Swept by the permanent deletion
architecture.

The record is longitudinal input to the member's own understanding only.
Forbidden and unbuilt: any attractiveness score for a human being, any
population-level desirability signal, any disclosure to the counterpart, and any
path by which attraction learning bypasses readiness, reciprocal suitability,
consent, capacity or privacy requirements. Attraction response is context, never
consent.

## 5. Privacy

Counterpart photographs are released only after the server re-verifies that the
pair exists, that the caller belongs to it, and that the introduction has been
presented to the caller's side. Imagery is withdrawn once the member passes.
Rejected imagery is excluded. Delivery is a short-lived signed URL from the
private bucket; no public URL exists. No Living Profile, reasoning, precise
location or counterpart metadata travels with the imagery — F-37 remains sealed.
EXIF/GPS stripping via canvas re-encode on upload is preserved unchanged.

## 6. Accessibility

The accessible-alternative gap recorded against counterpart photography is
resolved as follows: **the member writes the description of their own
photograph**, and that is the only description anyone else hears. Athena never
describes, infers or generates a human being's appearance. Absent a member
description, the alternative states truthfully what the image is — "A photograph
{name} chose to share" — rather than inventing a body.

All information (name, framing, reasoning, decision) is available as text; none
depends on the photograph, animation, sound or colour. Reduced motion removes
the fade. All controls are native buttons with ≥44px targets, keyboard
reachable, `aria-pressed` on the attraction choices, and a focus move to the
depth region when it opens.

## 7. Five-photo maximum

The V1 maximum of five is enforced in the uploader, in the counterpart read
path, and now in the database by a `BEFORE INSERT` trigger, closing the runtime
divergence that permitted six.

## 8. Preserved

F-31 single-person attention, the compatibility-score prohibition, matchmaking
readiness, the three-introduction architecture for Complete/Private and the
single-introduction architecture for Essential, decline non-disclosure, the
mutual-interest choreography, member-data RLS, photography privacy, and
correction/removal architecture are unchanged by this specification.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-19 | D-44 resolved; F-33 implemented in runtime. |
