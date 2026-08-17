# Athena V1 — Membership & Commercial Architecture

**Status:** GOVERNING ARCHITECTURE (v1.1). Product-definition pass only.
**Billing:** NOT ACTIVATED. `BILLING_ACTIVE = false`, `MEMBERSHIP_REQUIRED = false`.
**Binding force:** The principles, protections and rules in §1–§3, §7, §9–§13 and §15–§16 are
binding. The capability allocation in §6 is **APPROVED and binding** as of Founder decisions
M-01 through M-05 (see §17). Prices remain unset and billing remains inactive.


This document supersedes the scaffold content of `membership-tiers.md` and the tier portions of
`pricing-and-packaging.md`. It sits below the Constitution (docs/constitution/) and below the
Experience Architecture and Design Foundation. Where commerce and canon disagree, canon wins.

---

## 1. Canonical commercial journey

```text
account creation / authentication
        ↓
required basic information and preferences
        ↓
foundational conversation with Athena
        ↓
foundational conversation completion
        ↓
membership selection            (/membership — administrative surface)
        ↓
payment
        ↓
paid Athena experience
```

Rules:

1. **No payment requirement precedes the foundational conversation.** The member experiences
   Athena before Athena's product asks anything commercial of them.
2. **The transition is calm and explicit.** Completion of the foundational conversation is
   acknowledged as its own moment; membership is then named plainly, once, without urgency,
   countdowns, scarcity, or persuasion mechanics.
3. **Athena is never a salesperson.** She does not pitch, upsell, compare tiers, reference
   price, imply that understanding improves with spend, or express disappointment at any
   commercial decision. Where she must reference membership at all, she states the fact and
   returns to the member. Commercial language lives on `/membership`, not in her voice.
4. **`/membership` remains an administrative/product surface**, visually and tonally separate
   from Athena's conversational presence (Experience Architecture: commercial separation).
5. Declining or deferring membership is a non-event. No follow-up pressure, no repeated
   interstitials, no degraded tone.

---

## 2. Membership structure

Three V1 membership **levels** (working names; changeable by Founder decision):

| Level | Working name | Intent |
| --- | --- | --- |
| 1 | **Athena Essential** | The minimum *coherent* Athena relationship-intelligence experience |
| 2 | **Athena Complete** | The full canonical V1 experience — the product's organizing centre |
| 3 | **Athena Private** | Complete, plus premium benefits and priority access to eligible new capabilities |

**Monthly and Annual are billing cadences within a level, not separate products.**

Selection hierarchy: **choose membership level → choose Monthly or Annual → purchase.**

**No prices are established in this pass.** No percentages, discounts, or price anchors.

---

## 3. Tierability principles

1. **Never tier a right.** Privacy, safety, dignity and control are not products (§7).
2. **Never tier intelligence.** Athena's reasoning quality, truthfulness, care, patience and
   respect are identical at every level (§8).
3. **Differentiate by scope, access and additional capabilities** — not by degradation.
4. **No manufactured scarcity.** A limitation is legitimate only if it describes a real,
   defensible difference in scope. Do not invent limits to fill a column.
5. **Never fragment an integrated experience.** If removing a capability makes the remaining
   experience incoherent or dishonest, it is CORE, not TIERABLE.
6. **No artificial frustration.** No dark patterns, wait-walls, nag surfaces, or throttling
   designed to induce upgrade.
7. **Never sell what does not exist.** FUTURE capabilities may be described as *direction*,
   never as present functionality.
8. **Cadence never changes capability.** Annual and Monthly members of the same level receive
   identical functionality.

---

## 4. Capability inventory (current implementation)

Source-traced against the V1 runtime.

| # | Capability | Where implemented |
| --- | --- | --- |
| C-01 | Account creation, authentication, Google sign-in | `/auth`, `_authenticated/route.tsx` |
| C-02 | Basic information & preferences | `onboarding.tsx`, `onboarding.functions.ts` |
| C-03 | Foundational conversation with Athena (voice + text) | `athena.tsx`, `athena.functions.ts`, `api/tts`, `api/stt` |
| C-04 | Continuing conversation with Athena | `athena.tsx` |
| C-05 | Athena voice (marin) — speech + captions | `api/tts.ts`, D5 |
| C-06 | Living Profile | `profile.tsx` |
| C-07 | "What Athena understands" + revision history | `understanding.tsx`, `understanding.server.ts` |
| C-08 | Correction / removal of understanding | `profile.review.tsx`, `understanding_revisions` |
| C-09 | Photographs (five maximum) | `photo-uploader.tsx`, D6 |
| C-10 | Compatibility reasoning engine | `introductions.server.ts`, `pair_reasoning` |
| C-11 | Introductions (max 3 concurrent) | `introductions.tsx` |
| C-12 | Athena's explanation of *why* she introduced someone | `introductions.$id.tsx` |
| C-13 | Introduction cadence / concurrent capacity | `introductions.server.ts` |
| C-14 | Accept / defer / decline | `introductions.tsx` |
| C-15 | Connections | `connections.tsx`, `connections.$id.tsx` |
| C-16 | Messaging | `messages.tsx`, `messages.$id.tsx` |
| C-17 | Post-meeting reflections (five questions) | `reflection-flow.tsx` |
| C-18 | Relationship Focus Mode | `focus-mode-card.tsx`, `relationship.server.ts` |
| C-19 | Athena's support during a relationship (check-ins) | `relationship.server.ts` |
| C-20 | Endings — the three paths | `ending-choice-card.tsx` |
| C-21 | Return / recalibration after an ending | `relationship.server.ts`, holds |
| C-22 | Rest / Pause of matchmaking | `profile.tsx` pause toggle |
| C-23 | Notifications (state-aware suppression) | `notifications.server.ts` |
| C-24 | Readiness gating | `member_readiness`, `readiness.functions.ts` |
| C-25 | Athena self-evaluation & learning | `self-evaluation.functions.ts`, `learning.functions.ts` |
| C-26 | Blocking, reporting, Trust & Safety | `report-sheet.tsx`, `moderation.*` |
| C-27 | Privacy controls, app lock, sign-out everywhere | `device-safety-panel.tsx` |
| C-28 | Data export | `export.server.ts` |
| C-29 | Account deletion (permanent) | `account.server.ts` |
| C-30 | Consent recording & versioning | `ConsentPanel`, `consent.functions.ts` |
| C-31 | Accessibility & reduced motion | global |
| C-32 | Counterpart / former-partner privacy boundaries | RLS, `pair_reasoning` scoping |
| C-33 | No scores / no rankings | `no-score.test.ts`, doctrine |
| C-34 | Membership surface & entitlements | `membership.tsx`, `membership.server.ts` |
| C-35 | Founder Dialogue (role, not entitlement) | `founder.tsx` |
| F-01 | Restaurant / activity / date ideas | **NOT IMPLEMENTED** |
| F-02 | Travel ideas, curated relationship experiences | **NOT IMPLEMENTED** |
| F-03 | Planning assistance / concierge | **NOT IMPLEMENTED** |
| F-04 | Future premium Athena capabilities (unspecified) | **NOT IMPLEMENTED** |

---

## 5. Capability-tierability matrix

Classifications: **CORE** (every paid tier) · **TIERABLE** · **COMPLETE** · **PRIVATE** ·
**RIGHT** (non-tierable protection) · **FUTURE** (not sellable as present functionality).

| # | Capability | Class | Rationale |
| --- | --- | --- | --- |
| C-01 | Authentication | CORE | Precedes commerce entirely |
| C-02 | Basic information & preferences | CORE | Precedes payment in the journey |
| C-03 | Foundational conversation | CORE (pre-payment) | Is the pre-payment experience of Athena |
| C-04 | Continuing conversation | CORE | Without it there is no Athena; scope may vary, presence may not |
| C-05 | Voice | CORE (M-04) | Not a tiered capability. Full canonical voice at every paid level; no allowance, no forced text. Provider-neutral, membership-neutral technical/rate protections only |
| C-06 | Living Profile | CORE | Understanding is the product |
| C-07 | Understanding + revision history | CORE | Explainability is constitutional |
| C-08 | Correction / removal | RIGHT | Control over one's own representation is never purchased |
| C-09 | Photographs (5 max) | CORE | Fixed ceiling by D6; not a tier lever |
| C-10 | Compatibility reasoning | CORE | Reasoning quality is never tiered |
| C-11 | Introductions | CORE (existence) / TIERABLE (scope) | Some introduction access at every paid level |
| C-12 | Why she introduced someone | CORE | Explainability is constitutional, not premium |
| C-13 | Cadence / concurrent capacity | TIERABLE | Legitimate scope difference; hard cap of 3 remains canonical |
| C-14 | Accept / defer / decline | CORE | Meaningless to tier |
| C-15 | Connections | CORE | Consequence of an introduction |
| C-16 | Messaging | CORE | A connection without contact is incoherent |
| C-17 | Reflections | CORE | Feeds understanding; tiering it would degrade her learning |
| C-18 | Relationship Focus Mode | CORE | Canonical; no member should be priced out of focusing |
| C-19 | Athena's support during a relationship | CORE (M-05) | Full canonical relationship support at every paid level; depth is never priced |
| C-20 | Endings — three paths | CORE | Dignity at an ending is not a product |
| C-21 | Return / recalibration | CORE | Continuity of understanding |
| C-22 | Rest / Pause | RIGHT | A member may always stop being matched |
| C-23 | Notifications | CORE | Operational honesty |
| C-24 | Readiness gating | CORE | Protective, not commercial |
| C-25 | Self-evaluation / learning | CORE (internal) | Not member-facing; never tiered |
| C-26 | Blocking, reporting, Trust & Safety | RIGHT | Never premium |
| C-27 | Privacy & device controls | RIGHT | Never premium |
| C-28 | Data export | RIGHT | Canonical where required |
| C-29 | Deletion | RIGHT | Absolute |
| C-30 | Consent | RIGHT | Absolute |
| C-31 | Accessibility / reduced motion | RIGHT | Absolute |
| C-32 | Counterpart privacy boundaries | RIGHT | Absolute |
| C-33 | No scores / no rankings | RIGHT | Absolute |
| C-34 | Entitlement surface | CORE | Infrastructure |
| C-35 | Founder Dialogue | Non-commercial | Role ≠ entitlement |
| F-01…F-04 | Concierge / recommendations / travel / future | FUTURE | Directional only; not sellable today |

Note: following M-03/M-04/M-05, the **only** V1 differentiation between paid levels is
concurrent introduction capacity (C-11/C-13) and, for Private, priority/early access to eligible
future capabilities. No additional restriction may be manufactured to increase differentiation.

---

## 6. Approved allocation — FOUNDER-APPROVED (M-01 … M-05, binding)

Names approved (M-02): **Athena Essential**, **Athena Complete**, **Athena Private**.

### 6.1 Athena Essential

A legitimate Athena experience, differentiated by **concurrent introduction capacity only**.

- Full continuing conversation with Athena — same intelligence, same care, same honesty.
- Living Profile, Understanding, revision history, correction and removal.
- Compatibility reasoning at full quality, and her full explanation of every introduction.
- Introductions at **1 concurrent active introduction** (M-03). Capacity only — matchmaking
  quality, reasoning quality, explainability, readiness standards and member treatment are
  identical to every other level.
- Full canonical voice experience — no allowance, no metering, no forced fallback to text (M-04).
- Full canonical relationship support: connections, messaging, reflections, Relationship Focus
  Mode, endings, return and recalibration (M-05).
- Every RIGHT in §7, without exception.

### 6.2 Athena Complete

The full canonical V1 experience. **The product is organized around this level.**

- Everything in Essential, identical in every respect except capacity.
- Introductions at the canonical maximum of **3 concurrent active introductions** (M-03),
  cadence governed only by Athena's confidence — never by billing.

### 6.3 Athena Private

Everything in Complete, plus the governing Private differentiation.

- Introductions at the canonical maximum of 3 concurrent (identical to Complete).
- Voice, relationship support, reasoning and explainability identical to Complete.
- **Governing Private differentiation: priority / early access to eligible new premium Athena
  capabilities designated by Founder decision.**
- Directional only — FUTURE, not currently available, and never to be represented as present
  functionality: restaurant, activity, date/experience, travel, curated-experience, planning and
  concierge capabilities.
- **Early-access rule (Founder authority preserved):** Private does not entitle members to every
  future capability. The Founder determines, per capability, whether it is (a) eligible for
  Private early access, (b) a Complete-level capability, (c) a separate offering, or (d)
  universal. Private's only promise is priority consideration and early access to eligible
  capabilities.
- **Launch condition:** if Private lacks sufficient implemented premium differentiation at V1
  launch, the architecture permits Private to remain unavailable / "coming later" while Essential
  and Complete are sold. Benefits must never be fabricated to justify its existence.

Private must not become the tier where dignity, privacy, safety or intelligence live.


---

## 7. Non-tierable rights and protections

The following are **never** dependent on membership level, price, cadence, or payment status,
and may never be marketed as premium:

privacy · security · Trust & Safety protections · blocking and reporting · accessibility ·
correction · removal · deletion · export rights where canon requires them · honest operational
and error communication · control over personal data · protection from scores and rankings ·
protection from manipulation · core counterpart and former-partner privacy boundaries.

**There is no "premium privacy" and no "premium safety."** Any proposal creating one is
rejected by this document without further review.

---

## 8. Athena's intelligence is not a tier

Athena is never made less intelligent, less truthful, less respectful, slower, colder, or more
frustrating at a lower level. Prompting, doctrine, model quality, reasoning depth, memory
fidelity and conversational care are identical at Essential, Complete and Private.
Differentiation comes from **scope, access and additional capabilities** only.

---

## 9. Relationship Focus Mode and billing

- Entering Relationship Focus Mode **does not** suspend, pause, prorate or cancel billing.
- Athena continues providing relationship-oriented value while the member is dating.
- Her *product presence recedes* per the Experience Architecture Presence Curve; that recession
  is an experience behaviour, not a commercial one.
- The product states this plainly at the point of entering Focus Mode, in non-defensive
  language, so no member is surprised.

## 10. Rest / Pause and billing

- Rest/Pause of matchmaking **does not** suspend membership billing.
- **Matchmaking state and commercial entitlement state are separate systems** and remain so in
  the data model (`profiles.is_paused` / relationship holds vs `membership_entitlements`).
- Wherever a member pauses, rests, or is placed on a hold after an ending, the product must
  clearly say that membership continues and how to end it — stated once, plainly, without
  discouraging the pause.

## 11. Cancellation

- Cancellation stops future renewal according to the applicable store or provider rules.
- **No retention manipulation**: no guilt, no "are you sure you want to give up", no framing of
  cancellation as failure, abandonment, loss or rejection; no artificial friction; no
  save-offers, exit interviews as gates, or multi-step confirmation mazes.
- Where permitted, entitlement continues through the already-paid period
  (`canceled_active` is an entitled status).
- Member information continues to be governed by canonical retention and deletion rules,
  **independently** of subscription state. Cancelling is not deleting; deleting is not cancelling.
- Athena's acknowledgement of a cancellation is brief, warm and final — no pursuit.

## 12. Returning members

- A former paid member may return and re-establish membership **without reconstructing Athena's
  understanding**, where that data legitimately remains under canonical retention rules.
- Where retention rules have already removed data, Athena says so honestly and begins again
  without pretending to remember.
- Re-entry never requires repeating the foundational conversation as a commercial toll; it is
  offered only where understanding genuinely needs re-establishing.
- Deleted accounts are gone: the keyed-hash tombstone architecture stands, and a returning
  person after deletion is a new member.

## 13. Billing cadence

- Each eligible level may eventually support **Monthly** and **Annual**.
- Annual may later carry a genuine economic benefit. **No percentages, discounts or prices are
  defined in this pass.**
- Cadence never alters capability, intelligence, rights, or Athena's behaviour.

## 14. Trials

- **No post-foundational-conversation free trial is created.**
- Trial structure remains an **unresolved Founder commercial decision**.
- Rationale: the foundational conversation already serves as the member's genuine pre-payment
  experience of Athena.

## 15. Entitlement relationship (preserved, unchanged)

This pass changes no entitlement code. Preserved:

- `BILLING_ACTIVE = false`; `MEMBERSHIP_REQUIRED = false` (independent switches).
- Provider-neutral server-side entitlement records (`membership_entitlements`).
- Apple App Store readiness; future authorized web-billing readiness.
- Internal-test entitlement protections (`internal_test` grants barred from `production`).
- Server-side entitlement verification only; **no client-controlled production entitlement**
  (no client INSERT/UPDATE/DELETE grant on the entitlement table).
- **Founder role ≠ paid entitlement.**

Implementation note for activation: membership *level* becomes a distinct axis from *cadence*.
The existing `plan_key` currently encodes cadence (`monthly` / `annual`). At activation it should
encode `level × cadence` (e.g. `essential_monthly`) or split into `level` + `billing_period`.
This is an activation-time migration, not a change to make now.

## 16. Payment screen (specification, not a redesign)

`/membership` is ultimately designed around **membership level first → billing cadence second**:

```text
[ Athena Essential ]  [ Athena Complete ]  [ Athena Private ]     ← level (primary choice)
                          ↓ level chosen
              ( Monthly )        ( Annual )                        ← cadence (secondary)
                          ↓
                       Purchase
```

Constraints: one level at a time in view on portrait (D2 composition, no comparison grid that
reads as a pricing table); no "most popular" badges, no pre-selected upsell, no countdown, no
strike-through anchoring; plain statement of what each level includes; equal visual dignity for
Essential. **No material runtime redesign is performed in this pass** — the current surface
remains cadence-only until levels are approved.

---

## 17. Founder decision register

### 17.1 Recorded decisions (binding)

| ID | Decision | Recorded |
| --- | --- | --- |
| M-01 | §6 allocation **approved** as amended by M-03…M-05 | 2026-08-17 |
| M-02 | Names approved for V1: **Athena Essential**, **Athena Complete**, **Athena Private** | 2026-08-17 |
| M-03 | Capacity: Essential = 1 concurrent active introduction; Complete and Private = canonical maximum of 3. Capacity distinction only — no change to matchmaking quality, reasoning quality, explainability, readiness standards or member treatment | 2026-08-17 |
| M-04 | Voice is **not** a tiered capability. Full canonical voice experience at every paid level; no monthly allowance, no forced text fallback. Provider-neutral, membership-neutral technical/rate protections may remain | 2026-08-17 |
| M-05 | Relationship support is **CORE**. Full canonical architecture — intelligence, relationship reasoning, reflections, Relationship Focus Mode, endings, return/recalibration — preserved at every paid level | 2026-08-17 |

Governing constraints recorded with these decisions: Private's differentiation is priority/early
access to eligible future premium capabilities designated by Founder decision (those capabilities
remain FUTURE and must never be represented as available); Founder authority over eligibility is
preserved; no additional V1 restriction may be manufactured for the sake of differentiation; and
Private may launch as unavailable/"coming later" rather than carry fabricated benefits.

### 17.2 Unresolved decisions

| ID | Decision | Blocking |
| --- | --- | --- |
| M-06 | Prices for each level, Monthly and Annual | Billing activation |
| M-07 | Annual economic benefit, if any | M-06 |
| M-08 | Trial structure (currently: none) | Commercial |
| M-09 | Which future capabilities qualify for Private early access, and whether Private is offered at V1 launch | Per capability |
| M-10 | Whether `MEMBERSHIP_REQUIRED` ever becomes true, and at what point in the journey | Commercial |
| M-11 | Store/provider selection and App Store product identifiers | Billing activation |
| M-12 | Grandfathering policy for early members at price changes | M-06 |
| M-13 | Whether a level change mid-period is immediate or at renewal | Unblocked by M-01; open |

---

## 18. Canonical conflict review

Per the permanent change-control standard, this pass was reviewed against existing canon.

| Area | Finding |
| --- | --- |
| Constitution L2 Ethics | No conflict. §7 and §8 strengthen existing prohibitions. |
| Experience Architecture E7 (commercial separation) | No conflict; §1 restates and tightens it. |
| E8 / Relationship Experience | No conflict. §9 keeps Focus Mode non-commercial. |
| D1–D6 Design Foundation | No conflict. §16 constrains the payment screen to D2 composition. |
| Non-tierable protections | No conflict; §7 is additive. |
| `membership-tiers.md` (scaffold) | **Superseded.** Its "Free tier / no introductions" draft conflicts with §1 (foundational conversation is the pre-payment experience) and with §3.5. Marked superseded. |
| `pricing-and-packaging.md` | Tier portions superseded; pricing questions carried into §17. |
| `docs/business/README.md` | Status text ("no entitlement or billing code exists") is now stale — entitlement architecture is implemented, billing is not activated. Corrected. |
| Existing runtime `MEMBERSHIP_PLANS` | Cadence-only; unchanged this pass. Level axis noted in §15 as an activation-time migration. |

No canonical behaviour was overridden. No runtime member-facing behaviour was changed.

### 18.1 Conflict review — M-01…M-05 recording pass (2026-08-17)

| Area | Finding |
| --- | --- |
| §5 matrix C-05 (Voice) | Reclassified TIERABLE → **CORE** per M-04. Strengthens §7/§8; no canon conflict. |
| §5 matrix C-19 (Relationship support) | Depth reclassified → **CORE** per M-05. Matches E8 canon. |
| §6 allocation | Recommendation → **approved and binding**; Essential's voice allowance and support-depth scope removed. |
| C-11 / C-13 capacity | Unchanged canonical cap of 3; Essential set to 1 as a capacity distinction only. |
| Runtime membership UI / `MEMBERSHIP_PLANS` | **Unchanged** by instruction. No prices set, `BILLING_ACTIVE = false`. |

No canonical behaviour was overridden and no runtime behaviour changed in this pass.
