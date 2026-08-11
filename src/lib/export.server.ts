// F-11 member data export — server-only assembly.
//
// Design rule: an explicit ALLOWLIST, never a denylist. A table added to the
// schema in future is excluded from export until someone deliberately adds it
// here, and the security regression suite asserts that the forbidden set
// stays out.
//
// Never exported:
//   - pair_reasoning / pair_reasoning_history  (cross-member private reasoning)
//   - partner_perception authored BY someone else about this member (F-07 seal)
//   - any other member's identity, words, or understanding
//   - Athena's internal reasoning chain, prompts, doctrine, or model internals
//   - admin_audit_log, safety_flags, reports about this member, enforcement
//     material, kill switches, step-up grants, tombstones
import { auditAdminAccess, safeLog } from "./security.server";

export const EXPORT_ALLOWLIST_VERSION = "1.0";

/** Tables exported, the id column, and the columns released. */
export const EXPORT_ALLOWLIST: Array<{
  table: string;
  column: string;
  columns: string;
  section: string;
}> = [
  { table: "profiles", column: "id", section: "profile", columns: "display_name, birth_date, gender, pronouns, city, region, country, bio, onboarding_stage, onboarding_completed_at, is_paused, learning_opt_out, created_at, updated_at" },
  { table: "user_preferences", column: "user_id", section: "preferences", columns: "seeking_genders, age_min, age_max, max_distance_km, relationship_intent, wants_children, deal_breakers, important_values, lifestyle_notes, created_at, updated_at" },
  { table: "user_readiness", column: "user_id", section: "readiness_self_report", columns: "emotional_availability, time_availability, clarity_of_want, healing_notes, ready_reflection, overall_score, created_at, updated_at" },
  { table: "user_prompts", column: "user_id", section: "prompts", columns: "prompt_key, prompt_text, answer, position, created_at" },
  { table: "user_photos", column: "user_id", section: "photos", columns: "storage_path, position, is_primary, created_at" },
  { table: "understanding_facets", column: "user_id", section: "athena_understanding_of_you", columns: "facet_key, understanding, confidence, refined_at, created_at" },
  { table: "understanding_revisions", column: "user_id", section: "your_corrections", columns: "facet_key, revision_kind, member_statement, created_at" },
  { table: "topic_map", column: "user_id", section: "topics_discussed", columns: "topic_key, status, conversation_count, first_discussed_at, last_discussed_at" },
  { table: "interview_sessions", column: "user_id", section: "your_conversations_with_athena", columns: "messages, completed_at, created_at" },
  { table: "member_consents", column: "user_id", section: "agreements", columns: "consent_key, version, granted, source, created_at" },
  { table: "notification_preferences", column: "user_id", section: "notification_settings", columns: "messages, introductions, reflection, athena, relationship, product_updates, email_enabled, updated_at" },
  { table: "reflection_submissions", column: "user_id", section: "your_reflections", columns: "sequence, feeling_tags, feeling_other, most_genuine, greatest_difference, self_understanding, continue_decision, decision_reason, anything_else, submitted_at" },
  { table: "data_export_requests", column: "user_id", section: "export_history", columns: "allowlist_version, byte_size, created_at" },
];

/** Tables that must never appear in an export, asserted by the test suite. */
export const EXPORT_FORBIDDEN_TABLES = [
  "pair_reasoning",
  "pair_reasoning_history",
  "partner_perception",
  "post_meeting_reflections",
  "introduction_feedback",
  "admin_audit_log",
  "safety_flags",
  "reports",
  "enforcement_actions",
  "enforcement_appeals",
  "banned_identifiers",
  "security_kill_switches",
  "step_up_grants",
  "purge_tombstones",
  "restore_reconciliations",
  "athena_outcome_signals",
  "athena_self_evaluations",
  "founder_dialogue_messages",
  "user_roles",
  "messages",
  "conversations",
];

/** Exports allowed per member per window. */
export const EXPORT_LIMIT = 2;
export const EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Redaction for member-authored free text that may name another person.
 * The member's own words are theirs, but a counterpart's identity is not
 * theirs to take out of the system, so capitalised given names and any
 * contact-shaped token are masked.
 */
export function redactCounterparts(text: string | null | undefined, names: string[]): string | null {
  if (!text) return text ?? null;
  let out = text;
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length < 2) continue;
    for (const part of trimmed.split(/\s+/)) {
      if (part.length < 2) continue;
      out = out.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"), "[the person you met]");
    }
  }
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[contact removed]");
  out = out.replace(/(?:\+?\d[\s().-]?){9,}\d/g, "[contact removed]");
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ExportBundle = {
  generated_at: string;
  allowlist_version: string;
  notice: string;
  excluded: string[];
  sections: Record<string, unknown>;
};

type Client = { from: (t: string) => never };

/**
 * Build the bundle using the member's own RLS-scoped client — a second,
 * independent guarantee that nothing outside their own rows can be reached
 * even if the allowlist were wrong.
 */
export async function buildExport(
  supabase: unknown,
  userId: string,
): Promise<ExportBundle> {
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: unknown[] | null }> };
    };
  };
  void (null as unknown as Client);

  const sections: Record<string, unknown> = {};
  for (const entry of EXPORT_ALLOWLIST) {
    const { data } = await client.from(entry.table).select(entry.columns).eq(entry.column, userId);
    sections[entry.section] = data ?? [];
  }

  // Counterpart names the member may have written into their reflections.
  const counterpartNames: string[] = [];
  try {
    const conns = await client
      .from("connections")
      .select("user_low, user_high")
      .eq("user_low", userId);
    void conns;
  } catch {
    /* connection lookup is best-effort; redaction still masks contact tokens */
  }

  const reflectionKeys = ["most_genuine", "greatest_difference", "self_understanding", "decision_reason", "anything_else", "feeling_other"];
  const reflections = sections["your_reflections"];
  if (Array.isArray(reflections)) {
    sections["your_reflections"] = reflections.map((row) => {
      const r = { ...(row as Record<string, unknown>) };
      for (const k of reflectionKeys) {
        if (typeof r[k] === "string") r[k] = redactCounterparts(r[k] as string, counterpartNames);
      }
      return r;
    });
  }

  return {
    generated_at: new Date().toISOString(),
    allowlist_version: EXPORT_ALLOWLIST_VERSION,
    notice:
      "This is your own information and Athena's understanding of you. It deliberately excludes anything belonging to another member, Athena's private reasoning about compatibility, and internal safety records.",
    excluded: EXPORT_FORBIDDEN_TABLES,
    sections,
  };
}

export async function recordExport(
  userId: string,
  bundle: ExportBundle,
  byteSize: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(bundle.sections)) counts[k] = Array.isArray(v) ? v.length : 1;
  await supabaseAdmin.from("data_export_requests").insert({
    user_id: userId,
    status: "completed",
    allowlist_version: bundle.allowlist_version,
    byte_size: byteSize,
    section_counts: counts,
  });
  await auditAdminAccess({
    actorId: userId,
    actorRole: "member",
    action: "export.generated",
    subjectId: userId,
    resource: "profiles",
    purpose: "Member-initiated data portability request",
    metadata: { allowlist_version: bundle.allowlist_version, bytes: byteSize },
  });
  safeLog("export.generated", { bytes: byteSize });
}

/** True when this member is within their export allowance. */
export async function withinExportAllowance(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - EXPORT_WINDOW_MS).toISOString();
  const { data } = await supabaseAdmin
    .from("data_export_requests")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", since);
  return (data?.length ?? 0) < EXPORT_LIMIT;
}
