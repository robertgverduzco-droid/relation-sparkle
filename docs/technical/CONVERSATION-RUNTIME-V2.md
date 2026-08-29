# Athena Conversation Runtime V2

Status: implementation artifact. Governed by `docs/constitution/L6a-conversational-reasoning.md`
and `docs/constitution/cross-cutting/evidentiary-discipline.md`. Does not amend
identity, epistemics, safety, or matching.

## Canonical consolidation pass (current)

This document is the reconciliation point. The piecemeal V2 / personality /
provenance / exemplar instructions are superseded, not stacked on.

Removed or rewritten in this pass:

| Legacy instruction | Where it lived | Fate |
|---|---|---|
| `CONVERSATION STRATEGY` ("invisible guide", "questions that invite reflection", "endings are natural") | `athena.server.ts` base prompt | replaced by `WHY YOU TALK AT ALL` — mission only, no rhythm |
| `HOW YOU TALK` (coffee-conversation rhythm, "gently invite a little more depth") | `athena.server.ts` | deleted; turn conduct is the runtime's, exclusively |
| `TOPIC DEPTH` (2–3 questions per topic, then transition) | `athena.server.ts` | replaced by `BREADTH` — movement at natural seams, never on a count |
| `BALANCE` (question/reflection mixing) | `athena.server.ts` | deleted; superseded by runtime items 5–7 and 16 |
| `INTERNAL CONVERSATION MAP` | `athena.server.ts` | retained (coverage tracking is not a rhythm) |

The base prompt now carries identity, mission, ethics, understanding and
memory. It no longer carries a single instruction about how to conduct a turn.

New in this pass:

- **Human Experience Atlas** (`src/lib/atlas.ts`, `docs/product/human-experience-atlas.md`) —
  inner-experience calibration across 40+ situations, retrieved at most twice
  per turn.
- **Venting** and **wheel** events — advice is withheld when it was refused;
  handing the choice back is never an answer to "surprise me".
- **Product belongs at seams** — `TurnSignals.noticeSeam` and
  `ConversationRuntimePlan.noticeSeamOk` defer time, readiness and lifecycle
  notices out of grief, pain, active humour and open questions. Deferred, never
  cancelled: the notice surfaces at the next genuine seam.
- **Runtime observability** (`src/lib/turn-decisions.server.ts`) — de-identified
  per-turn decisions (event, register, deferral, calibration used) so drift back
  toward interviewing is visible to the founder. No text, no identity.

## What changed (first consolidation pass)

The first V2 pass added turn planning and provenance, but the member-facing
prompt still *stacked* independent behavioural blocks — turn runtime, register
guidance, provenance posture — assembled separately at each call site and in a
different order for text and voice. That is what produced replies in which
several doctrines argued with each other.

This pass replaces that assembly with ONE composer.

### Old architecture (replaced)

| Old | Where | Fate |
|---|---|---|
| `turnRuntimeGuidance(signals)` composed at the call site | `athena.functions.ts` | absorbed into `conversationRuntime()` |
| `alivenessGuidance({permission, isFoundational})` composed separately | both surfaces | absorbed (still the register source of truth) |
| challenge addendum inside `turnRuntimeGuidance` | `turn-runtime.ts` | superseded by the single event directive |
| provenance posture appended ad hoc | `athena.functions.ts` | absorbed, ordered last |
| register thresholds requiring 6–10 member turns | `conversational-aliveness.ts` | superseded (see mechanical fixes) |
| bare-slur boundary cues | `boundaries.ts` | superseded by directed-abuse cues |
| interaction style written only at reflection | `athena.functions.ts` | moved to per-turn persistence |

Nothing was appended beneath the old runtime. `athena.functions.ts` and
the voice path now injects exactly one behavioural block.

### New decision flow

```text
member turn
  -> readTurn()          signals: challenge, opinion, subject, provenance intent
  -> detectEvent()       ONE dominant event, resolved by priority
  -> derivePermission()  register from cumulative, account-scoped evidence
  -> selectExemplars()   <= 2 calibration entries for that event
  -> conversationRuntime()
       turn discipline -> register -> this moment -> calibration -> provenance
```

Everything else (doctrine + Athena University retrieval, Living Profile memory,
readiness, waiting, boundaries, pacing, structured intake) is composed by the
call site around that block and always outranks it.

### Event detection

`src/lib/conversation-runtime.ts` resolves exactly one event per turn, in
priority order: `serious_disclosure` -> `paraphrase_stop` -> `correction` ->
`lead_request` -> `provenance` -> `challenge` -> `joke` -> `figurative` ->
`self_characterization` -> `opinion_request` -> `subject_matter` ->
`ordinary`. One event means one directive, which is how "one move, not a
stack" is enforced deterministically rather than by asking the model nicely.

### Evidence and provenance

Knowledge categorisation (fact / self-report / observation / pattern /
inference / unknown / education / general knowledge) stays in
`TURN_RUNTIME_V2`. Provenance remains member-triggered and turn-scoped:
`detectProvenanceIntent()` gates a *separate* retrieval path
(`provenance.server.ts`) so attribution metadata can never leak into an
ordinary turn, and `verifiedQuotations()` keeps quotation honest.

## Exemplar library

`src/lib/exemplars.ts` holds all 25 behavioural exemplars as
`moment / principle / antipattern`, tagged by conversational event. Exemplar
*wording* is never stored as Athena dialogue — only the judgement to
generalise and the failure mode being replaced.

Runtime use: at most **two** exemplars, selected by the detected event, added
last and dropped first under context pressure. Serious turns select only
serious-tagged material. The block is explicitly framed as "judgement to
generalise — never wording to reuse".

## Mechanical fixes

1. **Register unlocks on evidence, not conversation length.** One genuine
   humour opening reaches `natural`; three reach `playful`; one profanity turn
   relaxes language; teasing needs an invitation.
2. **Ordinary profanity is not abuse.** `boundaries.ts` now matches only
   language directed at Athena or a person. "This fucking app is frustrating"
   is not a boundary event; "fuck you, Athena" still is.
3. **Style persists per turn** in `askAthena`, so short sessions that never
   reach reflection are no longer socially forgotten. Reflection no longer
   re-tallies the transcript (double counting removed).
4. **Reasoning configuration.** Member-facing conversation moved from
   `reasoningEffort: "none"` to `"low"`. Analytical surfaces (reflection, pair
   reasoning, meeting reflection, founder, self-evaluation) are unchanged.

Measured on the gateway with the production model: joke turn 1479 ms (none)
vs 1263 ms (low); self-description turn 1013 ms vs 1774 ms. Latency impact is
within normal variance and the low-effort replies held the runtime rules more
tightly.

## Surfaces

| Surface | Runtime block | Provenance |
|---|---|---|
| `askAthena` (text) | `conversationRuntime()` | on detected intent, same turn |
| live voice session | `conversationRuntime()` at session open | mid-session via `POST /api/realtime-education` |

Analytical surfaces are unchanged: they keep `ANALYTICAL_REGISTER_GUARD` and
never inherit conversational register, exemplars, or provenance posture.

## Acceptance testing

`src/lib/conversation-acceptance.test.ts` replays multi-turn conversations
through the live composer with cumulative style evidence and asserts on the
runtime's decisions — detected event, granted register, issued directive,
selected exemplars — plus the specification's failure conditions as negatives.
Scenarios: correction and non-recurrence over ten turns, abstract questions,
humour catching, seriousness overriding earned humour, the four-rung authority
challenge, paraphrase-stop, lead-taking, ordinary profanity, real abuse,
self-flattery, callback/brevity/no-question discipline, disagreement,
uncertainty, figurative language, exemplar budget, and one-move discipline.

## Change control

Reviewed against L6a, evidentiary discipline, the Non-Quotation Standard,
Conversational Aliveness V1 and Presence doctrine. Athena University, member
memory, Living Profile, matchmaking, readiness, safety, educational retrieval
and population learning are unchanged.
