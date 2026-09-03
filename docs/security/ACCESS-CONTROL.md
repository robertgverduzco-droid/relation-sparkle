# Access Control, Administrative Access & Audit — v1.0

## Roles

| Role | Source | Reach |
| --- | --- | --- |
| `anon` | signed-out visitor | **no table privileges** (all revoked) |
| `authenticated` | signed-in member | only rows RLS scopes to `auth.uid()` |
| `moderator` | `user_roles` | safety reports and enforcement actions only |
| `admin` | `user_roles` | moderation plus the audit log and Athena self-evaluations |
| `founder` | `user_roles` | **no member data at all**; unlocks only the Founder Dialogue governance interface (see FOUNDER-DIALOGUE.md) |
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
  reasoning columns — including `status` and `confidence` — are unreadable at
  the database layer.
- `member_relational_signals` — no member or anon privileges at all, plus a
  RESTRICTIVE deny-all policy for `authenticated`; service-role only.
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

## Table grants (A-16, P2 remediation)

Grants now match this document rather than relying on RLS alone. The
`authenticated` role holds **no** privilege on operations- and admin-only
tables: `ops_alerts`, `ops_snapshots`, `banned_identifiers`,
`purge_tombstones`, `restore_reconciliations`, `step_up_grants`,
`athena_self_evaluations`, `founder_dialogue_messages`. All are reached
exclusively through the service-role client inside server functions.

`athena_outcome_signals` keeps `SELECT` for `authenticated` because the
admin review surface reads it through the member's own client; RLS restricts
that read to admins, and every write is service-role only.

`purge_tombstones`, `banned_identifiers`, `step_up_grants` and
`restore_reconciliations` have RLS enabled with no policies. That is the
intended deny-by-default posture for service-role-only tables, not a gap.

The same posture now covers the learning, observability and short-lived
credential tables: `athena_predictions`, `athena_prediction_outcomes`,
`athena_hypotheses`, `athena_hypothesis_evidence`, `athena_hypothesis_reviews`,
`athena_intelligence_versions`, `athena_experiments`, `athena_turn_decisions`,
`athena_closet_events`, `live_voice_grants` and
`personality_variant_overrides`. Their unused `authenticated`/`anon` grants
were revoked; every code path already reached them through the service-role
client inside verified server functions, so nothing member-facing changes.

## Column-level grants on `profiles` (A-08)

`profiles` deliberately has **no table-level `UPDATE`** for `authenticated`.
Member-editable columns are granted individually: `display_name`, `birth_date`,
`gender`, `pronouns`, `city`, `region`, `country`, `location_lat`,
`location_lng`, `bio`, `height_cm`, `ethnicities`, `ethnicity_self_describe`,
`religions`, `religion_self_describe`, `smoking`.

Server-owned columns (`onboarding_stage`, `onboarding_completed_at`,
`is_paused`, `learning_opt_out`, `is_synthetic`) are never granted; those
writes run through the service-role client inside a verified server function.

**Rule:** any new member-editable column on `profiles` must ship its own
`GRANT UPDATE (col) ... TO authenticated` in the same migration. Omitting it
produces `permission denied for table profiles` on the member's save even
though RLS would allow the row.

## Auth email links may not land on the route we asked for

Supabase redirects a confirmation to its fallback (the site root) whenever the
requested target is not on the project's redirect allow-list, and it strips the
path when it does so. A confirmation can therefore arrive at `/` with the
session — or an `otp_expired` error — in the fragment.

Two rules follow, and both are covered by tests:

1. Any route that receives auth link parameters hands them to `/auth-callback`
   (root-level rescue in `src/routes/__root.tsx`, plus the protected-layout
   rescue). Never render a page over an unconsumed link.
2. An `access_denied` / `otp_expired` result means the one-time link was already
   spent — usually by a desktop mail scanner prefetching it — not that the
   member did something wrong. The member is confirmed; send them to sign in.
