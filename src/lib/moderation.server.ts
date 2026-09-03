// Moderation runtime logic. Never imported by client components — only by
// the thin server-function wrapper in ./moderation.functions.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import * as z from "zod";

export const resolveInput = z
  .object({
    report_id: z.string().uuid(),
    action: z.enum(["dismiss", "suspend", "ban"]),
    note: z.string().max(1000).optional(),
  })
  .refine((v) => v.action !== "suspend" || Boolean(v.note?.trim()), {
    message:
      "A behavior note is required when suspending an account -- it's the only thing the member will see explaining why.",
    path: ["note"],
  });

export type ResolveInput = z.infer<typeof resolveInput>;

export const reinstateInput = z.object({
  user_id: z.string().uuid(),
});

export type ReinstateInput = z.infer<typeof reinstateInput>;

export type ModerationReport = {
  id: string;
  reporter_name: string;
  reported_id: string;
  reported_name: string;
  category: string;
  details: string | null;
  severity: string;
  status: string;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  /** True while reported_id is currently under a moderator-imposed hold. */
  reported_is_suspended: boolean;
};

/** True when the caller holds the moderator or admin role. */
export async function isModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const [{ data: mod }, { data: admin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  return Boolean(mod || admin);
}

export async function assertModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  if (!(await isModerator(supabase, userId))) throw new Error("Forbidden");
}

export async function listReports(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ reports: ModerationReport[] }> {
  await assertModerator(supabase, userId);
  const { auditAdminAccess } = await import("./security.server");
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, reported_id, conversation_id, category, details, severity, status, resolved_at, resolution_note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  await auditAdminAccess({
    actorId: userId,
    actorRole: "moderator",
    action: "moderation.reports.list",
    resource: "reports",
    purpose: "Safety review queue",
    metadata: { count: reports?.length ?? 0 },
  });


  const ids = new Set<string>();
  for (const r of reports ?? []) {
    ids.add(r.reporter_id as string);
    ids.add(r.reported_id as string);
  }
  const { data: profs } = ids.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, suspended_by_moderator")
        .in("id", Array.from(ids))
    : {
        data: [] as { id: string; display_name: string | null; suspended_by_moderator: boolean }[],
      };
  const nameOf = new Map<string, string>();
  const suspendedOf = new Map<string, boolean>();
  for (const p of profs ?? []) {
    nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");
    suspendedOf.set(p.id as string, Boolean(p.suspended_by_moderator));
  }

  return {
    reports: (reports ?? []).map((r) => ({
      id: r.id as string,
      reporter_name: nameOf.get(r.reporter_id as string) ?? "Someone",
      reported_id: r.reported_id as string,
      reported_name: nameOf.get(r.reported_id as string) ?? "Someone",
      category: r.category as string,
      details: r.details as string | null,
      severity: r.severity as string,
      status: r.status as string,
      resolved_at: r.resolved_at as string | null,
      resolution_note: r.resolution_note as string | null,
      created_at: r.created_at as string,
      reported_is_suspended: suspendedOf.get(r.reported_id as string) ?? false,
    })),
  };
}

/** Resolve a report. Suspension pauses the account; ban deletes it. */
export async function resolveReportForModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: ResolveInput,
): Promise<{ ok: true }> {
  await assertModerator(supabase, userId);

  const { data: report, error: rErr } = await supabase
    .from("reports")
    .update({
      status: data.action === "dismiss" ? "dismissed" : "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_note: data.note ?? null,
    })
    .eq("id", data.report_id)
    .select("reported_id, category, severity")
    .maybeSingle();
  if (rErr || !report) throw new Error(rErr?.message ?? "Report not found");

  const reportedId = report.reported_id as string;
  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: userId,
    actorRole: "moderator",
    action: `moderation.report.${data.action}`,
    subjectId: reportedId,
    resource: "reports",
    purpose: "Safety enforcement decision",
    metadata: { report_id: data.report_id },
  });
  if (data.action === "suspend") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // suspended_by_moderator distinguishes this from a member's own pause
    // toggle, which must never be able to clear a hold it didn't set.
    await supabaseAdmin
      .from("profiles")
      .update({ is_paused: true, suspended_by_moderator: true })
      .eq("id", reportedId);

    // The one real write into the enforcement ladder schema (enforcement.server.ts
    // exists but nothing calls it yet -- this suspend action is the only live
    // path that actually creates a hold). This row is what an appeal points
    // at: appeal_status starts 'not_requested' and enforcement_appeals has a
    // unique index on action_id, so a member gets exactly one appeal per hold.
    const { error: actionErr } = await supabaseAdmin.from("enforcement_actions").insert({
      user_id: reportedId,
      level: 2,
      action: "account_hold",
      conduct_category: (report.category as string) ?? "policy_violation",
      severity: report.severity,
      evidence_basis: "Moderator review of a member report",
      behavior_note: data.note as string, // required by resolveInput's refine when action === "suspend"
      initiated_by: userId,
      report_id: data.report_id,
      review_status: "substantiated",
      appeal_status: "not_requested",
    });
    if (actionErr) throw new Error(actionErr.message);

    const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
    await notify(supabaseAdmin as never, {
      userId: reportedId,
      category: "safety",
      eventType: "account_suspended",
      title: NOTIFICATION_COPY.account_suspended.title,
      body: NOTIFICATION_COPY.account_suspended.body,
      actionPath: "/account/appeal",
      dedupeKey: `account_suspended:${data.report_id}`,
    });

    const { evaluateReadiness } = await import("./readiness.server");
    await evaluateReadiness(supabaseAdmin, reportedId, "safety_change");
  } else if (data.action === "ban") {
    const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
    await purgeMemberAndDeleteAuthUser(reportedId);
  }
  return { ok: true };
}

/**
 * The only DB effect of lifting a moderator-imposed hold. Shared by direct
 * reinstatement and a granted appeal so both paths guarantee identical
 * downstream state -- including a fresh readiness evaluation. Nothing in the
 * app's live gates reads a cached readiness row (member_readiness has no
 * consumers; every real check calls evaluateReadiness fresh), so this call
 * is belt-and-suspenders for that cache rather than load-bearing -- but it
 * keeps that cache honest for anything that ever does read it.
 */
export async function clearHold(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_paused: false, suspended_by_moderator: false })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  const { evaluateReadiness } = await import("./readiness.server");
  await evaluateReadiness(supabaseAdmin, userId, "safety_change");
}

/** Lift a moderator-imposed hold. The only path that may clear it. */
export async function reinstateAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: ReinstateInput,
): Promise<{ ok: true }> {
  await assertModerator(supabase, userId);
  await clearHold(data.user_id);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: userId,
    actorRole: "moderator",
    action: "moderation.account.reinstate",
    subjectId: data.user_id,
    resource: "profiles",
    purpose: "Safety enforcement decision",
    metadata: {},
  });

  const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await notify(supabaseAdmin as never, {
    userId: data.user_id,
    category: "safety",
    eventType: "account_reinstated",
    title: NOTIFICATION_COPY.account_state.title,
    body: "Your account is no longer on hold. Matches have resumed.",
    actionPath: "/profile",
    dedupeKey: `account_reinstated:${Date.now()}`,
  });

  return { ok: true };
}
