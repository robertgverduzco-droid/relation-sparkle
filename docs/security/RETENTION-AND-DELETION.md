# Retention, Export & Deletion — v1.0

## Permanent Member Deletion Principle (binding)

When a member permanently deletes their account, Relationship Intelligence
deletes **all personally attributable information about that member across the
complete system**. This covers information the member directly provided,
generated through use of the app, caused Athena to infer, or that any system
created about them — including the Living Profile, understanding facets and
facet history, inferred attributes, readiness state, introduction and
relationship history, meeting information, reflections, conversation
reflections, partner perceptions authored by them, relationship-focus records,
messages, transcripts, any retained audio, notifications, member-linked
self-evaluation records, member-linked operational records, storage objects,
identifiable logs where retention is not legally required, and identifiable
third-party copies where a deletion capability exists.

Two rules govern what may remain:

1. **A swapped identifier is not anonymity.** If information stays reasonably
   reconnectable to the member — including via a recomputable pseudonym such as
   the salted `pair_token` — it is member information and must be deleted.
2. **Only irreversibly anonymized information may remain**, and only where
   governing doctrine and law permit its retention.

Deletion of safety and moderation material follows the same rule wherever
deletion is legally permitted; where law requires retention, the record is
retained in the narrowest identifiable form (see *Audit log* below).

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
4. sweeps every member-keyed table in `MEMBER_KEYED_TABLES` and reports any
   residual rows;
5. severs `admin_audit_log.subject_id` and records the completion.

A ban issued from moderation runs the identical purge.

Counterpart members keep their own rows: their reflections and messages are
their material, not the deleted member's.

## Backups

- Deletion from **active systems is prompt** — it happens synchronously in the
  request that confirms the deletion, not on a queue.
- Managed platform backups (point-in-time recovery plus daily snapshots) are
  encrypted at rest and **expire on a fixed schedule of 30 days**. Backups are
  never promoted to an archive, never exported to secondary storage, and are
  never mined for analytics. No backup may become a permanent undeletable
  archive of intimate member information.
- **Deletion tombstones.** Every completed purge writes an
  `account.purge.completed` entry to `admin_audit_log` carrying the deleted
  member id in metadata form until the last backup that could contain that
  member expires. If a restore from an older backup occurs, the restore
  runbook (INCIDENT-RESPONSE.md) requires replaying every purge recorded after
  the backup's timestamp **before the restored database is returned to
  production traffic**, so previously deleted information can never silently
  reappear.
- Once the backup window has passed the tombstone's subject reference is
  severed like every other audit row.

## Third parties

| Processor | Identifiable member information received | Deletion mechanism |
| --- | --- | --- |
| Managed Postgres / storage / auth platform | All member data at rest | Deletion propagates transactionally; backups expire on the schedule above |
| AI gateway → model provider | Conversation text and Living Profile excerpts at inference time, under a no-training, no-retention configuration | No retained copy exists to delete; usage metering is member-keyed on our side and purged with the account |
| Speech-to-text / text-to-speech | Audio and text in transit only | Not retained by configuration; nothing to delete |
| Email delivery (auth and transactional) | Email address and message metadata | Deleted with the auth user; provider logs expire on the provider's schedule |

No analytics, advertising, attribution, or session-replay processor exists in
this app, by design. Any new processor must be added to this table together
with its deletion mechanism or contractual deletion requirement **before** it
receives identifiable data. Permanent member deletion must propagate to every
applicable processor where technically and legally required.

## New-system requirement (invariant)

No future table, storage bucket, AI-processing system, analytics system,
notification system, or product feature is production-ready until:

1. its member-deletion behaviour is defined in writing here;
2. it is either covered by an `ON DELETE CASCADE` to `auth.users` **and**
   listed in `MEMBER_KEYED_TABLES` in `src/lib/account.server.ts`, or purged by
   an explicit step in `purgeMemberAndDeleteAuthUser()`;
3. its class is recorded in `DATA-INVENTORY.md` and `TABLE_CLASS` in
   `src/lib/security.server.ts`;
4. any third party it introduces appears in the table above.

Permanent deletion is a system-wide invariant, not a feature.
