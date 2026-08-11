# Incident Response — v1.0

## Kill switches

`security_kill_switches` (readable by signed-in members, writable only by
service-role code) gates six subsystems. Flipping a row takes effect on the
next request — no deploy required.

| Key | Effect when disabled |
| --- | --- |
| `matchmaking` | `runMatchmakingForUser` returns without reasoning about anyone |
| `messaging` | `sendMessage` refuses with a calm member-facing message |
| `athena_conversation` | voice endpoints refuse; conversation paused |
| `account_creation` | new sign-ups blocked |
| `data_export` | export generation suspended |
| `notifications` | `notify()` creates nothing |

## Severity

| Level | Definition | First action |
| --- | --- | --- |
| SEV-1 | Class 4/5 material exposed to the wrong person, or credential compromise | Disable the affected switch immediately, then investigate |
| SEV-2 | Authorisation defect with no confirmed exposure | Patch within the day; audit the access log for the affected rows |
| SEV-3 | Hardening gap, no exposure path | Scheduled remediation |

## Sequence

1. **Contain** — kill switch, then revoke or rotate credentials if implicated.
2. **Assess** — query `admin_audit_log` for privileged access in the window;
   determine which members and which data classes were reachable.
3. **Remediate** — fix the defect, add the regression check to
   `SECURITY-TESTING.md`.
4. **Notify** — for any confirmed exposure of Class 3-5 material, notify the
   affected members directly and plainly: what was exposed, when, what we did,
   what they should do. No euphemism. This obligation is not conditional on a
   legal threshold.
5. **Record** — append the incident and its resolution to this document's log.

## Credential rotation

Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) are read only
inside server handlers and never logged. Rotation is a platform operation; no
code change is required because nothing caches them at module scope beyond a
lazily constructed client.

## Incident log

_None to date._
