# Experience Architecture — Decision & Implementation Register

Canonical record of founder decisions and downstream implementation
requirements arising from Experience Architecture review (E1–E8).

Nothing here authorizes implementation. Items marked *Recorded — Not Yet
Implemented* are requirements to be satisfied during the named downstream
phase. Founder decisions are binding and may only be amended by a new dated
entry in this register.

Status values: **Founder Decision — Binding** · **Recorded — Not Yet
Implemented** · **Implemented** · **Verified**

---

## Part I — Founder decisions

### X-01 — Pause expiry never silently returns a member to matchmaking — **APPROVED (2026-08-17)**

*Source:* E2 — Emotional Journey (§35, §38); runtime finding in
`runMatchmakingForUser`, which currently auto-expires a `rest` state when
`hold_until` passes.

**Decision.** Expiration of `hold_until` must NOT silently return a member to
the matchmaking pool. When a selected pause period expires, the member remains
out of matchmaking until they deliberately choose to resume. Resumption is
always an explicit member act.

Athena may appropriately let the member know their selected pause period has
ended and ask whether they are ready to return. That message must carry no
pressure, no urgency, no scarcity, and no engagement-oriented language, and
must obey the notification quiet standard once X-02 is established. Silence
from the member is a valid answer and leaves them paused.

A deliberately chosen Rest/Pause state remains an intentional member state and
is never read as abandonment (consistent with F-01/F-02).

*Status:* Founder Decision — Binding · Recorded — Not Yet Implemented.

---

## Part II — Downstream implementation requirements

| ID | Requirement | Source | Phase | Status |
| --- | --- | --- | --- | --- |
| X-02 | Establish a formal notification **quiet standard**: frequency ceilings, absence handling (what Athena does and does not send when a member is away), and Relationship Focus Mode quieting. | E2 §15, §16, §31 | UX Specification / E4–E6 | Recorded — Not Yet Implemented |
| X-03 | Design **Waiting** as an intentional member experience — a designed product state with its own presence, pacing, and meaning — rather than a passive or empty UI state. | E2 §15 | UX Specification / E4–E6 | Recorded — Not Yet Implemented |
| X-04 | Design **restrained ceremony** for significant transitions (arrival, first introduction, mutual connection, first meeting, relationship focus, endings), proportionate and never celebratory of engagement. | E2 §42 | E4–E6 and later UX Specification | Recorded — Not Yet Implemented |
| X-05 | Express Athena's **thinking/processing state** through Athena's own visual and motion language rather than a generic spinner, wherever technically appropriate; preserve genuine latency and error clarity without artificial delay or theatrical behavior. | E3 §35; founder decision (2026-08-17) | E6 — Motion, Curiosity & Revelation / later UX Specification | Recorded — Not Yet Implemented |

---

# Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-17 | Register established. X-01 founder decision recorded; X-02–X-04 recorded as downstream requirements from E2 review. |
| 1.1 | 2026-08-17 | X-05 recorded: Athena thinking/processing state must be expressed through Athena's own visual and motion language rather than a generic spinner, pending E6/UX specification. |
