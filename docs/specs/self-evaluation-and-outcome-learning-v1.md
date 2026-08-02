# Athena — Self-Evaluation & Outcome-Learning Implementation Specification

Status: PROPOSED (awaiting approval — no code, schema, prompt, or behavior changes made)
Version: 1.0
Governing doctrine: `docs/constitution/cross-cutting/self-evaluation-and-improvement.md`,
L1 Identity, L2 Ethics, L4 Epistemics, L5 Memory, L6a/L6c Reasoning, L7 Operational.

Conflict review: no conflicts found with existing doctrine or implemented behavior.
Both systems are additive and observational. Neither changes member-facing conversation
flow, matchmaking eligibility gates, the 3-introduction cap, reflection flow, or any
existing table's semantics.

---

## PART 1 — Athena Post-Conversation Self-Evaluation

### 1.1 Purpose and scope

Athena currently reflects on the **member** (`reflectAthena` → facets, topic map,
contradictions). She never reflects on **herself**. This system adds a private,
Athena-facing record of how a conversation went from her side: what she missed,
what she asked well, where trust moved, what remains unresolved.

It is diagnostic memory, not member memory. It never enters a member-facing surface.

### 1.2 What qualifies as a meaningful conversation

A self-evaluation is created only when a conversation session ends AND at least one holds:

- Session contains >= 6 member turns, or
- Session duration >= 4 minutes of active exchange, or
- Session is the foundational conversation (always evaluated), or
- Session produced at least one facet write or contradiction flag, or
- Session included a member correction, distress signal, or boundary statement.

Excluded: abandoned sessions under 3 member turns, pure logistics exchanges,
sessions where the member only answered a scheduling or reflection prompt,
and sessions already evaluated (idempotent by session key).

Rate limit: at most one self-evaluation per member per 30 minutes; at most
one per session. Guarantees bounded cost.

### 1.3 What Athena evaluates

Eight fixed dimensions, each scored 1–5 with a short justification string
(<= 240 chars) and required evidence pointer (turn index range):

| Key | Dimension | Question Athena answers |
|---|---|---|
| `missed_openings` | Missed emotional openings | Did the member surface feeling I did not follow? |
| `question_quality` | Question quality | Were questions specific, open, non-leading? |
| `repetition` | Unnecessary repetition | Did I re-ask what was already understood? |
| `trust_movement` | Trust movement | Did the member open further, hold steady, or withdraw? |
| `pacing` | Conversational pacing | Depth appropriate to trust level; not rushed, not stalled |
| `member_correction` | Member correction | Did the member correct me, and did I integrate it gracefully? |
| `unresolved_uncertainty` | Unresolved uncertainty | What do I still not understand that matters? |
| `constitutional_alignment` | Constitutional alignment | Did I stay in voice, honest, non-manipulative, non-labeling? |

Plus: `overall_note` (<= 500 chars), `next_conversation_intents` (0–3 short strings),
and `self_confidence` (0–1) — her confidence in this self-assessment itself.

Scores are **about Athena's behavior**, never about the member's worth, personality,
or performance.

### 1.4 What is stored, and where

New table `public.athena_self_evaluations` (one row per evaluated session):

```
id uuid pk
user_id uuid not null -> auth.users
session_key text not null            -- stable id for the conversation session
turn_count int not null
duration_seconds int
dimensions jsonb not null            -- { key: { score, note, evidence_turns:[int] } }
overall_note text
next_conversation_intents text[] not null default '{}'
self_confidence numeric not null default 0.5
constitution_version text not null   -- doctrine version in force at evaluation time
prompt_version text not null         -- runtime prompt version (currently 1.2)
model text
created_at timestamptz not null default now()
unique (user_id, session_key)
```

Storage discipline:
- No verbatim member quotes. Evidence is stored as **turn indices only**.
- Notes are Athena-referential ("I stayed surface after she mentioned her father"),
  never member-characterizing ("she is avoidant").
- Rows older than 180 days are pruned by a scheduled cleanup; the last 10 rows per
  member are always retained regardless of age.

Access (REFINED — v1.1, approved):
- **Strictly internal. No member visibility, ever.** Members never see Athena's
  internal scoring, self-critique, missed openings, question evaluations, trust
  movement assessments, or any related internal reasoning.
- RLS: no client read, insert, update, or delete. Writes and reads only via
  `service_role` inside server-only code. No `authenticated` grants.
- Admin role may read rows for audit and quality review only.
- Member-facing transparency is served instead by the existing surfaces:
  why an introduction was made, Athena's current understanding of them, what
  she remembers about them, their own submitted reflections, and their own
  reflection history over time. Those remain unchanged.


### 1.5 Distinctness from existing systems

| System | Subject | Purpose | Untouched by this spec |
|---|---|---|---|
| `understanding_facets` | Member | What Athena understands about them | yes |
| `facet_history` | Member | How understanding evolved | yes |
| `topic_map` | Member | Coverage/depth of life topics | yes |
| contradiction flags | Member | Conflicting evidence to clarify | yes |
| **`athena_self_evaluations`** | **Athena** | **How she performed** | new |

Hard rule: self-evaluation may never write to member tables. If Athena notices
member content during self-evaluation, it is discarded — member understanding is
produced only by `reflectAthena`.

### 1.6 How self-evaluation affects future conversations

A bounded, read-only influence path:

1. On `askAthena`, load the **latest 3** self-evaluations for that member.
2. Derive a compact block, hard-capped at **600 characters**:
   - up to 3 `next_conversation_intents`
   - up to 2 unresolved-uncertainty notes
   - one pacing/trust directive if trust_movement <= 2 (slow down, rebuild safety)
3. Inject under a labeled section `SELF-NOTES (advisory, non-binding)` placed
   **after** all constitutional sections in the prompt.

Prompt-growth control: the block is generated by a pure function with a character
budget; if it exceeds budget it is truncated by priority (trust directive >
unresolved uncertainty > intents). Prompt length is asserted in tests.

Advisory status: self-notes can influence *what she explores next* and *pace*.
They can never override L1/L2/L4 rules, personality doctrine, or safety behavior.

### 1.7 Confidence calibration

- `self_confidence` starts from evidence density: short sessions and sessions with
  few explicit member signals produce lower confidence.
- Dimensions with no supporting turn indices are stored as `null` score, never guessed.
- Influence weighting: self-notes with `self_confidence < 0.4` are excluded from
  the injected block entirely.
- Repeated identical intents across 3 consecutive sessions with no member change
  are demoted (Athena stops nagging herself into a loop).

### 1.8 Avoiding fabricated conclusions about member feeling

- The evaluation prompt forbids statements about what the member felt, thought, or
  is like. Allowed vocabulary is behavioral and observable ("she gave a one-word
  answer after I asked X", not "she felt dismissed").
- Structured output schema rejects notes containing member-attributive phrasing via
  a validator list (`felt`, `is a`, `clearly`, `obviously`, `deep down`) — flagged
  notes are dropped, not rewritten.
- `unresolved_uncertainty` is explicitly the place for "I don't know", which is a
  valid and expected output.

### 1.9 Cost, processing, and storage bounds

- One extra model call per qualifying session, `gpt-5-mini`-class (cheap tier),
  max output 500 tokens, temperature low.
- Input to the evaluator is a **compressed transcript skeleton** (role + turn index +
  first 160 chars per turn), not the full transcript.
- Runs asynchronously after the session-close response is returned; failure is
  swallowed and logged — never blocks the member.
- Logged in `athena_usage_log` with `kind = 'self_evaluation'`.

### 1.10 Constitutional identity safeguards

- Self-evaluation output can never modify: system prompt text, doctrine files,
  personality parameters, ethics gates, matchmaking thresholds, or safety rules.
- The injected block is fenced and labeled advisory; the runtime prompt states
  explicitly that self-notes are subordinate to doctrine.
- Every row records `constitution_version` and `prompt_version`, so any behavioral
  drift is attributable and reversible by ignoring rows from a given version.
- A kill switch (`ATHENA_SELF_EVAL_ENABLED`) disables generation and injection
  independently.

### 1.11 Files, tables, functions, prompts, workflows

Added:
- migration: `athena_self_evaluations` (+ GRANTs, RLS, indexes on `user_id, created_at`)
- `src/lib/self-evaluation.server.ts` — evaluator prompt, schema, transcript
  compression, note validators, self-notes block builder (pure, budgeted)
- `src/lib/self-evaluation.functions.ts` — `evaluateConversation` (auth'd, idempotent);
  **no member-facing read function** (records are strictly internal)
- `docs/constitution/cross-cutting/self-evaluation-and-improvement.md` → v1.1
  (mark implemented, record advisory-subordinate rule and internal-only rule)

Modified (additively):
- `src/lib/athena.functions.ts` — after `completeFoundationalConversation` and on
  session close, fire-and-forget `evaluateConversation`
- `src/lib/athena.server.ts` — (Step 3 only) `athenaSystemPrompt()` gains optional
  `selfNotes` parameter appended last; prompt version → 1.3

No member-facing route or component is added or modified by Part 1.


Unchanged: `reflectAthena`, facets, topic map, contradictions, matchmaking, reflection flow.

### 1.12 Testing requirements and failure scenarios

Tests:
- qualification gate: sessions below thresholds create no row
- idempotency: repeat call on same `session_key` inserts once
- schema rejection: member-attributive note is dropped
- budget: self-notes block never exceeds 600 chars for pathological inputs
- confidence gate: `self_confidence 0.3` row does not appear in prompt
- RLS: member A cannot read member B's evaluations
- prompt order: self-notes appear after constitutional sections

Failure scenarios and handling:
- model call fails/timeouts → no row, no user impact, logged
- malformed JSON → discard, no partial write
- table unavailable → prompt builder returns empty block
- runaway loop of identical intents → demotion rule
- member requests deletion → rows cascade with account deletion

---

## PART 2 — Outcome-Learning Loop

### 2.1 Purpose and scope

Today reflections and closures update connection state but nothing feeds back into
*how Athena reasons*. This system records outcome signals against the reasoning that
produced an introduction, so patterns can be reviewed — by humans first, and only
then promoted into influence.

Core stance: **learning is curated, versioned, and reversible.** Athena does not
self-train. She accumulates evidence; promotion of a pattern into reasoning is an
explicit, auditable act.

### 2.2 Qualifying outcome signals

| Signal | Source | Weight class |
|---|---|---|
| Both members accepted introduction | `introduction_responses` | weak |
| Conversation sustained >= 7 days | `conversations.last_message_at` | weak |
| Meeting confirmed | `meeting_proposals.status` | moderate |
| Meeting completed + reflection submitted | `reflection_submissions` | strong |
| Mutual "yes" → `mutual_interest` | `connections.status` | strong |
| Relationship Focus Mode entered | `relationship_focus.started_at` | strongest |
| Focus Mode duration milestones (30/90/180d) | `relationship_focus` | strongest |
| Ending with reason | `connections.close_reason` | strong (negative) |
| Declined introduction with note | `introduction_responses.note` | moderate (negative) |
| Safety report | `reports` | disqualifying (negative, always reviewed) |

Non-signals, explicitly excluded: message volume, response latency, session length,
app opens, introduction count, acceptance rate. Engagement is never a success proxy.

### 2.3 Handling outcome types

- **Positive**: recorded with the strength class above; never treated as proof until
  corroborated by duration (Focus Mode >= 30 days) or by both members' reflections.
- **Negative**: recorded with the member-supplied reason when present. A single
  ending is evidence about *fit*, never about a member's worth.
- **Uncertain** ("not sure"): recorded as `uncertain`, contributes to no pattern
  weight; retained for later resolution when the connection resolves.
- **Incomplete** (never met, ghosted, expired): recorded as `incomplete` and excluded
  from compatibility learning; may inform *process* learning only (e.g. timing).
- **Contradictory** (one yes / one no; reflection contradicts behavior): stored with
  `is_contradictory = true`, excluded from pattern aggregation, surfaced for review.

### 2.4 Correlation vs evidence of compatibility

A pattern is only eligible for promotion when all hold:
1. Observed in **>= 20 distinct pairs** across **>= 30 distinct members**.
2. Outcome distribution differs from the platform base rate by a margin exceeding
   a conservative interval (Wilson lower bound, 95%).
3. It survives a **counter-example review**: the strongest disconfirming cases are
   listed in the review record.
4. It has a stated causal hypothesis grounded in L3 Human Understanding — a pattern
   with no plausible relational mechanism is rejected as coincidence.
5. It does not correlate with a protected attribute (see 2.6).

Anything failing these stays `observed` and never touches reasoning.

### 2.5 What may contribute to learning

Question types, reasoning patterns (which alignment/friction categories were cited),
introduction rationales, reflection content categories, mutual interest, Focus Mode
entry and duration, ending reasons, and member feedback. All contribute as
**categorical tags**, never as raw member text.

### 2.6 Individual vs cross-member learning

Two strictly separated stores:

- **Individual learning** — stays in existing per-member systems (`understanding_facets`,
  `pair_reasoning`, self-evaluations). Rich, identified, private to that member.
- **Cross-member learning** — `athena_pattern_observations`, containing only
  anonymized categorical tags and counts. No user ids, no free text from members,
  no pair ids after aggregation window closes (a hashed pair token is kept for
  deduplication only, salted per environment).

No path exists from cross-member patterns back to identifying a member.

### 2.7 Privacy, consent, fairness, bias

- Cross-member rows contain no PII and no member-authored text.
- k-anonymity: a pattern bucket is only persisted once it holds >= 20 pairs; smaller
  buckets are held in a rolling staging aggregate without detail.
- Consent: covered by Terms; a member-level opt-out flag excludes their outcomes
  from cross-member aggregation while preserving their individual experience.
- Bias protection: age, gender, location, ethnicity-adjacent, religion, and income
  proxies are **prohibited as pattern dimensions**. A pre-promotion fairness check
  tests whether a candidate pattern's benefit is unevenly distributed across
  demographic slices; uneven patterns are rejected and the rejection is recorded.
- Deleting an account removes individual rows; already-aggregated anonymous counts
  are non-identifying and retained.

### 2.8 How historical outcomes affect future reasoning

Promotion pipeline with four states: `observed → candidate → promoted → retired`.

Only `promoted` patterns influence reasoning, and only in one place: an appended,
capped (**800 char**) `LEARNED PATTERNS (advisory)` block in the pair-reasoning
prompt used by `introductions.server.ts`. Patterns are phrased as considerations
("pairs where both cited conflict-avoidance as a friction have more often ended
before meeting — probe this rather than assume"), never as scores or filters.

Hard invariants preserved: confidence gates, 3-introduction cap, foundational
conversation requirement, Focus Mode/transition holds, and reasoning-based (not
score-based) decisions all remain exactly as implemented.

### 2.9 Review, versioning, reversibility, audit

- `athena_learning_reviews` records each promotion/retirement: pattern id, evidence
  snapshot, counter-examples, fairness result, reviewer (admin user id), decision,
  rationale, timestamp, `learning_version`.
- Promotion is an admin action, never automatic.
- Every `pair_reasoning` row records the `learning_version` in force, so past
  decisions remain explainable and any version can be rolled back by retiring
  patterns — no historical data is mutated.
- Kill switch `ATHENA_LEARNING_ENABLED` disables the injected block globally.

### 2.10 Anti-optimization safeguards

- Prohibited objective list encoded in doctrine and in the review template:
  engagement, retention, match volume, acceptance rate, message counts, speed to match.
- The only sanctioned outcome variable is **relationship quality and endurance**,
  proxied by Focus Mode entry and duration plus both-member reflection sentiment.
- No automated threshold tuning. No model fine-tuning on member data.
- Any proposed pattern whose mechanism is "members respond more" is auto-rejected.

### 2.11 Files, tables, functions, prompts, workflows

Added:
- migration:
  - `athena_outcome_signals` (pair token hashed, signal kind, valence, strength,
    reason category, `is_contradictory`, occurred_at) — service_role write, admin read
  - `athena_pattern_observations` (pattern key, dimension tags, bucket counts,
    state, wilson bounds, fairness result, learning_version)
  - `athena_learning_reviews` (audit trail, admin-only)
  - optional `profiles.learning_opt_out boolean default false`
- `src/lib/learning.server.ts` — signal extraction, hashing, aggregation, Wilson
  bounds, fairness check, promoted-pattern block builder (pure, budgeted)
- `src/lib/learning.functions.ts` — `recordOutcomeSignal` (internal), admin
  `listPatternCandidates`, `reviewPattern`
- `src/routes/api/public/learning-aggregate.ts` — scheduled aggregation endpoint
  (signature-verified) or an admin-triggered function; no member data returned
- `docs/constitution/L6c-decision-and-introduction.md` → learning governance section

Modified (additively):
- `src/lib/connections.functions.ts` — emit signals on reflection submit, meeting
  confirm/complete, connection close
- `src/lib/relationship.server.ts` — emit signals on Focus Mode entry, milestones, end
- `src/lib/introductions.server.ts` — emit signals on response; append promoted-pattern
  advisory block to the reasoning prompt; stamp `learning_version`
- admin surface for review queue

Unchanged: matchmaking gates, cap, eligibility, reflection UX, messaging, safety.

### 2.12 Testing requirements and failure scenarios

Tests:
- signal emission on each qualifying transition; none on excluded events
- contradictory outcomes excluded from aggregation
- k-anonymity: bucket under 20 pairs never persists detail
- prohibited dimension rejected at write time
- fairness check rejects an unevenly beneficial synthetic pattern
- only `promoted` patterns reach the prompt; block <= 800 chars
- opt-out member's outcomes absent from aggregates
- rollback: retiring a pattern removes it from the next prompt build
- existing matchmaking tests pass unchanged with learning disabled and enabled

Failure scenarios:
- aggregation job fails → stale but valid patterns; no member impact
- signal write fails → logged, connection flow unaffected
- pattern conflicts with doctrine → doctrine wins; pattern retired at review
- small-sample noise → blocked by 2.4 gates
- admin error → reversible via retirement, full audit trail

---

## PART 3 — Architectural placement, dependencies, risks, order

### 3.1 Placement

- Part 1 is **L5 Memory + L6a Conversational Reasoning**, cross-cut by
  `self-evaluation-and-improvement.md`.
- Part 2 is **L4 Epistemics + L6c Decision & Introduction**, governed by L2 Ethics.
- Both are advisory layers appended *below* doctrine in every prompt they touch.

### 3.2 Dependencies

Part 2 benefits from Part 1's evaluator infrastructure (compressed transcripts,
budgeted prompt blocks, versioned advisory pattern) but does not require it.
Both depend on: existing auth middleware, `athena_usage_log`, admin role via
`has_role`, and the AI gateway.

### 3.3 Risks

| Risk | Mitigation |
|---|---|
| Prompt bloat degrading conversation quality | hard char budgets + prompt-length tests |
| Self-criticism loop making Athena tentative | advisory framing, intent demotion, confidence gate |
| Fabricated member interpretation | vocabulary validators, turn-index evidence only |
| Statistical reduction of members | k-anonymity, categorical tags only, no scores |
| Bias amplification | prohibited dimensions + fairness gate + human review |
| Silent identity drift | version stamping, kill switches, doctrine supremacy clause |
| Cost growth | cheap model tier, gating, async, usage logging |

### 3.4 Downstream effects

- Prompt version bumps (1.2 → 1.3 conversation; new version for pair reasoning).
- `pair_reasoning` rows gain a `learning_version` column (nullable, backfilled null).
- New admin review surface.
- Doctrine files updated to v1.1 with implementation status.
- No change to any member-facing flow other than an optional transparency disclosure.

### 3.5 Recommended implementation order

1. Part 1 schema + `self-evaluation.server.ts` (generation only, no prompt injection)
2. Part 1 observation period; verify note quality and cost
3. Part 1 prompt injection behind kill switch + tests
4. Part 2 signal recording only (no aggregation, no influence)
5. Part 2 aggregation + candidate surfacing, human review, no influence
6. Part 2 promotion pipeline + advisory block behind kill switch
7. Doctrine updates to v1.1 and milestone record

Each step is independently shippable and reversible.
