/**
 * ACL MANIFEST — the live grant surface held by the `authenticated` Postgres
 * role, captured from the database after V1 stabilization.
 *
 * This is a contract, not documentation. `acl-contracts.test.ts` fails the
 * build when application code performs a member-scoped write that the live
 * grants would reject, and when a write targets a column outside the granted
 * set. Regenerate with:
 *
 *   select c.relname,
 *     has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT'|'UPDATE')
 *   from pg_class c ... where n.nspname = 'public';
 *
 * Rule of the architecture: a tightened grant is never widened to make code
 * work. Legitimate member intent is validated server-side against the
 * member-scoped (RLS) client, and only then written with the service role.
 */

export type TableAcl = {
  /** Columns the `authenticated` role may INSERT. Empty = no INSERT at all. */
  insert: readonly string[];
  /** Columns the `authenticated` role may UPDATE. Empty = no UPDATE at all. */
  update: readonly string[];
  /** Whether the `authenticated` role may DELETE rows. */
  delete: boolean;
};

const none: TableAcl = { insert: [], update: [], delete: false };

const all = (cols: readonly string[], del = false): TableAcl => ({
  insert: cols,
  update: cols,
  delete: del,
});

export const AUTHENTICATED_ACL: Record<string, TableAcl> = {
  admin_audit_log: none,
  athena_outcome_signals: none,
  athena_self_evaluations: none,
  athena_usage_log: {
    insert: [
      "billed_at",
      "created_at",
      "id",
      "input_tokens",
      "kind",
      "metadata",
      "model",
      "output_tokens",
      "seconds",
      "user_id",
    ],
    update: [],
    delete: false,
  },
  banned_identifiers: none,
  blocks: {
    insert: ["blocked_id", "blocker_id", "created_at", "id", "reason"],
    update: [],
    delete: true,
  },
  connections: none,
  conversations: { insert: [], update: ["hidden_by"], delete: false },
  data_export_requests: none,
  enforcement_actions: none,
  enforcement_appeals: {
    insert: [
      "action_id",
      "created_at",
      "id",
      "reviewed_at",
      "reviewer_id",
      "reviewer_note",
      "statement",
      "status",
      "user_id",
    ],
    update: [],
    delete: false,
  },
  entitlement_events: none,
  facet_history: none,
  founder_dialogue_messages: none,
  interview_sessions: {
    insert: ["completed_at", "created_at", "messages", "updated_at", "user_id"],
    update: ["messages"],
    delete: false,
  },
  introduction_attraction: none,
  introduction_feedback: none,
  introduction_responses: none,
  meeting_proposals: {
    insert: [
      "completed_at",
      "confirmed_at",
      "connection_id",
      "created_at",
      "id",
      "notes",
      "proposed_by",
      "scheduled_for",
      "status",
      "updated_at",
      "when_text",
      "where_text",
    ],
    update: [],
    delete: false,
  },
  member_consents: {
    insert: ["consent_key", "created_at", "granted", "id", "source", "user_id", "version"],
    update: [],
    delete: false,
  },
  member_readiness: none,
  member_transitions: none,
  membership_entitlements: none,
  messages: {
    insert: [
      "body",
      "conversation_id",
      "created_at",
      "flagged_severity",
      "id",
      "kind",
      "metadata",
      "read_at",
      "sender_id",
    ],
    update: ["read_at"],
    delete: false,
  },
  notification_preferences: all(
    [
      "athena",
      "created_at",
      "email_enabled",
      "introductions",
      "messages",
      "product_updates",
      "reflection",
      "relationship",
      "updated_at",
      "user_id",
    ],
    true,
  ),
  notifications: none,
  ops_alerts: none,
  ops_snapshots: none,
  pair_reasoning: none,
  pair_reasoning_history: none,
  partner_perception: none,
  post_meeting_reflections: none,
  profiles: {
    insert: [],
    update: [
      "bio",
      "birth_date",
      "city",
      "country",
      "display_name",
      "drinking",
      "ethnicities",
      "ethnicity_self_describe",
      "gender",
      "height_cm",
      "hobbies",
      "hobbies_note",
      "location_lat",
      "location_lng",
      "pronouns",
      "region",
      "religion_self_describe",
      "religions",
      "smoking",
    ],
    delete: false,
  },
  purge_tombstones: none,
  rate_limit_counters: none,
  reflection_submissions: none,
  relationship_focus: none,
  reports: {
    insert: [
      "category",
      "conversation_id",
      "created_at",
      "details",
      "id",
      "reported_id",
      "reporter_id",
      "resolution_note",
      "resolved_at",
      "resolved_by",
      "severity",
      "status",
    ],
    update: ["resolution_note", "resolved_at", "resolved_by", "status"],
    delete: false,
  },
  restore_reconciliations: none,
  safety_flags: none,
  security_kill_switches: none,
  step_up_grants: none,
  synthetic_accounts: none,
  synthetic_batches: none,
  topic_map: none,
  understanding_facets: none,
  understanding_revisions: {
    insert: [
      "created_at",
      "facet_key",
      "id",
      "member_statement",
      "previous_confidence",
      "previous_understanding",
      "revision_kind",
      "user_id",
    ],
    update: [],
    delete: false,
  },
  user_intelligence: none,
  user_photos: {
    insert: [
      "alt_text",
      "created_at",
      "id",
      "is_primary",
      "moderation",
      "position",
      "storage_path",
      "user_id",
    ],
    update: ["alt_text", "is_primary", "position"],
    delete: true,
  },
  user_preferences: all(
    [
      "additional_notes",
      "age_max",
      "age_min",
      "age_strength",
      "children_strength",
      "created_at",
      "deal_breakers",
      "drinking_openness",
      "ethnicity_openness",
      "height_max_cm",
      "height_min_cm",
      "height_strength",
      "important_values",
      "lifestyle_notes",
      "max_distance_km",
      "preferred_drinking",
      "preferred_ethnicities",
      "preferred_religions",
      "preferred_smoking",
      "relationship_intent",
      "religion_openness",
      "seeking_genders",
      "smoking_openness",
      "updated_at",
      "user_id",
      "wants_children",
    ],
    true,
  ),
  user_prompts: all(
    ["answer", "created_at", "id", "position", "prompt_key", "prompt_text", "updated_at", "user_id"],
    true,
  ),
  user_readiness: all(
    [
      "clarity_of_want",
      "created_at",
      "emotional_availability",
      "healing_notes",
      "overall_score",
      "ready_reflection",
      "time_availability",
      "updated_at",
      "user_id",
    ],
    true,
  ),
  user_roles: none,
};

/** True when the `authenticated` role can perform this operation at all. */
export function memberMayWrite(table: string, op: "insert" | "update" | "delete"): boolean {
  const acl = AUTHENTICATED_ACL[table];
  if (!acl) return false;
  if (op === "delete") return acl.delete;
  return acl[op].length > 0;
}
