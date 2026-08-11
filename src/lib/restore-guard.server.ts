// Deleted-member restore protection.
//
// Doctrine: docs/security/RETENTION-AND-DELETION.md — "a restored backup must
// never resurrect a member who exercised permanent deletion".
//
// Mechanism: at purge time we write a tombstone containing only a keyed hash
// of the member id (never the id itself, so the tombstone table is not a
// register of who left). After any restore, every member id present in the
// restored data is hashed with the same key and compared against the
// tombstones; matches are re-purged before the data returns to service.
//
// The hash is deterministic under a stable key, which is exactly what makes
// replay possible. Rotating ATHENA_LEARNING_SALT invalidates tombstones —
// see the runbook note in RETENTION-AND-DELETION.md.
import { createHmac } from "crypto";
import { safeLog, auditAdminAccess } from "./security.server";

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export function subjectHash(userId: string): string {
  const salt =
    process.env["ATHENA_LEARNING_SALT"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    "athena-local-salt";
  return createHmac("sha256", salt).update(`tombstone:${userId}`).digest("hex");
}

/** Record that this member exercised permanent deletion. Idempotent. */
export async function writePurgeTombstone(
  userId: string,
  reason: "member_request" | "enforcement" | "operator" = "member_request",
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("purge_tombstones")
    .upsert({ subject_hash: subjectHash(userId), reason }, { onConflict: "subject_hash" });
  safeLog("deletion.tombstone_written", { reason });
}

/** Tables scanned for resurrected members, and the id columns to check. */
const SUBJECT_COLUMNS: Array<[table: string, columns: string[]]> = [
  ["profiles", ["id"]],
  ["user_intelligence", ["user_id"]],
  ["user_preferences", ["user_id"]],
  ["user_readiness", ["user_id"]],
  ["member_readiness", ["user_id"]],
  ["understanding_facets", ["user_id"]],
  ["facet_history", ["user_id"]],
  ["understanding_revisions", ["user_id"]],
  ["topic_map", ["user_id"]],
  ["interview_sessions", ["user_id"]],
  ["athena_self_evaluations", ["user_id"]],
  ["athena_usage_log", ["user_id"]],
  ["user_prompts", ["user_id"]],
  ["user_photos", ["user_id"]],
  ["user_roles", ["user_id"]],
  ["notifications", ["user_id"]],
  ["notification_preferences", ["user_id"]],
  ["member_consents", ["user_id"]],
  ["data_export_requests", ["user_id"]],
  ["pair_reasoning", ["user_low", "user_high"]],
  ["connections", ["user_low", "user_high"]],
  ["conversations", ["user_a", "user_b"]],
  ["messages", ["sender_id"]],
  ["meeting_proposals", ["proposed_by"]],
  ["member_transitions", ["user_id"]],
  ["relationship_focus", ["user_low", "user_high"]],
  ["partner_perception", ["author_id", "subject_id"]],
  ["post_meeting_reflections", ["user_id"]],
  ["reflection_submissions", ["user_id"]],
  ["introduction_responses", ["user_id"]],
  ["introduction_feedback", ["user_id"]],
  ["blocks", ["blocker_id", "blocked_id"]],
  ["reports", ["reporter_id", "reported_id"]],
  ["safety_flags", ["user_id"]],
];

export type ReconciliationReport = {
  tombstones_checked: number;
  subjects_repurged: number;
  rows_removed: Record<string, number>;
  auth_users_removed: number;
  duration_ms: number;
  clean: boolean;
};

/**
 * Replay every recorded deletion against current data. Safe to run at any
 * time: on an unrestored database it finds nothing and reports `clean`.
 *
 * `dryRun` reports what would be removed without removing it — the mode the
 * restore runbook uses to gate a restore before it returns to service.
 */
export async function replayDeletions(
  trigger: "post_restore" | "scheduled" | "manual" | "rehearsal",
  opts: { dryRun?: boolean } = {},
): Promise<ReconciliationReport> {
  const started = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;

  const { data: tombs } = await admin.from("purge_tombstones").select("subject_hash");
  const tombstoneHashes = new Set((tombs ?? []).map((t) => (t as { subject_hash: string }).subject_hash));

  const rowsRemoved: Record<string, number> = {};
  const resurrected = new Set<string>();

  const loose = admin as unknown as {
    from: (t: string) => {
      select: (s: string) => Promise<{ data: Record<string, unknown>[] | null }>;
      delete: () => {
        eq: (c: string, v: string) => { select: (s: string) => Promise<{ data: unknown[] | null }> };
      };
    };
  };

  for (const [table, columns] of SUBJECT_COLUMNS) {
    const { data } = await loose.from(table).select(columns.join(", "));
    for (const row of data ?? []) {
      for (const column of columns) {
        const id = row[column];
        if (typeof id !== "string") continue;
        if (!tombstoneHashes.has(subjectHash(id))) continue;
        resurrected.add(id);
        if (opts.dryRun) {
          rowsRemoved[`${table}.${column}`] = (rowsRemoved[`${table}.${column}`] ?? 0) + 1;
        }
      }
    }
  }

  let authRemoved = 0;
  if (!opts.dryRun) {
    for (const id of resurrected) {
      for (const [table, columns] of SUBJECT_COLUMNS) {
        for (const column of columns) {
          const { data } = await loose.from(table).delete().eq(column, id).select("id");
          const n = data?.length ?? 0;
          if (n > 0) rowsRemoved[`${table}.${column}`] = (rowsRemoved[`${table}.${column}`] ?? 0) + n;
        }
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (!error) authRemoved += 1;
      try {
        const { data: files } = await admin.storage.from("profile-photos").list(id, { limit: 1000 });
        const paths = (files ?? []).map((f) => `${id}/${f.name}`);
        if (paths.length > 0) await admin.storage.from("profile-photos").remove(paths);
      } catch {
        /* reported through rowsRemoved absence; storage is retried by the runbook */
      }
    }
  }

  const report: ReconciliationReport = {
    tombstones_checked: tombstoneHashes.size,
    subjects_repurged: resurrected.size,
    rows_removed: rowsRemoved,
    auth_users_removed: authRemoved,
    duration_ms: Date.now() - started,
    clean: resurrected.size === 0,
  };

  if (!opts.dryRun) {
    await admin.from("restore_reconciliations").insert({
      trigger,
      tombstones_checked: report.tombstones_checked,
      subjects_repurged: report.subjects_repurged,
      rows_removed: report.rows_removed,
      duration_ms: report.duration_ms,
    });
    await admin
      .from("purge_tombstones")
      .update({ last_replayed_at: new Date().toISOString() })
      .neq("subject_hash", "");
  }

  await auditAdminAccess({
    actorRole: "service",
    action: opts.dryRun ? "restore.reconcile.dry_run" : "restore.reconcile.executed",
    resource: "profiles",
    purpose: "Deleted-member restore protection",
    metadata: {
      trigger,
      tombstones: report.tombstones_checked,
      repurged: report.subjects_repurged,
      duration_ms: report.duration_ms,
    },
  });

  safeLog("restore.reconciled", { trigger, repurged: report.subjects_repurged, dry: Boolean(opts.dryRun) });
  return report;
}
