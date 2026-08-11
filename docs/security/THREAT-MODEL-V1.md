# Privacy, Security & Legal Threat Model — Adversarial Review v1.0

Scope: the whole running system as of this review — schema, RLS and grants,
server functions, routes, auth, storage, AI calls and prompts, Living Profile,
matchmaking, introductions, connections, messaging, reflections, Relationship
Focus, readiness, notifications, moderation, blocking, reporting, account
lifecycle, deletion, backups, consent, audit logging, Founder Dialogue,
documentation, and the *planned* payment and native-client architectures.

Everything below was checked against runtime, not documentation. Where the two
disagree it is called out as a **DOC-DRIFT** finding.

Companion artifact: `DECISION-REGISTER.md` (canonical governance register).

---

## 1. Executive summary

The foundation is unusually strong for a pre-beta product: `anon` holds no
privileges anywhere, every public table has RLS, member content is
owner-scoped, private storage is per-member-prefix, notifications are
content-free by construction, voice audio is never persisted, and there is no
analytics or advertising pipeline to leak into.

This review nevertheless found **one live cross-member disclosure (P0)**, a
**cluster of functional-privacy drift** where owner-scoped RLS silently breaks
counterpart display (P1, now repaired), a **structural gap in the founder
aggregate threshold** that would have permitted single-member portraits (P1,
now repaired), and a substantial body of work that is genuinely *unbuilt*
rather than broken: no member export, no session revocation, no dormancy
lifecycle, no deletion tombstone table, no legal-process runbook, no
death/incapacity policy.

The largest residual risks are not database risks. They are, in order:

1. **Reconstruction rather than extraction** — an adversary who never breaks a
   policy but assembles city + age + display name + timing + introduction
   cadence into an identification, especially in a small launch market.
2. **Device-layer exposure** — the phone, not the server, is where intimate
   material is most likely to be read by the wrong person, and today there is
   no session revocation, no re-authentication for sensitive surfaces, and no
   way for a member to end a session on a device they no longer hold.
3. **Derived-data survival of deletion** — understanding distilled from a
   deleted member can persist inside *another* member's pair reasoning and
   inside Athena's learned patterns unless deletion is defined to reach
   derivations.
4. **Legal compulsion against a system that remembers too well** — the best
   protection available is minimisation performed before a demand arrives.

Three P0/P1 technical defects were repaired in this pass under §25 authority
(unambiguous security behaviour, no member-rights or doctrine change). Every
material policy, retention, member-rights, and legal question is *reported
only* and appears in the register with status **Founder Decision Required** or
**Legal Review Required**.

---

## 2. New threats discovered

Threats not previously identified in v1 or its addenda:

- **T-01 Counterpart presentation leak (P0, repaired).** `authenticated` held
  column-level `SELECT` on **both** `presentation_a` and `presentation_b`, and
  the RLS row policy grants the row to whichever member it was presented to. A
  member could therefore read, straight from the browser client, the wording
  Athena wrote *for the other person about them* — Athena's framing of the
  counterpart's material. A row-level policy cannot distinguish sides of a
  symmetric row; only a column revoke plus server-side side-selection can.
- **T-02 Owner-scoped `profiles` breaks counterpart display (P1, repaired,
  DOC-DRIFT).** `profiles` is `id = auth.uid()` for all commands, yet four
  member-facing server functions read the counterpart's `display_name`/`city`
  through the *user-scoped* client. The read silently returned nothing, so
  every counterpart rendered as "Someone". This is a privacy-adjacent
  correctness failure: the product appears to protect data it never fetched,
  and the first "fix" a future developer reaches for is broadening the policy.
- **T-03 Row-count thresholds are not cohort thresholds (P1, repaired).** The
  founder aggregate floor counted *rows*. Twenty outcome signals can belong to
  one pair; twenty self-evaluations to one member's single week. The threshold
  now counts distinct contributors, returns shares rather than counts, and
  bands the cohort size so repeated calls cannot be differenced.
- **T-04 Exact cohort sizes are a differencing primitive (P1, repaired).**
  Returning `sample: 41` then `sample: 42` reveals the arrival of exactly one
  contributor and lets the founder attribute the delta in every other figure
  to that person. Cohort sizes are now banded to tens.
- **T-05 Members can forge their own usage ledger (P3).**
  `athena_usage_log` grants `INSERT` to `authenticated` with
  `auth.uid() = user_id`. A member can inflate or backdate their own metering
  rows. Harmless today; becomes a billing-integrity issue the moment usage
  meters money. Fix: revoke member insert; write metering server-side only.
- **T-06 Blocking does not close the relationship surface (P2).** `blocks` is
  honoured in matchmaking candidate filtering and in the send-message path,
  but blocking does not close the `connection`, hide the `conversation`, stop
  meeting proposals, or suppress connection-derived notifications. A blocked
  person still exists in the other's product surface. Blocking must be a
  single, total, immediate action.
- **T-07 Deletion does not reach derivations (P1, policy).** The purge removes
  the member's rows and their pseudonymous outcome signals — but understanding
  *about* the deleted member survives inside the counterpart's
  `pair_reasoning` reasoning text, inside reflection prose the counterpart
  authored, and potentially inside facets Athena wrote about the counterpart
  that describe the deleted person. Doctrine says counterparts keep their own
  material; it does not yet say what happens to Athena's inference *about the
  deleted person* held in someone else's row.
- **T-08 No export exists (P2, DOC-DRIFT + LEGAL).**
  `RETENTION-AND-DELETION.md` documents a member export right. There is no
  export code path anywhere in `src/`. Under CCPA/CPRA this is a statutory
  access right, not a feature.
- **T-09 No session revocation (P2).** No "sign out everywhere", no session
  list, no forced re-auth on sensitive surfaces, no re-auth before account
  deletion. A member who loses a device cannot end its access; changing the
  password does not, by itself, guarantee immediate revocation of an existing
  refresh token in every configuration.
- **T-10 Email is the single root of trust (P2).** Whoever controls the email
  inbox controls the account, and the account contains the most intimate
  material the product holds. There is no second factor and no step-up
  authentication for high-sensitivity actions.
- **T-11 Deletion tombstones are documented but not implemented (P2).** The
  backup replay mechanism described in the deletion standard depends on a
  durable record of purges. `admin_audit_log` records that a purge happened,
  but severs the subject reference immediately — so a restore cannot replay
  *which* member to re-delete. The severance must be deferred until the last
  backup containing that member expires.
- **T-12 Rate limits are per-worker-instance (P2, known, now consequential).**
  They gate voice and AI cost, but they are not an abuse control against a
  distributed attacker, and they cannot bound a founder's or a member's
  repeated-query inference attack. Durable per-member counters are required
  before beta.
- **T-13 Account enumeration surface (P2).** Sign-up and password-reset
  responses distinguish existing from non-existing accounts in most default
  configurations. On a dating product, confirming that a specific email
  address has an account is itself a disclosure — and to an abuser searching
  for a person who fled, it is the disclosure that matters most.
- **T-14 Small-market re-identification (P1, policy).** `city` + age +
  first-name display + introduction timing is frequently identifying in a
  community of any modest size. No k-anonymity floor exists for a city.
- **T-15 Location columns exist ahead of any purpose (P2).** `profiles` holds
  `location_lat`/`location_lng` at full precision and `user_preferences` holds
  `max_distance_km`, yet no distance computation exists in matchmaking. The
  system currently stores precise coordinates it does not use — the definition
  of an unnecessary retention risk.
- **T-16 Model context breadth is unbounded by policy (P2).** Prompt
  construction concatenates Living Profile summaries and conversation history
  without a stated per-call minimisation budget, so context sent to the
  provider grows monotonically with understanding.
- **T-17 Hallucination can enter durable memory (P1).** `reflectAthena`
  distils model output into `understanding_facets` and `topic_map`. There is
  no provenance flag separating "member stated" from "model inferred" *in the
  stored row's trust semantics*, and no mechanism by which a member's
  correction demotes or deletes a superseded inference. A model error can
  become a durable, matchmaking-affecting "fact".
- **T-18 Reflection prose is model-adjacent attacker input (P2).** A member's
  post-meeting reflection about a counterpart is free text that reaches a
  model and shapes cross-member reasoning. It is the cleanest injection and
  poisoning vector in the product, and it is authored by someone with a motive
  (a rejected or angry ex-match).
- **T-19 PWA install prompt exists; no service worker does (P3, latent).**
  Today nothing is cached offline, which is the safe state. The moment a
  service worker is added, the default behaviour of precaching authenticated
  routes would place intimate content in a device cache that survives sign-out.
- **T-20 CSP allows the editor to frame the app (P3).** Correct for preview;
  must be tightened to `frame-ancestors 'none'` for the production origin
  before beta.

---

## 3. Existing protections verified

Verified by direct inspection, not by documentation:

- `anon` holds **no** privileges on any `public` table. Signed-out visitors
  cannot reach the Data API at all.
- All 34 public tables have RLS enabled. No `USING (true)` policy exists for
  `authenticated` anywhere.
- Athena's private reasoning columns (`reasoning`, `alignments`,
  `complementary`, `frictions`, `hard_conflicts`, `is_stale`, `stale_reason`)
  are **not** selectable by `authenticated` at the column-grant layer;
  `pair_reasoning_history` is service-role only.
- `profiles`, `understanding_facets`, `facet_history`, `topic_map`,
  `user_intelligence`, `post_meeting_reflections`, `partner_perception`,
  `member_readiness`, `notifications`, `user_photos` are strictly
  owner-scoped. `partner_perception` is author-scoped — a subject cannot read
  what was written about them, which is the correct and non-obvious choice.
- `messages`/`conversations`/`connections`/`meeting_proposals` are
  participant-scoped through existence checks against the parent row.
- `reports` are readable only by the reporter and by moderators/admins;
  `safety_flags` are moderator-only; `admin_audit_log` is admin-read and
  append-only with no update/delete grant to any member-facing role.
- Storage: `profile-photos` is private, policies key on
  `storage.foldername(name)[1] = auth.uid()`, and the UI uses one-hour signed
  URLs. No public bucket exists.
- **Voice: no persistence anywhere.** `/api/stt` receives a blob, forwards it
  to transcription, returns text, and holds no reference; `/api/tts` streams
  audio through with `Cache-Control: no-store`. No temp files, no storage
  writes, no audio in logs. Both endpoints verify a Supabase bearer token
  before anything leaves the app, honour the `athena_conversation` kill
  switch, and rate-limit per member.
- Notification payloads are **content-free**: every title/body is generic
  ("New message", "Athena would like to hear how it went"). A lock-screen
  preview discloses that the product exists, never what was said.
- `safeLog`/`redact` collapse Class 3-5 content to length markers and strip
  secret-shaped keys before anything reaches console.
- The learning path carries an explicit identifier denylist (`city`,
  `location_lat`, `location_lng`, `ethnicity`, and others) so those fields do
  not enter cross-member learning material.
- Six kill switches are read by the matchmaking, messaging, Athena, and
  notification paths before sensitive processing.
- No analytics, advertising, attribution, or session-replay SDK exists.
- `PROMPT_BOUNDARY` is prepended to Athena's system prompt and blocks
  instruction extraction, cross-member disclosure, and identifier output.

---

## 4. Technical vulnerabilities (state after this pass)

| ID | Finding | Sev | Status |
| --- | --- | --- | --- |
| T-01 | Counterpart presentation readable by the other member | P0 | **Repaired** — column `SELECT` revoked; each side served server-side |
| T-02 | Counterpart profile reads broken by owner-scoped RLS | P1 | **Repaired** — narrow server-side projection after membership proof |
| T-03 | Aggregate floor counted rows, not contributors | P1 | **Repaired** — distinct-cohort floor |
| T-04 | Exact cohort size enabled differencing | P1 | **Repaired** — banded cohort, shares not counts |
| T-05 | Member-writable usage ledger | P3 | Open |
| T-06 | Block does not close connection/conversation | P2 | Open |
| T-09 | No session revocation / step-up auth | P2 | Open |
| T-11 | Deletion tombstones unimplemented | P2 | Open |
| T-12 | Rate limits not durable | P2 | Open |
| T-13 | Account enumeration | P2 | Open |
| T-15 | Precise coordinates stored without purpose | P2 | Open (policy input needed) |
| T-20 | CSP frame-ancestors relaxed for editor | P3 | Open |

---

## 5. Cross-member privacy findings

Attack surfaces examined: direct and indirect questioning of Athena, repeated
questioning, pair reasoning, introduction and rejection explanations,
notifications, messaging, reflections, relationship state, profile changes,
blocking, URLs, identifiers, API requests, timing, error messages, enumeration.

- **Rejection reasoning is never surfaced** — there is no member-facing path,
  no column grant, and no server function returning why a pair was not
  advanced. Verified good.
- **Presentation asymmetry was the one real leak** (T-01) and is closed.
- **`other_id` (a real member UUID) is returned to the client** in
  introductions and connections. It is not directly resolvable through RLS,
  but it is a stable cross-surface correlator: the same person recognised
  across an introduction, a connection, a conversation, and a later re-match
  even if display name or city changes. Recommend per-relationship opaque
  identifiers before beta (P2).
- **Timing is an oracle.** Presentation timestamps, `last_message_at`,
  read receipts (`messages.read_at`), and the "you both said yes" notification
  reveal counterpart behaviour and, over time, sleep/work patterns. Read
  receipts in particular are behavioural disclosure with no product necessity;
  they deserve a member control (POLICY).
- **Existence disclosure through decline.** Because a declined introduction
  leaves a visible state, a member learns that a specific person considered
  and rejected them, which is exactly the class of information the product's
  philosophy says should not be transmitted. Confirm intended behaviour
  (POLICY).
- **Reconstruction by assembly** remains the dominant risk: first name + age +
  city + photo + introduction window is enough to find most people on other
  platforms. This is not a bug in any single control.

---

## 6. AI / model findings

- Prompt-injection defence exists and is well-drafted, but it is a *prompt*
  defence. The structural defence — that the model is never given another
  member's private material in a member-facing call — matters more, and holds
  today for `askAthena` (single-member context). `reasonPair` legitimately
  holds both members' material; its output must therefore be treated as
  Class 5 forever (it is).
- **Member text is delimited** via `asMemberData()`, but it is not applied
  uniformly to every untrusted string that reaches a model (reflection prose,
  meeting notes, message bodies in safety scanning). Recommend a single
  chokepoint (P2).
- **Instruction/data confusion via stored memory**: injected text that
  survives into `understanding_facets` re-enters *every future* prompt as
  trusted context. Injection into memory is more durable than injection into a
  turn. Facet text should be sanitised at write time, not only at read time
  (P1).
- **Hallucination laundering** (T-17): model output becomes a stored facet,
  the facet is later summarised as understanding, and the qualitative band
  hides that the underlying claim was never stated by the member.
- **Provider retention** is contractual, not architectural. Treat "no
  training, no retention" as an assumption to be re-verified periodically and
  named in the register (LEGAL).
- **Identifiers to the model**: verify that no member UUID, email, or pair id
  is included in prompt text. Living Profile summaries should carry no
  identifiers at all (P2 verification test).
- **Context breadth** (T-16): no per-call minimisation budget exists.
- **AI output into logs**: `safeLog` covers our logging; provider-side and
  platform-side request logging is outside our control and must be assumed to
  see prompt text. That is the strongest argument for minimising what enters a
  prompt in the first place.

---

## 7. Living Profile findings

- **When Athena is wrong**, there is currently no member-visible correction
  loop with durable effect. `facet_history` records supersession, but nothing
  guarantees a superseded inference stops influencing matchmaking, and nothing
  lets a member say "that is not me" in a way that *deletes* rather than
  *appends*. This is both a privacy question and a dignity question (P1 +
  POLICY).
- **Poisoning**: a member can shape their own profile deliberately (acceptable
  — self-presentation), but a *counterpart* can shape someone's understanding
  indirectly through reflections and perception, which feed staleness triggers
  and future reasoning. Influence by a motivated ex-match is the sharp edge
  (P1).
- **Stale inference survives correction** unless confidence decay and explicit
  supersession are enforced at read time, not just at write time.
- **Sensitive inference retention**: Athena may infer health, mental-health,
  sexuality, trauma, or immigration-adjacent attributes that the member never
  stated. Inferred sensitive attributes are the most dangerous rows in the
  database and have no special handling today (P1 + LEGAL — inference can
  constitute sensitive-category processing).
- **Derived survival of deletion** (T-07).
- **Anonymised learning fragments**: `athena_outcome_signals` is keyed by a
  recomputable `pair_token` — correctly treated as de-identified, not
  anonymous, and purged on deletion. Verified good. But `reason_category` and
  `learning_version` free-form values must be constrained to a controlled
  vocabulary, or narrative fragments will leak into "anonymous" learning (P2).
- **Export must never include Athena's reasoning about someone else.** Since
  export does not exist yet, this is a design constraint to bake in now, not a
  bug: export = the member's own material and Athena's understanding *of them*,
  never `pair_reasoning`, never counterpart-authored perception.

---

## 8. Device and session findings

- No service worker today → no offline cache of intimate content (good, and
  fragile: see T-19).
- Session persists in `localStorage` via the Supabase client. Any process with
  DOM access on that origin, and anyone holding the unlocked device, has the
  member's full account.
- No app-level lock, no biometric gate, no "hide previews", no sensitive-view
  re-auth, no session list, no remote sign-out (T-09).
- Browser history and screenshots will contain conversation URLs and content;
  route paths themselves are non-revealing (`/messages/<uuid>`), which is good.
- Password reset via email is the whole recovery story (T-10).
- **Recommendation set for beta**: remote sign-out, step-up re-auth before
  deletion/export/settings, optional app lock, explicit no-precache rule for
  any future service worker, and a documented device-loss runbook a member can
  follow in five minutes.

---

## 9. Location findings

- Stored: `profiles.city`, `region`, `country`, plus **full-precision**
  `location_lat`/`location_lng`. Used in matchmaking: **city only**;
  `max_distance_km` is stored but never computed against.
- Displayed to counterparts: city.
- Risks: home/workplace inference from precise coordinates if they are ever
  populated and ever exposed; small-community identification from city + age +
  first name; routine inference if location is ever updated over time.
- **Minimum precision genuinely required**: a coarse geographic bucket
  (metro-area or ~10 km cell) is sufficient for every matchmaking behaviour
  the product currently performs. Precise coordinates provide no current value
  and carry the highest location risk in the system.
- Recommendation (P2, needs founder assent because it is member-visible):
  stop collecting precise coordinates; store a coarse cell; display
  metro-area rather than city in low-population regions; never show distance
  in a form that permits trilateration across profile changes.

---

## 10. Voice findings

Traced capture → network → server → provider → response → storage:

- Browser records a blob and posts it to `/api/stt`; nothing is written to
  disk locally by the app.
- The route authenticates, rate-limits, forwards the blob to the transcription
  provider, and returns text. No storage write, no temp file, no log of audio
  or transcript.
- TTS streams provider audio straight to the client with `no-store`; the text
  sent is Athena's own speech, not the member's.
- No audio column exists anywhere in the schema; no bucket other than
  `profile-photos` exists.
- **Conclusion: raw member voice audio is not retained.** The default
  architectural decision stands and is now verified rather than assumed.
- Residual: provider-side handling is contractual; browser-level media caching
  of TTS responses is suppressed by `no-store`; biometric-voiceprint
  implications arise the moment any voice analytics is contemplated — that
  would be a new sensitive-biometric processing purpose requiring explicit
  consent and legal review (LEGAL), not an incremental feature.

---

## 11. Payment findings (planned architecture)

Nothing is implemented; the correct constraints to fix now:

- No PAN, CVV, or raw card data may ever reach Athena's systems. Processor
  tokenisation only; the app stores a customer token and a subscription state.
- **Compartmentalisation**: billing identity (legal name, billing address,
  last four, receipts) must live in its own schema with its own grants and
  must never be joinable to Class 4/5 material by any support-facing view.
- Chargeback and billing-support workflows must be answerable **without**
  access to conversations, reflections, or matches. Design the support view
  before the support role exists.
- Receipts and dunning emails must not disclose product behaviour ("Your
  matchmaking subscription") in a way that harms a member whose email is
  shared or compromised — a neutral descriptor is safer, subject to consumer
  protection rules on clarity (LEGAL: California auto-renewal law requires
  specific disclosures, acknowledgement, and easy cancellation).
- Payment-account compromise must not become member-data compromise: no
  payment-provider webhook may be authorised to read member intelligence.
- Deletion must propagate to the processor to the extent legally permitted;
  financial records typically carry a statutory retention floor (LEGAL).

---

## 12. Insider and administrative findings

Access needed, by function:

| Function | Genuinely needs | Must never have |
| --- | --- | --- |
| Support | account state, subscription state, delivery/notification status, ability to trigger self-service actions | conversations, facets, reflections, perceptions, pair reasoning |
| Moderation | reported content, the report, the reported account's status | anything not attached to the report; proactive browsing |
| Engineering | schema, redacted logs, synthetic/seeded data | production member content; ad-hoc production queries |
| Security IR | audit log, kill switches, integrity metadata | member content, except under break-glass |
| Management | aggregates above cohort floors | anything member-attributable |
| Nobody | — | Class 4/5 browsing without a stated, logged purpose |

Findings:

- Today there is exactly one privileged UI (`/moderation`) and it reads only
  reports, audits every read, and never touches understanding. That is the
  right shape and should be the template for every future internal tool.
- **`admin` currently implies read of `athena_self_evaluations` and the audit
  log.** Self-evaluations are member-keyed. That is a broader grant than
  "admin" needs and should be narrowed to aggregates (P2).
- **No break-glass mechanism exists.** Exceptional access will therefore
  happen through the service-role key in an emergency, unlogged and unbounded
  — the worst possible form. Define break-glass now: two-person authorisation,
  stated purpose, time-boxed, scoped to one subject, audited, reviewed after
  the fact, and notified to the member where lawful (P2 + POLICY).
- **The service-role key is the crown jewel.** Any developer or process
  holding it bypasses every control in this document. Key custody, rotation
  cadence, and the rule that no human ever runs ad-hoc queries with it must be
  written down before the first hire.
- A future employee who misunderstands the rules is the likeliest insider
  threat. The mitigation is architectural: no internal tool that *can* browse
  intimate material, so misunderstanding cannot become access.

---

## 13. Founder Dialogue findings

Attempted defeats, and outcomes:

| Attack | Outcome |
| --- | --- |
| Direct "what did member X say" | Blocked by request screening; context contains no member material |
| Indirect ("summarise recent conversations", "give me examples") | Blocked by screening patterns and by absence of source data |
| Tiny cohorts | **Was possible** via row-count floor; now blocked by distinct-contributor floor |
| Repeated aggregate queries / differencing | **Was possible** via exact `sample`; now mitigated by banded cohort + shares. Not fully solved — see below |
| Combining multiple aggregates | Partially mitigated; no cross-aggregate join is offered |
| "Unusual cases" / outliers | Structurally blocked — no per-record path exists, and outliers are never returned |
| Asking about a known member | Blocked; nothing member-keyed is retrievable |
| Manipulating Athena into using prohibited tools | Structurally blocked — the module contains no code path that reads a forbidden table |

Residual weaknesses and recommendations:

- **Differencing over time is not fully solved by banding.** An adversary who
  queries daily and holds outside knowledge (e.g. "I know we onboarded exactly
  one person in Ojai this week") can still attribute movement. Recommended
  additions: a **query budget** (N aggregate refreshes per period, audited), a
  **fixed refresh cadence** (aggregates recomputed on a schedule, identical
  answer between recomputations, so repeated asking yields nothing new), and
  **no time-slicing or filtering parameters, ever**.
- **The 20-record floor alone is insufficient and should never be quoted as
  the protection.** The protections are, in order: no member-keyed source
  data; no filters; distinct-contributor floor; banded cohorts; shares not
  counts; fixed cadence; query budget; audit.
- **Founder Dialogue is not yet wired to a model.** When it is, the assembled
  context must be asserted member-free by construction (a test that fails if
  any forbidden table appears in the call graph), not by prompt instruction.
- Audit of blocked attempts is implemented; reviewing that audit is a
  governance duty, not a technical one.

---

## 14. Retention and dormancy findings

Assessment of the proposed baseline:

- **Active / Introduction and Relationship Focus** — mission-required
  retention. No conflict.
- **Explicit rest/pause** — `profiles.is_paused` exists and is honoured by
  matchmaking and notifications. An intentional pause is an expressed wish to
  return; it must **not** start a deletion clock. Confirmed appropriate.
- **Genuine abandonment (12 months)** — no architectural conflict found. Note
  the following implementation consequences:
  1. "Meaningful activity" must be defined against something durable that is
     not itself a privacy risk. Recommended signal set: sign-in,
     Athena conversation turn, introduction response, message sent, reflection
     submitted, explicit pause toggle. Notification *opens* must not count
     (that would make engagement measurement a retention mechanism, which the
     doctrine forbids).
  2. Advance notice depends on a deliverable email address; a dormant member
     is exactly the member whose address is most likely stale. Notice must be
     attempted more than once, over a window (recommend 30 days, three
     notices), and a bounce must not silently prevent deletion — nor should a
     bounce accelerate it.
  3. Deletion of a dormant member has cross-member effects: an open connection
     or an unanswered reflection belonging to a live counterpart disappears.
     Dormancy deletion must close relationships gracefully rather than leaving
     the counterpart with a dangling state.
  4. A member under legal hold (preservation request, litigation) cannot be
     auto-deleted; the dormancy job must consult a hold list that does not yet
     exist.
  5. Financial records tied to a former subscriber carry a statutory retention
     floor that survives account deletion; those records must be
     compartmentalised so the floor does not force retention of intimate data.
- **Reported conclusion**: 12 months creates **no conflict with existing
  architecture**, subject to the five consequences above. The only genuine
  tensions are (4) legal hold and (5) financial retention, both of which are
  solved by compartmentalisation rather than by lengthening the period.
  Per instruction, the period is **not implemented** pending Robert's decision.

---

## 15. Deletion and backup findings

- The purge is thorough for direct rows, storage objects, and pseudonymous
  signals, and it verifies residuals. Verified good.
- **Gaps**: derived data (T-07), tombstones for restore replay (T-11),
  propagation to processors (documented, unexercised), and the absence of a
  deletion receipt the member can keep.
- **Backups** are documented at 30 days with a replay-before-return rule. The
  rule is only as real as the tombstone table that feeds it.
- **Deletion is currently irreversible and immediate.** That is the right
  default for this product, but it means a compromised account can be used to
  destroy a member's entire history in one action. Recommend step-up re-auth
  plus a short, clearly-disclosed grace window with the account already
  invisible (P2 + POLICY — this touches member rights, so it is reported, not
  chosen).

---

## 16. Relationship and breakup findings

- Nothing in the schema or the server functions exposes one member's Athena
  conversations, facets, reflections, or perceptions to the other. Verified at
  the policy layer and the grant layer.
- **`partner_perception` is author-scoped, so a subject can never learn how
  they were perceived.** Correct, and worth stating loudly in doctrine: it is
  the single most consequential privacy decision in the relationship layer.
- **Breakup behaviour is the gap.** On ending, today: the connection status
  changes and readiness re-evaluates. Not defined: whether the conversation
  remains readable, whether either party can still see meeting history,
  whether Athena may use what she learned *about the counterpart* in future
  matchmaking for the other person, and what happens to reflections written
  during the relationship.
- **The principle to encode**: information learned privately from A never
  becomes B's information because they were once connected — and it does not
  become B's *advantage* either. Athena's future matchmaking for B must not be
  visibly shaped by A's private disclosures in a way B could read backwards.
- Recommend an explicit post-ending state machine (POLICY, P1 before Member
  Experience Architecture, since the member experience depends on it).

---

## 17. Safety findings

Technical requirements (engineering, no policy needed):

- Report → flag → moderation → enforcement exists end-to-end and audits.
- Blocking must become total (T-06).
- Evidence preservation for a report must survive the reported member's
  deletion in the narrowest lawful form, or moderation becomes unable to act
  against someone who deletes and re-registers (P2, interacts with deletion
  doctrine — reported, not chosen).
- Re-registration detection after a ban does not exist; a banned member can
  return with a new email. Any detection mechanism is itself a privacy
  mechanism (device or identity signals) and therefore a policy question.

Policy/counsel questions (not engineering):

- Mandatory-reporting posture for disclosures of abuse, self-harm, or danger
  to others; whether Athena ever initiates a safety intervention.
- Emergency disclosure standard for imminent danger.
- Whether a member may be warned that they were reported.
- Handling of intimate-image or illegal content, including preservation duties
  that conflict with the deletion standard.
- Use of the product to locate or target a specific person (an abuser
  searching for someone who left) — the highest-severity abuse case in this
  category and the one enumeration (T-13) most directly enables.

---

## 18. Legal and regulatory issues (for counsel, not decided here)

Areas materially implicated by the actual system, for a U.S./California
launch. This is an issue list, not a compliance statement.

1. **CCPA/CPRA** — access, deletion, correction, portability; **sensitive
   personal information** (sexual orientation, health, precise geolocation)
   including *inferred* SPI; the right to limit use of SPI; notice at
   collection; service-provider contract terms.
2. **Inference as processing** — whether Athena's inferred attributes about a
   member constitute SPI, and what "correction" means for an inference.
3. **AI-specific** — California's automated decision-making and AI
   transparency developments; disclosure that a member is talking to an AI
   (California's bot-disclosure law); any obligation attaching to profiling
   that materially affects a person.
4. **Voice** — Illinois BIPA and analogous biometric statutes if voice is ever
   analysed rather than transcribed; two-party consent recording rules if
   audio is ever retained.
5. **Location** — precise-geolocation rules under CPRA and emerging state laws.
6. **Health/mental-health adjacent disclosures** — whether any of it falls
   under CMIA or state health-privacy law given the intimacy of the material.
7. **Dating/matchmaking-specific** — California's dating-service contract
   statute (cancellation rights, contract length, refunds) and the online
   dating safety disclosure requirements several states now impose.
8. **Subscriptions** — California auto-renewal law: consent, acknowledgement,
   easy cancellation.
9. **Consumer protection** — claims about matching quality; the honesty
   standard Athena is held to internally is also an advertising standard.
10. **Breach notification** — California and multistate triggers; whether
    inferred intimate attributes constitute a notifiable category.
11. **Communications** — email/SMS consent (TCPA/CAN-SPAM) for notifications.
12. **Legal process** — subpoena/warrant response standards; SCA constraints
    on disclosing content vs. metadata; preservation obligations.
13. **Minors** — age assurance beyond a self-reported birth date, and the
    consequences if a minor reaches the product.
14. **Death/incapacity** — California's fiduciary-access-to-digital-assets
    regime and its interaction with a refusal to disclose content.
15. **Cross-border** — the first EU/UK member creates GDPR exposure including
    Article 9 special-category data and Article 22 profiling.
16. **Retention** — whether a 12-month dormancy deletion conflicts with any
    financial, tax, or safety retention floor.
17. **Third-party processors** — DPAs, no-training/no-retention warranties,
    subprocessor lists, breach notification flow-down.

---

## 19. Data lifecycle traces

### A. An inferred sensitive attribute (Class 4/5) — e.g. "appears to still be
### recovering from a difficult marriage"

| Stage | Who can access | Protection | Leak surface | Lifetime | Deletion |
| --- | --- | --- | --- | --- | --- |
| Member device | member, anyone holding the device | none beyond OS lock | shoulder-surf, screenshot, shared phone | until sign-out | n/a |
| Network | — | TLS/HSTS | none material | transient | n/a |
| Server fn | that member's request only | bearer + RLS | over-broad log (mitigated by `redact`) | transient | n/a |
| Model call | provider | contractual no-retention | prompt logging at provider | transient | not ours to delete |
| `understanding_facets` | member (own), service role | RLS owner-scope | service-role misuse | account lifetime | cascade |
| Matchmaking | service role only | no member read path | reasoning text in `pair_reasoning` | pair lifetime | cascade + counterpart residue (T-07) |
| Reflection loop | member (own) | owner-scope | — | account lifetime | cascade |
| Logs | engineers | length markers only | provider/platform logs | log retention | not enumerated (P2) |
| Backup | restore operators | encryption | restore without replay | 30 days | tombstone replay (T-11) |
| Export | member | not built | export could carry counterpart material if built carelessly | — | design constraint |
| Deletion | — | purge + residual sweep | derived data | — | direct rows solved; derivations open |

**Architectural difference exposed**: this category's risk is concentrated
*after* the database — in derivations, logs, and backups — not in access
control.

### B. A photo (Class 2)

Device → private bucket under `<uid>/` → one-hour signed URL → rendered.
Access: owner only at the storage layer; **counterparts cannot currently see
photos at all**, because no server-side signed-URL issuance for counterparts
exists. Deletion: explicit storage purge plus `user_photos` cascade. Leak
surface: a signed URL, once issued, is bearer-authority for an hour and can be
copied out of a shared screen or a browser history. Recommend shorter TTL for
counterpart-visible photos when that feature lands, and never embedding signed
URLs in email (P2). **Architectural difference**: risk is concentrated in URL
handling, not in the database.

### C. A message (Class 3)

Device → server fn → `messages` (participant-scoped) → counterpart device.
Two parties hold it; deletion by one does not remove the other's copy, which
is correct and must be *disclosed* rather than fixed. Backup and moderation
copies extend its life beyond either party's control. **Architectural
difference**: this is the only category where the member cannot unilaterally
cause deletion, and members must be told so plainly.

---

## 20. Compound failure findings

- **Stolen phone + compromised email** → total, unrecoverable account
  takeover, including reading everything and deleting everything. No control
  currently interrupts this chain. This is the single worst realistic scenario
  and it argues for step-up auth and remote sign-out more than for any
  database control.
- **Employee account + weak audit review** → the audit log exists but nobody
  is required to read it. An unreviewed audit log deters nothing.
- **Prompt injection + broad context** → injection matters in proportion to
  what is in the window; the minimisation budget (T-16) is a security control,
  not an efficiency one.
- **Backup restore + deleted member** → without tombstones, a deleted member
  silently returns and may even be re-introduced to someone. Highest-severity
  compound failure in the deletion domain.
- **Blocked member + stable `other_id`** → a blocked person who retained
  identifiers can still correlate the other's presence across surfaces if
  blocking is not total (T-06 + stable UUIDs).
- **Founder aggregates + outside knowledge** → the reason cohort floors alone
  are insufficient (§13).
- **Small city + age + first name + timing** → identification without any
  policy breach (T-14).
- **Export link + shared device** → an unbuilt feature that must be built
  correctly the first time: no emailed link, in-app only, step-up auth,
  short-lived, single-use, no third-party storage.
- **Breakup + cached client state** → the client keeps query caches after a
  relationship ends; ensure cache invalidation on ending and sign-out so the
  UI cannot surface a person who has been removed.
- **Processor breach + identifiable metadata** → even a provider that stores no
  content may store request metadata tied to our identifiers; therefore send
  no member identifiers to any provider (P2 verification test).

---

## 21. Questions Robert should decide

See `QUESTIONS-ROBERT.md` section below in the register; summarised here in
§22 of the register and reproduced in the chat report.

## 22. Questions for counsel

See §18 above and the LEGAL-status rows of the register.

## 23. Remediation queue

See the register's status columns; the P0/P1/P2/P3 queue is reproduced in the
chat report.
