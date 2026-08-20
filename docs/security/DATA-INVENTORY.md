# Data Inventory & Classification — v1.0

Every table in the application database, its sensitivity class, who may read
it, and how it is handled. Classes are defined in `src/lib/security.server.ts`
(`DataClass`) so the code and this document cannot drift.

| Class | Meaning | Handling |
| --- | --- | --- |
| 1 Public | Product content, no member linkage | No special handling |
| 2 Identity | Member-visible identity | Owner-only RLS; shown to a counterpart only after a mutual connection |
| 3 Authored | What the member wrote or chose | Owner-only RLS; never logged; never used to train external models |
| 4 Understanding | Athena's private understanding of one member | Owner-only RLS; never shown to another member; audited on privileged access |
| 5 Restricted | Cross-member intelligence and safety material | Service-role or column-restricted; never returned raw to any member |

## Inventory

| Table | Class | Member read | Cross-member read | Notes |
| --- | --- | --- | --- | --- |
| `profiles` | 2 | own | via server-composed introduction only | display name, city, bio, pause state |
| `user_photos` | 2 | own | signed URLs only, after connection | private storage bucket |
| `user_prompts` | 3 | own | server-composed only | |
| `user_preferences` | 3 | own | never | seeking, intent, deal-breakers |
| `user_readiness` | 3 | own | never | |
| `messages` | 3 | conversation participants | participants only | content never logged |
| `conversations` | 3 | participants | participants | |
| `meeting_proposals` | 3 | connection participants | participants | |
| `notifications` | 3 | own | never | body kept non-revealing |
| `notification_preferences` | 3 | own | never | |
| `member_consents` | 3 | own | never | append-only |
| `interview_sessions` | 4 | own | never | legacy foundational transcript |
| `user_intelligence` | 4 | own | never | narrative understanding |
| `understanding_facets` | 4 | own | never | Living Profile facets |
| `facet_history` | 4 | own | never | append-only revision history |
| `topic_map` | 4 | own | never | coverage of life topics |
| `member_readiness` | 4 | own (state only) | never | reasoning is service-role |
| `athena_self_evaluations` | 4 | admin only | never | Athena's self-measurement |
| `athena_usage_log` | 4 | own | never | usage metering |
| `pair_reasoning` | 5 | column-limited (presentation only) | never | `reasoning`, `alignments`, `complementary`, `frictions`, `hard_conflicts` unreadable by members at the database layer |
| `pair_reasoning_history` | 5 | none | never | service-role only |
| `post_meeting_reflections` | 5 | author only | never | strictly private |
| `reflection_submissions` | 5 | author only | never | append-only |
| `partner_perception` | 5 | author only | never | the subject can never read it |
| `relationship_focus` | 5 | participants | participants | |
| `member_transitions` | 5 | own | never | ending choices |
| `connections` | 5 | participants | participants | |
| `introduction_responses` | 5 | own | never | |
| `introduction_feedback` | 5 | own | never | |
| `reports` | 5 | reporter + moderators | no | moderator reads are audited |
| `safety_flags` | 5 | subject + service | no | |
| `blocks` | 5 | blocker | never | the blocked member is never told |
| `athena_outcome_signals` | 5 | admin only | n/a | pseudonymous pair token, purged on deletion |
| `user_roles` | 4 | own | never | never stored on `profiles` |
| `admin_audit_log` | 5 | admin only | n/a | append-only; no update/delete grant |
| `security_kill_switches` | 1 | admin/founder only | n/a | state only; service-role writes and runtime reads |
| `synthetic_batches` | 1 | none | n/a | founder-only test provisioning; no member data |
| `synthetic_accounts` | 1 | none | n/a | fictional identities only; passwords never stored |

## Minimisation rules

- Athena stores understanding, not raw surveillance: transcripts are distilled
  into facets, and voice audio is never persisted (see AI-PRIVACY-BOUNDARY.md).
- Precise location (`location_lat` / `location_lng`) exists only to compute
  distance bands; distance is never shown as coordinates.
- No third-party analytics or advertising SDK may be added to this app.

## Deletion

`src/lib/account.server.ts` purges every table above plus private storage and
pseudonymous outcome signals, then deletes the auth user. Audit records survive
with their `subject_id` severed, which preserves accountability without
retaining a link to a deleted member.
