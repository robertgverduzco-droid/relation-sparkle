# Privacy, Security & Legal Decision Register — Canonical

Status values: **DECIDED** (settled, binding) · **FOUNDER** (Robert must
decide) · **LEGAL** (counsel input required) · **OPEN** (engineering work
queued, no decision needed) · **REPAIRED** (defect fixed this pass).

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

## Part II — Repaired this pass (security defects, no policy change)

| ID | Defect | Severity | Repair |
| --- | --- | --- | --- |
| R-01 | Counterpart could read the presentation written for the other side | P0 | Column `SELECT` revoked from `authenticated`; each member served only their own side, server-side, after membership verification |
| R-02 | Counterpart display name/city unreadable under owner-scoped `profiles`, in introductions, connections, messaging, relationship views | P1 | Narrow server-side projection (`display_name`, `city` only) after participation is proven; no policy widened |
| R-03 | Founder aggregate floor counted rows, so one pair or one member could constitute a "cohort" | P1 | Floor now counts distinct contributors (`pair_token` / `user_id`) |
| R-04 | Exact cohort sizes permitted differencing across repeated queries | P1 | Cohort sizes banded to tens; valence returned as shares, not counts; recurring intents require recurrence across distinct members |

---

## Part III — Engineering queue (no decision required)

| ID | Item | Sev | Notes |
| --- | --- | --- | --- |
| E-01 | Make blocking total: close connection, hide conversation, cancel proposals, suppress notifications | P2 | Threat T-06 |
| E-02 | Revoke member `INSERT` on `athena_usage_log`; meter server-side only | P3 | T-05 |
| E-03 | Durable per-member rate limits and abuse counters | P2 | T-12 |
| E-04 | Neutral auth responses to remove account enumeration | P2 | T-13 |
| E-05 | Per-relationship opaque identifiers instead of raw member UUIDs to clients | P2 | Correlation control |
| E-06 | Single sanitisation chokepoint for all untrusted text entering a model, including at facet write time | P1 | T-18, memory injection |
| E-07 | Provenance and trust semantics on stored inferences; correction demotes/deletes rather than appends only | P1 | T-17 |
| E-08 | Per-call context minimisation budget for prompts | P2 | T-16 |
| E-09 | Automated test asserting no member identifier ever appears in prompt text or provider metadata | P2 | Verification |
| E-10 | Automated test asserting Founder Dialogue's call graph touches no member-keyed table | P2 | Structural, not prompt-based |
| E-11 | Fixed aggregate refresh cadence + audited query budget for Founder Dialogue | P2 | §13 residual |
| E-12 | Deletion tombstone table with deferred subject severance for backup replay | P2 | T-11 |
| E-13 | Tighten production CSP to `frame-ancestors 'none'` | P3 | T-20 |
| E-14 | Explicit no-precache rule and review gate before any service worker ships | P3 | T-19 |
| E-15 | Narrow `admin` away from member-keyed self-evaluations to aggregates | P2 | §12 |
| E-16 | Enumerate and bound log retention; confirm no Class 3-5 content in platform logs | P2 | §19 |
| E-17 | Client cache invalidation on relationship ending, block, and sign-out | P2 | §20 |
| E-18 | Controlled vocabulary for `reason_category` / `learning_version` | P2 | §7 |

---

## Part IV — Questions for Robert (FOUNDER)

| ID | Question | Why it must be his | Status |
| --- | --- | --- | --- |
| F-01 | Dormancy: adopt 12 months of genuine inactivity as the deletion trigger, with three notices over 30 days? Audit found no architectural conflict, subject to five implementation consequences (legal hold, financial floors, cross-member effects, notice deliverability, activity definition). | Sets how long the product remembers someone who stopped coming | FOUNDER |
| F-02 | What counts as "meaningful activity"? Recommended: sign-in, Athena turn, introduction response, message, reflection, pause toggle. Explicitly excluded: notification opens. | Makes engagement measurement a retention mechanism if chosen wrongly | FOUNDER |
| F-03 | Does deletion reach Athena's *inferences about the deleted member* held inside a counterpart's pair reasoning and Athena's learned patterns? | Defines whether deletion is real or nominal | FOUNDER |
| F-04 | Should deletion be immediate-irreversible (today) or immediate-invisible with a short disclosed grace window? | Trades takeover-destruction risk against finality | FOUNDER |
| F-05 | Precise coordinates: stop collecting them and store a coarse cell instead? No current feature uses them. | Member-visible change; highest-value single risk reduction in §9 | FOUNDER |
| F-06 | Should a low-population city be displayed as a metro area to counterparts (k-anonymity floor)? | Directly addresses re-identification T-14 | FOUNDER |
| F-07 | Post-ending state machine: after a relationship ends, what remains visible to each party, and may Athena use what she learned about a former partner in the other's future matchmaking? | Encodes the core "learned from A never becomes B's" principle | FOUNDER |
| F-08 | Should a declined introduction remain visible to the declined party at all? | Existence disclosure vs. honesty | FOUNDER |
| F-09 | Should read receipts (`messages.read_at`) exist, and should members control them? | Behavioural disclosure with no product necessity | FOUNDER |
| F-10 | Break-glass: adopt two-person, purpose-stated, time-boxed, member-notified exceptional access? | The alternative is unlogged service-role use in an emergency | FOUNDER |
| F-11 | Member export scope: own material and Athena's understanding *of them*, excluding all pair reasoning and counterpart-authored perception. Confirm. | Export is a member right with a cross-member edge | FOUNDER |
| F-12 | Device safety features for beta: remote sign-out, step-up re-auth before deletion/export, optional app lock. Adopt as a set? | The compound stolen-phone scenario is the worst realistic case | FOUNDER |
| F-13 | Correction rights: when Athena is wrong about someone, does the member get deletion of the inference, or only supersession? | Dignity decision as much as a privacy one | FOUNDER |
| F-14 | Inferred sensitive attributes (health, sexuality, trauma): may Athena store them at all, and if so with what special handling? | The most dangerous rows in the system | FOUNDER |
| F-15 | Death or incapacity: what happens to an account and its intimate material, and who may ever be told anything? | No default is acceptable here | FOUNDER |
| F-16 | Safety posture: may Athena ever initiate a safety intervention, and is a reported member told they were reported? | Sets Athena's duty of care | FOUNDER |
| F-17 | Ban evasion: is any re-registration detection acceptable, given every mechanism is itself a privacy mechanism? | Safety vs. privacy trade only he can set | FOUNDER |
| F-18 | Billing descriptors and receipts: neutral wording, subject to legal disclosure duties? | Member harm from a shared inbox | FOUNDER |

---

## Part V — Questions for counsel (LEGAL)

| ID | Question | Status |
| --- | --- | --- |
| L-01 | Do Athena's *inferred* attributes constitute sensitive personal information under CPRA, and what does "correction" mean for an inference? | LEGAL |
| L-02 | Precise-geolocation obligations if coordinates are retained at all | LEGAL |
| L-03 | Bot-disclosure obligations and AI transparency/automated-decision rules applicable to matchmaking | LEGAL |
| L-04 | Biometric exposure (BIPA and analogues) if voice is ever analysed rather than transcribed | LEGAL |
| L-05 | Whether mental-health-adjacent disclosures implicate CMIA or state health-privacy law | LEGAL |
| L-06 | Dating-service contract statutes: cancellation, term limits, refunds, safety disclosures | LEGAL |
| L-07 | Auto-renewal law compliance for subscriptions | LEGAL |
| L-08 | Legal-process runbook: subpoena/warrant standards, SCA content vs. metadata, preservation duties, member notice | LEGAL |
| L-09 | Retention floors (financial, tax, safety) that conflict with dormancy deletion, and whether compartmentalisation resolves them | LEGAL |
| L-10 | Breach-notification triggers where the exposed data is inferred intimate attributes | LEGAL |
| L-11 | Mandatory-reporting posture and emergency-disclosure standard for imminent danger | LEGAL |
| L-12 | Minors: adequacy of self-reported age; obligations if a minor is discovered | LEGAL |
| L-13 | Death/incapacity and fiduciary access to digital assets | LEGAL |
| L-14 | GDPR/UK exposure on the first non-US member: Article 9 and Article 22 | LEGAL |
| L-15 | Processor terms: no-training/no-retention warranties, subprocessors, breach flow-down, and how often they must be re-verified | LEGAL |
| L-16 | Claims substantiation for matchmaking-quality statements | LEGAL |
| L-17 | Preservation of evidence for safety reports against a deleting member — narrowest lawful form | LEGAL |
