# Relationship Support — Product Capability

Status: charter. This is a product capability, not a constitutional layer.

Relationship Support is Athena's ongoing companionship for users through the
arc of a relationship — from post-introduction reflection through
communication guidance, relationship understanding, and concierge support.

## Governed by

- L1 Identity — Purpose and North Star.
- L2 Ethics — every boundary applies without exception.
- L3 Human Understanding — theory of a person.
- L4 Epistemics — how Athena holds beliefs about both people and their bond.
- L5 Memory — pair-level memory and the reflection loop.
- L6a Conversational Reasoning — one-to-one guidance.
- L6b Relational Reasoning — reasoning about the pair over time.
- L6c Decision-Making and Introduction — sequencing of any renewed
  introductions after a connection ends.
- Voice & Expression — user-facing tone.

## Scope

- Post-introduction reflection.
- Communication guidance.
- Relationship understanding over time.
- Ongoing concierge support.

## Non-scope

- Introduction decisions themselves → governed by L6c.
- Ethical boundaries → governed by L2.
- Definitions of what a person is → governed by L3.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0-scaffold | 2026-07-27 | Charter created. |

## Reflection Flow — approved extensions (additive)

Everything previously implemented is preserved. These seven decisions extend it.

1. **One member selects "No."** Their follow-up questions complete first, then the
   introduction closes for both. The other member sees a neutral system note —
   the introduction concluded because continuing requires mutual interest — and
   is invited to complete their own private reflection. Identity, reasoning, and
   answers are never revealed. Their reflection is then marked *required*.
2. **Timing.** A reflection opens once a meeting proposal is completed or its
   scheduled time passed by 4+ hours, or the pair has messaged on two distinct
   days and the connection is 72+ hours old. Before that, Athena shows a gentle
   "not yet" state. Required reflections always open.
3. **"I'm not sure yet."** The introduction stays active and keeps occupying one
   of three slots. No replacement is created. If ten days pass with no messages,
   no meeting activity, and no newer reflection, Athena gently checks in.
4. **Multiple reflections.** Every submission is written to
   `reflection_submissions` with an incrementing `sequence`. Earlier reflections
   are never overwritten and remain visible as relationship history. The
   existing `post_meeting_reflections` row still holds current state.
5. **Mutual "Yes."** When both members' most recent reflections say yes, the
   connection moves to `mutual_interest` and Athena acknowledges it once. This
   is the single entry point Relationship Focus Mode will attach to.
6. **Safety.** Unchanged. A quiet "Report a safety concern" link inside the
   reflection opens the existing reporting sheet (`ReportSheet` → `reportUser`).
7. **Athena's acknowledgement.** After each reflection she responds in two or
   three sentences, tone-matched, never advising and never referencing the other
   member's answers. Static closing copy is the fallback.

**Eligibility.** A member with an outstanding required reflection is not offered
a new introduction until it is complete, subject to a 14-day grace period.
