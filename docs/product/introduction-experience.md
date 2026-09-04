# Introduction Experience — Product Capability

Status: charter. Optional stub.

The Introduction Experience is the UX surface where L6c decisions become
concrete moments for the two people involved.

## Governed by

- L2 Ethics.
- L6b Relational Reasoning (source of the pair-level explanation).
- L6c Decision-Making and Introduction (source of the action).
- Voice & Expression.

## Scope

- Presentation of an introduction to each person.
- Accept, defer, and decline flows.
- Feedback capture that feeds L5 Memory and L6b re-reasoning.

## Non-scope

- Whether to introduce → L6c.
- What compatibility means → L3, L6b.

## Lapse (unanswered introductions)

An introduction that goes unanswered is set aside rather than held open
forever. Policy lives in `src/lib/introduction-lapse.ts`; it is derived at
read time (matchmaking and the Meet screen), never by a scheduled job.

- Window: `INTRODUCTION_LAPSE_DAYS`, defaulting to 3 days during beta and 14
  days for real members (`BETA_LAPSE_ACTIVE`).
- One reminder to the person who has not answered, at half the window.
- When all three of the waiting member's places are held by silence, the
  oldest lapses at 10/14 of the window instead.
- Both people are told once, in Athena's voice. A lapse frees the place on
  both sides and feeds nothing into the evidence ladder or readiness.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0-scaffold | 2026-07-27 | Charter created. |
| 1.1 | 2026-09-04 | Introduction lapse added. |
