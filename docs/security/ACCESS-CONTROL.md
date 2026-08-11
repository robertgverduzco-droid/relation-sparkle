# Access Control, Administrative Access & Audit — v1.0

## Roles

| Role | Source | Reach |
| --- | --- | --- |
| `anon` | signed-out visitor | **no table privileges** (all revoked) |
| `authenticated` | signed-in member | only rows RLS scopes to `auth.uid()` |
| `moderator` | `user_roles` | safety reports and enforcement actions only |
| `admin` | `user_roles` | moderation plus the audit log and Athena self-evaluations |
| `service_role` | server-only key | full access; used exclusively inside server handlers |

Roles are never stored on `profiles`. Checks go through the
`public.has_role(uuid, app_role)` `SECURITY DEFINER` function, which answers
only about the caller unless the caller is an admin.

## RLS model

Every table in `public` has RLS enabled with explicit grants. The dominant
pattern is owner-scoped (`auth.uid() = user_id`). Participant-scoped tables
(`conversations`, `messages`, `connections`, `meeting_proposals`,
`relationship_focus`) test membership of the pair.

Two tables are deliberately harder:

- `pair_reasoning` — members hold column-level `SELECT` on presentation columns
  only, and only once the pair has been presented to them. Athena's private
  reasoning columns are unreadable at the database layer.
- `pair_reasoning_history` — `USING (false)` for members; service-role only.

## Administrative access

There is no administrative UI that browses member understanding. The only
privileged member-facing surface is `/moderation`, which:

1. verifies the moderator or admin role server-side before any read;
2. reads reports only — never `understanding_facets`, `user_intelligence`,
   `post_meeting_reflections`, or `partner_perception`;
3. writes an `admin_audit_log` entry for every list and every enforcement
   action, carrying actor, subject, data class, and purpose.

Service-role access is confined to server handlers and is used only for
cross-member reasoning, notification delivery, readiness evaluation, and
deletion. `auditAdminAccess()` records privileged actions taken on a member's
behalf or against their account.

## Audit log

`admin_audit_log` is append-only by construction: `authenticated` holds
`SELECT` only (gated to admins by policy) and there is no update or delete
grant to any member-facing role. Entries carry the redacted metadata only —
never member content.

On account deletion the audit rows survive with `subject_id` set to null: the
accountability record for a privileged action outlives the account, but stops
identifying a deleted person.

## Consent

`member_consents` records each agreement separately (terms, privacy, AI
processing, location, notifications) with its version, source and timestamp.
Consent is append-only; a withdrawal is a new row with `granted = false`.
