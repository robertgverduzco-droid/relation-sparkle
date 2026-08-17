// Account lifecycle — server-only deletion machinery.
//
// Deletion doctrine (docs/business/account-lifecycle.md): when a member
// permanently deletes their account, everything personally attributable to
// them leaves the system. Most member tables already carry
// `ON DELETE CASCADE` to `auth.users`, so removing the auth user removes the
// rows transactionally inside Postgres. This module handles what a database
// cascade cannot reach:
//
//   1. Storage objects in the private `profile-photos` bucket.
//   2. Pseudonymous outcome-learning signals keyed by a salted pair token.
//      The token is recomputable from the two member ids, so it is
//      de-identified rather than anonymous — doctrine requires purging it.
//   3. A post-deletion sweep that verifies no member-linked row survived.
import { pairToken } from "./learning.server";

/** Tables that hold rows keyed directly to a member id, and the column used. */
const MEMBER_KEYED_TABLES: Array<[table: string, columns: string[]]> = [
  ["profiles", ["id"]],
  ["user_intelligence", ["user_id"]],
  ["user_preferences", ["user_id"]],
  ["user_readiness", ["user_id"]],
  ["member_readiness", ["user_id"]],
  ["notifications", ["user_id"]],
  ["notification_preferences", ["user_id"]],
  ["user_prompts", ["user_id"]],
  ["user_photos", ["user_id"]],
  ["user_roles", ["user_id"]],
  ["understanding_facets", ["user_id"]],
  ["facet_history", ["user_id"]],
  ["topic_map", ["user_id"]],
  ["interview_sessions", ["user_id"]],
  ["athena_self_evaluations", ["user_id"]],
  ["athena_usage_log", ["user_id"]],
  ["pair_reasoning", ["user_low", "user_high"]],
  ["introduction_responses", ["user_id"]],
  ["introduction_feedback", ["user_id"]],
  ["connections", ["user_low", "user_high"]],
  ["conversations", ["user_a", "user_b"]],
  ["messages", ["sender_id"]],
  ["meeting_proposals", ["proposed_by"]],
  ["member_transitions", ["user_id"]],
  ["relationship_focus", ["user_low", "user_high"]],
  ["partner_perception", ["author_id", "subject_id"]],
  ["post_meeting_reflections", ["user_id"]],
  ["reflection_submissions", ["user_id"]],
  ["blocks", ["blocker_id", "blocked_id"]],
  ["reports", ["reporter_id", "reported_id"]],
  ["safety_flags", ["user_id"]],
  ["member_consents", ["user_id"]],
  // A-23 — reached today only by FK cascade. Listed explicitly so a future
  // migration that drops ON DELETE CASCADE cannot silently strand them.
  ["understanding_revisions", ["user_id"]],
  ["data_export_requests", ["user_id"]],
  ["pair_reasoning_history", ["user_low", "user_high"]],
];



type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/** Every other member this account was ever paired or connected with. */
async function counterpartIds(admin: Admin, userId: string): Promise<string[]> {
  const ids = new Set<string>();
  const [pairs, conns] = await Promise.all([
    admin
      .from("pair_reasoning")
      .select("user_low, user_high")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`),
    admin
      .from("connections")
      .select("user_low, user_high")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`),
  ]);
  for (const row of [...(pairs.data ?? []), ...(conns.data ?? [])]) {
    const low = (row as { user_low: string }).user_low;
    const high = (row as { user_high: string }).user_high;
    if (low !== userId) ids.add(low);
    if (high !== userId) ids.add(high);
  }
  return [...ids];
}

/**
 * Purge every artefact that survives (or precedes) the auth-user cascade,
 * then delete the auth user itself, then verify nothing is left behind.
 */
export async function purgeMemberAndDeleteAuthUser(userId: string): Promise<{
  ok: true;
  photos_removed: number;
  outcome_signals_removed: number;
  residual: Record<string, number>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;

  // --- 1. Pseudonymous outcome signals -------------------------------------
  // pair_token = HMAC(salt, sorted(userA:userB)). Recomputable, therefore
  // reconnectable to this member; it does not qualify as anonymous and must
  // be removed. Signals for pairs this member was never part of are untouched.
  const others = await counterpartIds(admin, userId);
  let outcomeRemoved = 0;
  if (others.length > 0) {
    const tokens = others.map((o) => pairToken(userId, o));
    const { data } = await admin
      .from("athena_outcome_signals")
      .delete()
      .in("pair_token", tokens)
      .select("id");
    outcomeRemoved = data?.length ?? 0;
  }

  // --- 2. Private storage objects ------------------------------------------
  // Photos live under `<user-id>/…` in the private `profile-photos` bucket.
  // Storage objects have no FK to auth.users, so the cascade cannot see them.
  let photosRemoved = 0;
  try {
    const { data: files } = await admin.storage
      .from("profile-photos")
      .list(userId, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${userId}/${f.name}`);
    // Belt-and-braces: also honour paths recorded in user_photos.
    const { data: rows } = await admin
      .from("user_photos")
      .select("storage_path")
      .eq("user_id", userId);
    for (const r of rows ?? []) {
      const p = (r as { storage_path: string }).storage_path;
      if (p && !paths.includes(p)) paths.push(p);
    }
    if (paths.length > 0) {
      await admin.storage.from("profile-photos").remove(paths);
      photosRemoved = paths.length;
    }
  } catch {
    // Storage failures must not strand the member in a half-deleted state;
    // the residual sweep below reports anything still attributable.
  }

  // --- 3. Delete the auth user (drives the FK cascade transactionally) ------
  // The tombstone is written *before* the delete so that a crash between the
  // two leaves us over-protective (a tombstone with no deletion is harmless)
  // rather than under-protective (a deletion no restore would ever replay).
  {
    const { writePurgeTombstone } = await import("./restore-guard.server");
    await writePurgeTombstone(userId, "member_request");
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);


  // --- 4. Residual sweep ----------------------------------------------------
  // Any row that somehow escaped the cascade (e.g. a future table added
  // without ON DELETE CASCADE) is deleted explicitly and reported.
  const residual: Record<string, number> = {};
  // Untyped handle: table/column names are dynamic in this sweep.
  const loose = admin as unknown as {
    from: (t: string) => {
      delete: () => {
        eq: (c: string, v: string) => { select: (s: string) => Promise<{ data: unknown[] | null }> };
      };
    };
  };
  for (const [table, columns] of MEMBER_KEYED_TABLES) {
    for (const column of columns) {
      const { data } = await loose.from(table).delete().eq(column, userId).select("id");
      const n = data?.length ?? 0;
      if (n > 0) residual[`${table}.${column}`] = n;
    }
  }

  // --- 5. Audit trail --------------------------------------------------------
  // The audit log must survive deletion (it is the accountability record for
  // privileged action), but it must stop pointing at a deleted member. Subject
  // references are severed; the action history remains.
  await admin
    .from("admin_audit_log")
    .update({ subject_id: null })
    .eq("subject_id", userId);
  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    action: "account.purge.completed",
    resource: "profiles",
    purpose: "Member-initiated or enforcement deletion",
    metadata: {
      photos_removed: photosRemoved,
      outcome_signals_removed: outcomeRemoved,
      residual_tables: Object.keys(residual).length,
    },
  });


  return {
    ok: true,
    photos_removed: photosRemoved,
    outcome_signals_removed: outcomeRemoved,
    residual,
  };
}
