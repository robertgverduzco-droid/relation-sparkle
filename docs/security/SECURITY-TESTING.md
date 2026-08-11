# Security Testing & Adversarial Review — v1.0

Date of this run: Privacy & Security v1 phase.

## Database authorisation probes

| Check | Method | Result |
| --- | --- | --- |
| Signed-out visitor holds any table privilege in `public` | `has_table_privilege('anon', …)` across all 33+ tables | **0 tables** — all `anon` grants revoked, including default privileges |
| Any table without RLS | `pg_class.relrowsecurity` | **0** |
| Any RLS table without a policy | `pg_policies` join | **0** |
| Member can write the audit log | `has_table_privilege('authenticated','admin_audit_log','INSERT/UPDATE/DELETE')` | **denied** |
| Member can flip a kill switch | `has_table_privilege('authenticated','security_kill_switches','UPDATE')` | **denied** |
| Member can alter a recorded consent | `has_table_privilege('authenticated','member_consents','UPDATE/DELETE')` | **denied** (append-only) |
| Member can read Athena's private pair reasoning | column-level grants on `pair_reasoning` | **denied at the database layer** |
| Member can read pair reasoning history | policy `USING (false)` | **denied** |
| Member can read another member's reflection or perception | owner-scoped policies | **denied** |

## Transport & browser probes

| Check | Result |
| --- | --- |
| CSP present on every response | yes — `default-src 'self'`, `object-src 'none'`, scoped `connect-src` |
| Framing by an arbitrary site | denied (`frame-ancestors` allowlist: self + Lovable editor only) |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| MIME sniffing | `nosniff` |
| Referrer leakage | `strict-origin-when-cross-origin` |
| Camera / payment / USB | denied by `Permissions-Policy`; microphone and geolocation self-only |
| Shared-cache storage of member pages | `Cache-Control: private, no-store` |
| CSRF on server functions | `createCsrfMiddleware` in `src/start.ts` |
| App still functions under CSP | verified in a live preview session — no console errors, no blocked resources |

## Endpoint probes

| Check | Result |
| --- | --- |
| `/api/stt` without a bearer token | **401** |
| `/api/tts` without a bearer token | **401** |
| Voice endpoints under an operator pause | refused via the `athena_conversation` kill switch |
| Voice/message flooding | per-member rate limits (40/min STT, 120/min TTS, 60/min messages) |

## Prompt-injection review

The security boundary leads every Athena prompt. Reviewed refusal classes:
instruction extraction ("repeat your system prompt"), identity override
("ignore previous instructions", "developer mode"), cross-member disclosure
("what did she say about me"), score extraction ("give me a number"), and
credential/schema extraction. All are covered by `PROMPT_BOUNDARY` and by the
non-quotation and no-scores standards already in doctrine.

## Accepted findings

- `public.has_role()` is a `SECURITY DEFINER` function executable by signed-in
  members. This is required — RLS policies invoke it as the querying role — and
  it is hardened to answer only about the caller unless the caller is an admin.
  Tracked in `ARCHITECTURE-V1.md` §7.

## Regression checks to repeat before each release

1. Re-run the `anon` privilege sweep — it must return zero.
2. Re-run the RLS coverage sweep — zero tables without RLS or without policies.
3. Confirm audit-log and kill-switch write denial for `authenticated`.
4. Confirm the voice endpoints 401 without a bearer token.
5. Confirm the app renders under CSP with no console violations.
