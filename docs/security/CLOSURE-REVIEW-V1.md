# Privacy, Security & Operational Closure Review — V1

Status date: 2026-08-11. Scope: the whole Relationship Intelligence platform and
Athena runtime, before Member Experience Architecture begins.

Rules for this document: every line is either **Closed** (implemented and
verifiable in this repository), **Partial** (some of it exists, the rest is
named), **Not implemented**, or **Unmeasurable** (cannot be verified from
inside this system today). Nothing is estimated. Where a domain is not built,
it says so plainly rather than describing an intention as a state.

---

## 1. Authentication and account recovery

| Item | Status |
| --- | --- |
| Email/password + Google sign-in | Closed |
| Email verification gate before any member surface | Closed (`src/routes/_authenticated/route.tsx`) |
| Bearer-token forwarding to protected server fns | Closed (`src/start.ts`) |
| Step-up reauthentication for destructive actions | Closed (`src/lib/step-up.server.ts`, 5-minute single-use grants) |
| Remote sign-out of all devices | Closed (`src/lib/session-safety.functions.ts`) |
| Device-local app lock | Closed (`src/components/app-lock.tsx`) |
| **Password reset / forgotten-password flow** | **Not implemented.** There is no `/reset-password` route and no `resetPasswordForEmail` call anywhere in `src/`. A member who forgets their password today has no self-service recovery path. This is a P0 gap. |
| Account recovery after loss of email access | Not implemented. No secondary factor, no recovery contact, no operator-assisted recovery procedure exists. |
| MFA / TOTP | Not implemented; not in V1 scope, recorded here so it is not assumed. |
| Session inactivity expiry / max session lifetime | Not implemented. Supabase refresh-token defaults apply and have not been tuned. |

## 2. Encryption and secrets

| Item | Status |
| --- | --- |
| TLS everywhere, HSTS (2-year, preload), `upgrade-insecure-requests` | Closed (`src/server.ts`) |
| At-rest encryption of database, storage, backups | Closed at the platform layer. **Unmeasurable from inside the app** — we cannot assert key rotation cadence or cipher from here; it is a processor assurance, not a fact we hold. |
| Application-layer field encryption of Class 5 | Not implemented, deliberately. Athena must reason over plaintext; protection is column grants + service-role isolation (ARCHITECTURE-V1 §3). |
| Secrets read only inside handlers, never at module scope | Closed (`ai-gateway.server.ts`, `client.server.ts`, audited across `src/lib`) |
| Secrets never logged | Closed by construction (`redact()` strips secret-shaped keys) |
| Secret rotation procedure | Partial. Documented in INCIDENT-RESPONSE §Credential rotation; never rehearsed. No rotation has been performed. |
| `OPS_HEARTBEAT_SECRET`, `OPS_ALERT_WEBHOOK_URL` | Not configured, at your instruction. Heartbeat is inert until then. |

## 3. Logging and telemetry

| Item | Status |
| --- | --- |
| `redact()` / `safeLog()` with secret + Class 3-5 collapse | Closed (`src/lib/security.server.ts`) |
| No analytics, advertising, or engagement telemetry | Closed — none exists in the codebase. |
| Error capture without member content | Partial. `src/lib/error-capture.ts` and `lovable-error-reporting.ts` forward stack traces to the platform error channel; stacks are not redacted through `redact()`. A thrown error whose message embeds member text would carry it. **P1.** |
| Platform-level request logs (Worker, database) | **Unmeasurable.** We do not control retention or field content of the hosting provider's request logs and cannot assert what they hold. |
| Log retention period | Unmeasurable for the same reason. No app-controlled log store exists. |

## 4. Third-party processors

Current processors, complete list:

| Processor | Data reaching it | Status |
| --- | --- | --- |
| Supabase (managed Postgres, Auth, Storage) | All classes | Closed as a boundary; **no DPA reviewed by counsel** |
| Lovable AI Gateway → model provider | Conversation text, Athena's derived understanding, pair reasoning | Closed technically (no-training, no-retention configuration; AI-PRIVACY-BOUNDARY.md). **Unmeasurable:** we cannot independently verify non-retention; it is a contractual assurance. |
| Cloudflare (Worker runtime, TLS) | Request metadata, all in-transit content | Closed as a boundary; no DPA reviewed |
| Google (OAuth sign-in only) | Email, name, avatar at sign-in | Closed |
| Speech-to-text / text-to-speech provider (via gateway) | Raw member audio, transcripts | Closed technically; audio is never persisted by us (verified in `src/routes/api/stt.ts`, `tts.ts`) |

Sub-processor list published to members: **Not implemented.** `src/routes/privacy.tsx` describes categories, not named processors.

## 5. AI context minimisation

| Item | Status |
| --- | --- |
| Prompt boundary prepended to every Athena prompt | Closed (`PROMPT_BOUNDARY`) |
| Member text wrapped as untrusted data | Closed (`asMemberData()`) |
| Counterpart Class 5 material never sent in a member-facing prompt | Closed; pair reasoning is service-role only and only `presentation_a/b` reaches a member surface |
| Living Profile summarised (understanding, not raw transcript) into prompts | Closed (`summarizeLivingProfile`) |
| **Hard per-request context budget / measured token accounting** | Not implemented. Nothing caps how much accumulated understanding enters a single prompt; growth over a long membership is unbounded. **P1.** |
| Verified minimisation audit (what actually left, per call) | **Unmeasurable today.** `athena_usage_log` records usage, not the assembled prompt payload; we deliberately do not persist prompts, so we cannot retrospectively prove what was sent. |

## 6. Backup and restore verification

| Item | Status |
| --- | --- |
| Backups exist, encrypted at rest | Platform-provided |
| Documented 30-day backup expiry / deletion tombstone rule | Closed (RETENTION-AND-DELETION.md) |
| **Restore rehearsal** | **Never performed.** No restore has been executed or timed. RPO and RTO are therefore unknown, not estimated. **P1 before beta.** |
| Verification that a deleted member does not reappear after a restore | Not implemented. The tombstone re-purge job that must run after any restore is specified in doctrine but has no code. **P0 if any restore is ever performed.** |

## 7. Data-classification enforcement

| Item | Status |
| --- | --- |
| Five-class model, table→class map | Closed (`security.server.ts`, DATA-INVENTORY.md) |
| RLS on every member-facing public table, `anon` grants revoked | Closed |
| Column-level restriction of pair reasoning internals | Closed |
| Audit entries carry data class | Closed |
| **Automated drift check** (new table created without class, grants, or RLS) | Not implemented. Enforcement is currently review discipline, not a test. **P2.** |

## 8. Messaging

| Item | Status |
| --- | --- |
| Messages scoped to conversation participants by RLS | Closed |
| Read receipts never counterpart-visible (F-09) | Closed |
| Blocking, reporting, conversation hiding | Closed |
| Messaging kill switch | Closed |
| Message content excluded from logs and Founder Dialogue | Closed |
| Attachments / images in messages | Not implemented (no attachment surface exists) |
| Client-side or end-to-end encryption of messages | Not implemented, deliberate — moderation and safety review require server-readable content. Recorded as an accepted risk. |

## 9. Notification and email privacy

| Item | Status |
| --- | --- |
| In-app notifications, per-member RLS, preference table | Closed |
| Notification kill switch | Closed |
| Notification bodies contain no Class 4/5 content | Closed by review of `notifications.server.ts` call sites |
| **Outbound email of any kind** | Not implemented. The app sends no transactional email; only Supabase Auth's own verification/OAuth mail leaves the system, on default templates. |
| Auth email template content review (no member data, correct sender identity) | Not done. Templates are platform defaults. **P1.** |
| Push notifications | Not implemented. |

## 10. Payment isolation

Not implemented — there is no payment provider, no billing code, no price
objects, and no subscription state in the schema. The business documents under
`docs/business/` describe intended packaging only. F-18 (neutral billing
descriptors) is therefore a recorded decision awaiting a system to apply it to.
Nothing here is at risk today because nothing exists.

## 11. Consent

| Item | Status |
| --- | --- |
| `member_consents` table (Class 3, RLS) | Closed — schema exists |
| **Consent capture at sign-up or first conversation** | **Not implemented.** No code writes to `member_consents`; the table is empty by construction. Terms and Privacy pages exist and are linked but acceptance is not recorded, versioned, or timestamped. **P0 before beta.** |
| Versioned policy text with effective dates | Not implemented. `terms.tsx` / `privacy.tsx` carry no version identifier. |
| Withdrawal of consent path | Not implemented separately; account deletion is the only exit. |

## 12. Member-facing privacy requirements

| Item | Status |
| --- | --- |
| Complete account and data deletion | Closed (`account.server.ts`, full purge + auth user removal, step-up gated) |
| Pause / Rest distinct from abandonment (F-01) | Closed |
| Location generalised to metro area (F-05, F-06) | Closed |
| Declined introductions never disclosed (F-08) | Closed |
| Partner-perception sealed, self-understanding preserved (F-07) | Closed |
| **Data export / portability** | **Not implemented.** A `data_export` kill switch exists but there is no export generator, no format, and no delivery path. **P1.** |
| Member-visible record of what Athena believes about them | Not implemented. Doctrine (F-13, F-14) defines Change / Correction / Removal and the stated-vs-inferred distinction; no UI exposes the Living Profile for review or correction. **P1 — this is the largest member-facing privacy gap.** |
| Plain-language privacy page | Closed as a page; content not reviewed by counsel |

## 13. Administrative security

| Item | Status |
| --- | --- |
| Roles in `user_roles`, `has_role()` hardened to self-or-admin | Closed |
| `admin_audit_log`, purpose recorded for Class 4/5 access | Closed |
| Moderator surface gated on role, server-side | Closed |
| Enforcement ladder with hashed ban identifiers (F-17) | Closed (`enforcement.server.ts`) |
| Founder Dialogue holds no member private data | Closed (20-record floor, reconstruction screening) |
| **Audit log review cadence** | Not implemented as a practice. Single-operator model (F-10) means self-review; no scheduled read, no alert on anomalous privileged access. **P2.** |
| Break-glass procedure for service-role use outside normal paths | Not documented. |

## 14. Security operations

| Item | Status |
| --- | --- |
| Six kill switches, no-deploy activation | Closed |
| Severity model and incident sequence | Closed (INCIDENT-RESPONSE.md) |
| `ops_snapshots`, `ops_alerts`, deduplicated alerting, `ops_db_stats()` | Closed |
| Heartbeat endpoint with timing-safe secret check | Closed in code, **inactive** — secrets not configured, no scheduler attached, so no snapshot has ever been written. |
| Alert delivery | Not active (no webhook URL). |
| On-call / response-time commitment | Not defined. Single operator; no stated response window. |
| Incident log | Empty — no incidents to date. |

## 15. Pre-beta adversarial testing

`docs/security/SECURITY-TESTING.md` defines the probe set. Execution status:

| Probe class | Status |
| --- | --- |
| Cross-member read attempts against RLS (pair reasoning, reflections, perception) | Reasoned through during Wave 1 and the threat model; **not executed as automated tests.** |
| Prompt-injection attempts against Athena | Boundary implemented; **not adversarially tested against the live model.** |
| Auth bypass on protected routes and server fns | Not executed. |
| Storage object access without ownership | Not executed. |
| Rate-limit and abuse testing | Not executed. |
| Dependency vulnerability scan | Not executed. |

There is **no automated security test suite in this repository.** Every control
above is verified by code reading, not by a test that would fail on regression.
This is the single largest operational gap in the closure review. **P0 before
beta.**

## 16. Legal dependencies

None of the following exist, and none can be produced from inside this system:

- Reviewed Privacy Policy and Terms of Service (current pages are engineering drafts).
- Data Processing Agreements with Supabase, Cloudflare, and the AI gateway/model provider.
- Lawful-basis determination and, where applicable, GDPR/UK-GDPR records of processing.
- Jurisdictional analysis for the sensitivity class of this data (inner-life material may attract special-category treatment in the EU).
- Breach-notification thresholds per jurisdiction; INCIDENT-RESPONSE currently commits to notification unconditionally, which is stricter than most law and should stay, but the legal minimum is unknown.
- Age assurance and minor-exclusion position.
- Retention limits that law imposes on us, as distinct from the ones we chose.

DECISION-REGISTER.md carries 17 questions for counsel. None have been answered.

---

## 17. Final queue

**P0 — must close before any member other than you uses the system**

1. Password reset / account recovery flow (§1). No recovery path exists today.
2. Consent capture and policy versioning written to `member_consents` (§11).
3. Automated security test suite covering RLS cross-member reads, auth bypass, and storage ownership (§15).
4. Post-restore re-purge job for deleted members, before any restore is ever performed (§6).

**P1 — must close before beta**

5. Member-visible Living Profile with Change / Correction / Removal (§12).
6. Data export / portability generator (§12).
7. Restore rehearsal with measured RPO/RTO (§6).
8. Redact error-capture payloads through `redact()` (§3).
9. Per-request AI context budget (§5).
10. Auth email template review and sender identity (§9).
11. Live prompt-injection adversarial pass against Athena (§15).

**P2 — before general availability**

12. Automated data-classification drift check on new tables (§7).
13. Audit-log review cadence and anomalous-access alerting (§13).
14. Published sub-processor list (§4).
15. Break-glass procedure for service-role use (§13).
16. Session lifetime and inactivity policy (§1).

**P3 — deferred, recorded so they are not forgotten**

17. MFA / TOTP (§1).
18. Application-layer encryption if Athena's reasoning ever moves server-local (§2).
19. Payment isolation work, when payments exist (§10).
20. Push notification privacy model, when push exists (§9).

**Blocked on you or on counsel, not on engineering**

- Operational secrets for the heartbeat (`OPS_HEARTBEAT_SECRET`, `OPS_ALERT_WEBHOOK_URL`) — deliberately deferred at your instruction; monitoring is inert until they exist.
- All of §16.

---

## 18. Honest summary

The compartmentalisation work is genuinely done: no member can read another
member's inner life, deletion is complete, privileged access is recorded, and
Athena's prompt boundary holds by construction. What is *not* done is the
proof: nothing here is tested automatically, monitoring has never produced a
single measurement, no restore has ever been attempted, and consent has never
been recorded. A system that holds this material should be able to demonstrate
its guarantees, not only argue them. That is the work between here and beta.
