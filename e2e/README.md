# Authenticated V1 journey (BR-01 / BR-02)

This directory holds the end-to-end scaffolding that will consume the A-28 journey-spine
`data-testid` hooks once authenticated test identities exist.

Status: **scaffolded, not executed.** BR-01 (authenticated end-to-end walkthrough) and
BR-02 (two-member authorization / F-37) remain OPEN. They must not be closed by code
inspection.

## Running (once identities exist)

```bash
BASE_URL=http://localhost:8080 \
ATHENA_MEMBER_A_EMAIL=... ATHENA_MEMBER_A_PASSWORD=... \
ATHENA_MEMBER_B_EMAIL=... ATHENA_MEMBER_B_PASSWORD=... \
python3 e2e/authenticated_journey.py
```

Without credentials the script exits with a clear "identities unavailable" message and
does not report a pass.

## Hook contract

Journey-spine hooks only. No member information, no Athena-generated language, no test IDs
inside generic UI primitives, and no production authorization surface. The contract is
asserted by `src/__tests__/journey-hooks.test.ts`.

| Surface | Hooks |
| --- | --- |
| Today | `today-screen`, `today-link-athena`, `today-link-living-profile`, `today-link-understanding` |
| Navigation | `tab-*` |
| Athena conversation | `athena-screen`, `athena-transcript` (`data-conversation-state`), `athena-input`, `athena-send`, `athena-record` |
| Living Profile | `profile-screen`, `profile-review-link`, `profile-pause-toggle`, `profile-understanding-link`, `profile-membership-link`, `profile-sign-out` |
| Understanding / correction | `understanding-screen`, `understanding-facet`, `understanding-revise-open`, `understanding-revision-kind-*`, `understanding-revision-statement`, `understanding-revision-submit` |
| Membership | `membership-screen`, `membership-plan`, `membership-restore` |
| Meet / introductions | `introductions-screen`, `introduction-card`, `introduction-reasoning-link`, `introduction-accept`, `introduction-defer`, `introduction-decline`, `introductions-reflect` |
| Connections | `connections-screen`, `connection-card` |
| Messages | `messages-screen`, `message-thread-link` |
| Reflection | `reflection-flow` (`data-state`), `reflection-feeling`, `reflection-decision-*`, `reflection-submit` |
| Relationship Focus | `relationship-focus` (`data-focus-state`), `relationship-focus-opt-in`, `relationship-focus-end`, `relationship-focus-end-confirm` |
| Rest / endings | `ending-choice`, `ending-path-*` |
| Account / privacy | `privacy-controls`, `privacy-sign-out-everywhere`, `privacy-export`, `privacy-delete-account`, `step-up-form`, `step-up-password`, `step-up-confirm` |
