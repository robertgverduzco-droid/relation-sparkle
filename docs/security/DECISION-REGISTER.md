# Privacy, Security & Legal Decision Register — Canonical

Status values for founder decisions (Part IV):
**Founder Policy Approved** · **Legal Review Pending** · **Implementation
Authorized** · **Implementation Pending Legal Review** · **Implemented** ·
**Verified**

"Legal Review Pending" never means the founder policy is undecided. The policy
direction below is settled and binding; only implementation of details that
could conflict with an unresolved legal obligation is held.

Other status values: **DECIDED** (settled, binding) · **LEGAL** (counsel input
required) · **OPEN** (engineering work queued, no decision needed) ·
**REPAIRED** (defect fixed).

Nothing in this register may be changed by implementation work. Entries are
amended only by an explicit decision recorded here with a date.

---

## Part I — Decisions already made and binding

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D-01 | `anon` holds no privileges on any table | Signed-out visitors have no data surface at all | DECIDED |
| D-02 | RLS on every public table; no `USING (true)` for members | Default-deny is the only defensible baseline | DECIDED |
| D-03 | Athena's private pair reasoning is never member-readable | Reasoning about two people belongs to neither | DECIDED |
| D-04 | Rejection reasoning is never surfaced | Explaining a "no" injures without helping | DECIDED |
| D-05 | `partner_perception` is author-scoped; subjects never see it | Honest perception requires it stay private | DECIDED |
| D-06 | Raw voice audio is never retained | Verified in code, not merely policy | DECIDED |
| D-07 | Notification content is generic; no intimate content in payloads | Lock screens are read by others | DECIDED |
| D-08 | No analytics, advertising, attribution, or replay SDKs | Intimacy is incompatible with third-party observation | DECIDED |
| D-09 | Learning material excludes an explicit identifier denylist | Learning must not carry identity | DECIDED |
| D-10 | Outcome signals are pseudonymous by recomputable pair token and purge on deletion | De-identified, not anonymous — treated accordingly | DECIDED |
| D-11 | Kill switches gate matchmaking, messaging, Athena, notifications | Stop-the-world capability precedes scale | DECIDED |
| D-12 | Every privileged read is audited and append-only | Access without a record is not accountable | DECIDED |
| D-13 | Founder Dialogue returns doctrine and aggregates only, never member material | Governance does not require surveillance | DECIDED |
| D-14 | Deletion is permanent, verified, and reaches storage and signals | The member's word is final | DECIDED |
| D-15 | Storage is private; no public bucket exists | — | DECIDED |
| D-16 | Athena never quotes or names her faculty to members | Non-Quotation Standard | DECIDED |
| D-17 | No member-facing numeric compatibility scores | Understanding is not a score | DECIDED |

---

## Part II — Repaired (security defects, no policy change)

| ID | Defect | Severity | Repair |
| --- | --- | --- | --- |
| R-01 | Counterpart could read the presentation written for the other side | P0 | Column `SELECT` revoked from `authenticated`; each member served only their own side, server-side, after membership verification |
| R-02 | Counterpart display name/city unreadable under owner-scoped `profiles` | P1 | Narrow server-side projection after participation is proven; no policy widened |
| R-03 | Founder aggregate floor counted rows, so one pair could constitute a "cohort" | P1 | Floor now counts distinct contributors |
| R-04 | Exact cohort sizes permitted differencing across repeated queries | P1 | Cohort sizes banded to tens; valence returned as shares |

---

## Part III — Engineering queue (no decision required)

| ID | Item | Sev | Notes |
| --- | --- | --- | --- |
| E-01 | Make blocking total: close connection, hide conversation, cancel proposals, suppress notifications | P2 | Threat T-06 |
| E-02 | Revoke member `INSERT` on `athena_usage_log`; meter server-side only | P3 | T-05 |
| E-03 | Durable per-member rate limits and abuse counters | P2 | T-12; prerequisite for F-11 export limits |
| E-04 | Neutral auth responses to remove account enumeration | P2 | T-13 |
| E-05 | Per-relationship opaque identifiers instead of raw member UUIDs to clients | P2 | Correlation control |
| E-06 | Single sanitisation chokepoint for all untrusted text entering a model | P1 | T-18 |
| E-07 | Provenance and trust semantics on stored inferences | P1 | Now governed by F-13's three-state model |
| E-08 | Per-call context minimisation budget for prompts | P2 | T-16 |
| E-09 | Test asserting no member identifier appears in prompt text or provider metadata | P2 | Verification |
| E-10 | Test asserting Founder Dialogue's call graph touches no member-keyed table | P2 | Structural |
| E-11 | Fixed aggregate refresh cadence + audited query budget for Founder Dialogue | P2 | Residual |
| E-12 | Deletion tombstone table with deferred subject severance for backup replay | P2 | Now required by F-03/F-04 |
| E-13 | Tighten production CSP to `frame-ancestors 'none'` | P3 | T-20 |
| E-14 | Explicit no-precache rule and review gate before any service worker ships | P3 | T-19 |
| E-15 | Narrow `admin` away from member-keyed self-evaluations to aggregates | P2 | — |
| E-16 | Enumerate and bound log retention; confirm no Class 3-5 content in platform logs | P2 | — |
| E-17 | Client cache invalidation on relationship ending, block, and sign-out | P2 | Now required by F-07 |
| E-18 | Controlled vocabulary for `reason_category` / `learning_version` | P2 | — |

---

## Part IV — Founder decisions (recorded 2026-08-11)

Approved as written by Robert. No entry below may be reinterpreted by
implementation work.

### F-01 — Dormancy deletion trigger — **APPROVED**

Twelve months of genuine inactivity triggers full deletion through the
established deletion architecture. Notices at 30 days, 14 days, and 1 day
before. Relationship Focus Mode and an explicitly chosen Rest/Pause state are
intentional member states and must never be read as abandonment.

*Status:* Founder Policy Approved · Legal Review Pending (L-09 retention
floors: financial, tax, safety, legal hold) · Implementation Pending Legal
Review.

### F-02 — Meaningful activity — **APPROVED**

Only deliberate actions reset the dormancy clock: sign-in, an Athena
conversation turn, an introduction response, a message sent, a reflection
submitted, a deliberate pause/rest change. Notification opens, email opens,
push receipts, and any passive telemetry never reset it. Athena does not
manufacture continued membership from passive engagement.

*Status:* Founder Policy Approved · Implementation Authorized (lands with
F-01's scheduler).

### F-03 — Deletion of derived information — **APPROVED**

Deletion reaches Athena's inferences about the deleted member wherever they
live, including inside a counterpart's pair or relational records. Material
genuinely concerning the counterpart stays with the counterpart. Truly
non-attributable aggregate learning may remain only where it cannot reasonably
be reconstructed to the deleted member.

**Permanent invariant:** no future cross-member data structure may be
introduced without an associated deletion/scrubbing mechanism shipped in the
same change.

*Status:* Founder Policy Approved · Legal Review Pending (L-01 definition and
extent of erasure) · Implementation Authorized for the invariant and for
severing member-attributable cross-member reasoning.

### F-04 — Deletion finality — **APPROVED**

Deletion is immediate and irreversible on deliberate confirmation by the
authenticated member. No hidden recovery copy, no grace window. Paired with
F-12 step-up authentication so possession of an unlocked device cannot destroy
an account. Member-facing language must state finality plainly.

*Status:* Founder Policy Approved · Legal Review Pending (L-08, L-17
preservation duties) · Implementation Authorized for step-up gating and
finality language; retention carve-outs held for counsel.

### F-05 — Precise coordinates — **APPROVED**

Stop retaining unnecessary precise coordinates; keep only the geographic
precision the matchmaking mission genuinely requires. Existing precise values
are coarsened. Future architecture must not silently begin collecting precise
location because a platform makes it available.

*Status:* Founder Policy Approved · Implementation Authorized · **Implemented**
(no feature reads or writes coordinates; stored values cleared).

### F-06 — Counterpart geographic display — **APPROVED WITH REFINEMENT**

Before mutual connection, counterpart surfaces show a generalised metro/general
area only. Mutual connection does not itself authorise more precision; further
precision only where the relationship experience genuinely requires it or the
member deliberately shares it.

*Status:* Founder Policy Approved · Implementation Authorized · **Implemented**
for introductions and connection surfaces (`src/lib/geography.ts`).

### F-07 — Post-relationship ending state — **APPROVED**

On ending: counterpart profile access ends; pair reasoning becomes terminal and
never feeds future candidate reasoning; partner-perception material never
becomes future matchmaking intelligence about the former partner. Athena may
retain what the member learned about *themselves* through the relationship.

*Status:* Founder Policy Approved · Implementation Authorized (terminal
pair-reasoning flag, candidate-selection exclusion, E-17 cache teardown).

### F-08 — Declined introduction visibility — **APPROVED**

A declined proposed introduction stays undisclosed to the other person. No
rejection event is manufactured, ever, in any surface.

*Status:* Founder Policy Approved · Implementation Authorized · **Verified** —
no current surface discloses a counterpart decline.

### F-09 — Read receipts — **APPROVED**

`messages.read_at` exists solely for the receiving member's own unread state
and must never be counterpart-visible. Permanent projection invariant.

*Status:* Founder Policy Approved · **Verified** — `read_at` is not returned in
any counterpart-visible projection.

### F-10 — Break-glass exceptional access — **APPROVED WITH EARLY-STAGE REFINEMENT**

Formal exceptional-access architecture: explicit purpose, minimum necessary
access, time limitation, immutable audit trail, post-event review, member
notification afterward where appropriate and lawful. While there is one
qualified operator, this is *not* described as two-person authorization;
transition to genuine two-person authorization for Class 4 access when
additional qualified personnel exist. Founder Dialogue remains entirely
separate and grants no member-data access.

*Status:* Founder Policy Approved · Legal Review Pending (L-08, L-11) ·
Implementation Authorized for purpose declaration, time-boxing, immutable
audit, and review record.

### F-11 — Member export scope — **APPROVED**

Export contains member-provided material, Athena's understanding of that
member, the member's own authored material, and their own reflections with
counterpart-identifying detail removed where necessary. Never private pair
reasoning, counterpart-authored perception, or protected cross-member
reasoning. Implemented as an explicit **allowlist**, with step-up auth, rate
limiting, secure delivery, expiry, and audit logging.

*Status:* Founder Policy Approved · Legal Review Pending (L-01, L-14) ·
Implementation Authorized for the allowlist mechanism and its controls.

### F-12 — Device safety — **APPROVED**

Beta set, in full: remote sign-out of all devices, session management, step-up
re-auth before deletion, before export, and before email/security changes, and
an optional local app lock (PIN/biometric). Pre-real-member requirement.

*Status:* Founder Policy Approved · Implementation Authorized (P0).

### F-13 — Correction, change, and evolution of understanding — **APPROVED WITH REFINED THREE-STATE MODEL**

Three distinct states, never conflated:

- **A. Genuine human change** — prior understanding was true then. Update the
  current Living Profile; mark the prior state historical/superseded so it
  cannot act as current matchmaking truth. Trajectory may inform understanding;
  current evidence governs current matchmaking.
- **B. Correction of Athena's interpretation** — supersede the inaccurate
  inference, retain only the minimum correction history needed for
  self-evaluation, never treat the corrected inference as evidence again.
- **C. Explicit removal of false information** — "this was never true" /
  "remove this": hard-delete the inference and its attributable history. A
  non-substantive signal that a correction occurred may remain only if it
  cannot preserve or reconstruct the deleted proposition.

Permanent distinction between history, correction, and deletion.

*Status:* Founder Policy Approved · Legal Review Pending (L-01 correction of an
inference) · Implementation Authorized for the three-state model, provenance,
and supersession (supersedes E-07).

### F-14 — Inferred sensitive attributes — **APPROVED WITH STRICT STATED/INFERRED DISTINCTION**

Member-stated sensitive information may be retained when genuinely relevant,
at the highest privacy classification, and never propagated into unrelated
systems. Athena-inferred sensitive possibilities may be reasoned about
transiently but generally not persisted as durable fact — including inferred
physical health, mental health, sexuality, trauma, and comparable protected
characteristics. Athena never diagnoses. Where it genuinely matters she seeks
understanding conversationally and member evidence governs. Sensitive material
never appears in counterpart presentations, cross-member disclosure, Founder
Dialogue member-level information, identifiable aggregates, or another member's
export. No sensitive inference silently becomes a durable label.

*Status:* Founder Policy Approved · Legal Review Pending (L-01, L-05, L-14) ·
Implementation Pending Legal Review for persistence rules; the non-persistence
default and the disclosure prohibitions are Implementation Authorized.

### F-15 — Death or incapacity — **APPROVED WITH RETENTION PERIOD RESERVED**

On verified notice: lock the account, stop active matchmaking and processing as
appropriate, protect all private material. No disclosure of Athena
conversations or intimate material to a spouse, partner, relative, executor,
designated contact, or other third party. A member-designated contact may
receive notification or participate in closure only if the member authorised
that function; designation transfers no ownership of or access to private
material. **The 90-day destruction period is not adopted** — counsel
establishes the procedure.

*Status:* Founder Policy Approved · Legal Review Pending (L-13, L-09) ·
Implementation Authorized for lock/stop-processing/no-disclosure only.

### F-16 — Athena safety intervention — **APPROVED SUBJECT TO LEGAL REVIEW**

Athena may recognise narrowly defined serious safety concerns, address the
member directly and compassionately, encourage protective action, and raise an
internal safety flag for human review when criteria are met. She never
independently contacts law enforcement, relatives, partners, employers, or any
third party. Reporter identity stays protected; enforcement explanations name
the behaviour, never the reporter.

*Status:* Founder Policy Approved · Legal Review Pending (L-11 emergency
disclosure and mandatory reporting) · Implementation Authorized for
recognition, member-facing response, and internal flagging.

### F-17 — Ban evasion — **PARTIALLY APPROVED**

V1: minimal banned-identifier detection using protected one-way
representations of normalized email and/or phone identifiers. **No** general
device fingerprinting, with a permanent presumption against it absent an
extraordinary reviewed and approved safety need. **No** photo-based identity
matching or perceptual facial hashing until privacy/technology counsel reviews
it. The mechanism is purpose-limited and unavailable for ordinary member
tracking.

*Status:* Founder Policy Approved · Implementation Authorized for hashed
identifier denylist only · photo/biometric matching Implementation Pending
Legal Review (L-04).

### F-18 — Billing privacy — **APPROVED**

Neutral billing descriptor and neutral receipt language where lawful and
operationally permitted, still recognisable enough to satisfy payment-network
requirements, let the member recognise the charge, avoid chargeback confusion,
and meet subscription disclosure duties. The nature of the member's
matchmaking activity is not exposed through shared statements or inboxes.

*Status:* Founder Policy Approved · Legal Review Pending (L-06, L-07) ·
Implementation Pending — arrives with payment architecture.

---

## Part V — Questions for counsel (LEGAL)

| ID | Question | Mapped F-decisions | Status |
| --- | --- | --- | --- |
| L-01 | Do Athena's *inferred* attributes constitute sensitive personal information under CPRA, and what does "correction" mean for an inference? | F-03, F-11, F-13, F-14 | LEGAL |
| L-02 | Precise-geolocation obligations if coordinates are retained at all | F-05, F-06 | LEGAL |
| L-03 | Bot-disclosure obligations and AI transparency/automated-decision rules applicable to matchmaking | F-14 | LEGAL |
| L-04 | Biometric exposure (BIPA and analogues) if voice is analysed, or if photo/perceptual hashing is used for ban evasion | F-17 | LEGAL |
| L-05 | Whether mental-health-adjacent disclosures implicate CMIA or state health-privacy law | F-14, F-16 | LEGAL |
| L-06 | Dating-service contract statutes: cancellation, term limits, refunds, safety disclosures | F-18 | LEGAL |
| L-07 | Auto-renewal law compliance for subscriptions | F-18 | LEGAL |
| L-08 | Legal-process runbook: subpoena/warrant standards, SCA content vs. metadata, preservation duties, member notice | F-04, F-10 | LEGAL |
| L-09 | Retention floors (financial, tax, safety) that conflict with dormancy deletion, and whether compartmentalisation resolves them | F-01, F-04, F-15 | LEGAL |
| L-10 | Breach-notification triggers where the exposed data is inferred intimate attributes | F-14 | LEGAL |
| L-11 | Mandatory-reporting posture and emergency-disclosure standard for imminent danger | F-16, F-10 | LEGAL |
| L-12 | Minors: adequacy of self-reported age; obligations if a minor is discovered | F-16 | LEGAL |
| L-13 | Death/incapacity and fiduciary access to digital assets | F-15 | LEGAL |
| L-14 | GDPR/UK exposure on the first non-US member: Article 9 and Article 22 | F-03, F-11, F-14 | LEGAL |
| L-15 | Processor terms: no-training/no-retention warranties, subprocessors, breach flow-down, re-verification cadence | F-14 | LEGAL |
| L-16 | Claims substantiation for matchmaking-quality statements | — | LEGAL |
| L-17 | Preservation of evidence for safety reports against a deleting member — narrowest lawful form | F-04, F-16 | LEGAL |
