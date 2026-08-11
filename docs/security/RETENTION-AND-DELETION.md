# Retention, Export & Deletion — v1.0

## Retention

| Material | Lifetime |
| --- | --- |
| Voice audio | Not persisted. Streamed to transcription and discarded. |
| Conversation turns with Athena | Retained while the account exists; distilled into facets. |
| Living Profile facets and history | Retained while the account exists (history is how understanding deepens). |
| Messages between members | Retained while both accounts exist. |
| Reflections and partner perception | Retained while the author's account exists. |
| Pair reasoning | Retained while both accounts exist; history is service-role only. |
| Outcome signals | Pseudonymous; purged when either participant deletes. |
| Notifications | Expire via `expires_at` / `obsolete_at`; cleared on deletion. |
| Audit log | Retained beyond deletion with the subject reference severed. |

## Export

Members may request their own data. Export covers Class 2-4 material the member
authored or that Athena holds about them, in a readable form. It never includes
another member's words, another member's perception of them, or Athena's
cross-member private reasoning. The `data_export` kill switch can suspend
generation during an incident.

## Deletion

`purgeMemberAndDeleteAuthUser()` in `src/lib/account.server.ts`:

1. removes pseudonymous outcome signals for every pair the member was part of
   (the pair token is recomputable, so it is de-identified, not anonymous);
2. removes every object under the member's prefix in the private
   `profile-photos` bucket plus any path recorded in `user_photos`;
3. deletes the auth user, driving the foreign-key cascade transactionally;
4. sweeps 33 member-keyed tables and reports any residual rows;
5. severs `admin_audit_log.subject_id` and records the completion.

A ban issued from moderation runs the identical purge.

Counterpart members keep their own rows: their reflections and messages are
their material, not the deleted member's.
