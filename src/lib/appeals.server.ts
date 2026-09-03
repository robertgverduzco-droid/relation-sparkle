// Appeals against a moderator-imposed account hold. Never imported by client
// components — only by the thin server-function wrapper in
// ./appeals.functions.ts.
//
// The counterpart to src/lib/moderation.server.ts (which creates a hold) and
// src/lib/photo-moderation.server.ts (the same "wire up what already exists"
// pattern applied to photo review). enforcement_appeals and
// enforcement_actions were both fully built and fully unused: nothing wrote
// to enforcement_actions and nothing read enforcement_appeals. This is that
// missing wiring, on the one live path that actually creates a hold
// (moderation.server.ts's "suspend" action).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SafetySeverity = Database["public"]["Enums"]["safety_severity"];

type HoldAction = {
  id: string;
  conduct_category: string;
  severity: string;
  behavior_note: string;
};

/**
 * The enforcement_actions row a member's current hold points at. Suspends
 * created after this feature shipped always have one (moderation.server.ts
 * writes it at suspend time). For anyone suspended before that existed,
 * reconstruct one from their most recent report rather than leave them with
 * a hold and nothing to appeal against.
 */
async function currentHoldAction(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<HoldAction | null> {
  const { data: existing } = await admin
    .from("enforcement_actions")
    .select("id, conduct_category, severity, behavior_note")
    .eq("user_id", userId)
    .eq("action", "account_hold")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as HoldAction;

  const { data: report } = await admin
    .from("reports")
    .select("id, category, severity, resolution_note")
    .eq("reported_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await admin
    .from("enforcement_actions")
    .insert({
      user_id: userId,
      level: 2,
      action: "account_hold",
      conduct_category: (report?.category as string | undefined) ?? "policy_violation",
      severity: (report?.severity as SafetySeverity | undefined) ?? "medium",
      evidence_basis: "Moderator review of a member report",
      behavior_note:
        (report?.resolution_note as string | null) ??
        "Your account was placed on hold before this record existed.",
      initiated_by_system: "reconstructed_pre_bridge",
      report_id: (report?.id as string | undefined) ?? null,
      review_status: "substantiated",
      appeal_status: "not_requested",
    })
    .select("id, conduct_category, severity, behavior_note")
    .single();
  if (error) throw new Error(error.message);
  return created as HoldAction;
}

export type HoldStatus = {
  onHold: boolean;
  conductCategory: string | null;
  severity: string | null;
  behaviorNote: string | null;
  appeal: {
    statement: string;
    status: string;
    reviewerNote: string | null;
    reviewedAt: string | null;
  } | null;
};

/** What the member sees about their own hold and any appeal against it. */
export async function getMyHoldStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HoldStatus> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_by_moderator")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.suspended_by_moderator) {
    return {
      onHold: false,
      conductCategory: null,
      severity: null,
      behaviorNote: null,
      appeal: null,
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const action = await currentHoldAction(supabaseAdmin, userId);
  if (!action) {
    return {
      onHold: true,
      conductCategory: null,
      severity: null,
      behaviorNote: null,
      appeal: null,
    };
  }

  const { data: appealRow } = await supabase
    .from("enforcement_appeals")
    .select("statement, status, reviewer_note, reviewed_at")
    .eq("action_id", action.id)
    .maybeSingle();

  return {
    onHold: true,
    conductCategory: action.conduct_category,
    severity: action.severity,
    behaviorNote: action.behavior_note,
    appeal: appealRow
      ? {
          statement: appealRow.statement as string,
          status: appealRow.status as string,
          reviewerNote: appealRow.reviewer_note as string | null,
          reviewedAt: appealRow.reviewed_at as string | null,
        }
      : null,
  };
}

/** File the one appeal a hold gets. */
export async function fileAppeal(
  supabase: SupabaseClient<Database>,
  userId: string,
  statement: string,
): Promise<{ ok: true }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_by_moderator")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.suspended_by_moderator) throw new Error("There's no active hold to appeal.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const action = await currentHoldAction(supabaseAdmin, userId);
  if (!action) throw new Error("There's no active hold to appeal.");

  const { error } = await supabase.from("enforcement_appeals").insert({
    action_id: action.id,
    user_id: userId,
    statement,
  });
  if (error) {
    // enforcement_appeals_one_per_action: one appeal per hold, by design.
    if (error.code === "23505") throw new Error("You've already filed an appeal for this hold.");
    throw new Error(error.message);
  }

  return { ok: true };
}

export type OpenAppeal = {
  id: string;
  user_id: string;
  member_name: string;
  statement: string;
  created_at: string;
  action_id: string;
  conduct_category: string;
  severity: string;
  behavior_note: string;
};

/** Every appeal waiting on a founder decision. */
export async function listOpenAppealsForFounder(): Promise<{ appeals: OpenAppeal[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("enforcement_appeals")
    .select("id, user_id, statement, created_at, action_id")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const appeals = rows ?? [];
  if (appeals.length === 0) return { appeals: [] };

  const actionIds = appeals.map((a) => a.action_id as string);
  const { data: actions } = await supabaseAdmin
    .from("enforcement_actions")
    .select("id, conduct_category, severity, behavior_note")
    .in("id", actionIds);
  const actionOf = new Map((actions ?? []).map((a) => [a.id as string, a]));

  const userIds = Array.from(new Set(appeals.map((a) => a.user_id as string)));
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const nameOf = new Map(
    (profs ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "Someone"]),
  );

  return {
    appeals: appeals.map((a) => {
      const action = actionOf.get(a.action_id as string);
      return {
        id: a.id as string,
        user_id: a.user_id as string,
        member_name: nameOf.get(a.user_id as string) ?? "Someone",
        statement: a.statement as string,
        created_at: a.created_at as string,
        action_id: a.action_id as string,
        conduct_category: (action?.conduct_category as string | undefined) ?? "unknown",
        severity: (action?.severity as string | undefined) ?? "unknown",
        behavior_note: (action?.behavior_note as string | undefined) ?? "",
      };
    }),
  };
}

/** Grant lifts the hold (via the same clearHold reinstatement uses); uphold leaves it. */
export async function resolveAppealAsFounder(
  actorId: string,
  appealId: string,
  decision: "grant" | "uphold",
  reviewerNote: string | null,
): Promise<{ ok: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: appeal, error } = await supabaseAdmin
    .from("enforcement_appeals")
    .select("user_id, action_id, status")
    .eq("id", appealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!appeal) throw new Error("That appeal isn't waiting on review.");
  if (appeal.status !== "open") throw new Error("That appeal has already been decided.");

  const newStatus = decision === "grant" ? "granted" : "upheld";
  const reviewedAt = new Date().toISOString();

  const { error: appealErr } = await supabaseAdmin
    .from("enforcement_appeals")
    .update({
      status: newStatus,
      reviewer_id: actorId,
      reviewer_note: reviewerNote,
      reviewed_at: reviewedAt,
    })
    .eq("id", appealId);
  if (appealErr) throw new Error(appealErr.message);

  const { error: actionErr } = await supabaseAdmin
    .from("enforcement_actions")
    .update({
      appeal_status: newStatus,
      review_status: decision === "grant" ? "overturned" : "substantiated",
    })
    .eq("id", appeal.action_id as string);
  if (actionErr) throw new Error(actionErr.message);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId,
    actorRole: "founder",
    action: `appeal.${decision}`,
    subjectId: appeal.user_id as string,
    resource: "enforcement_appeals",
    purpose: "Appeal decision",
    metadata: { appeal_id: appealId, action_id: appeal.action_id },
  });

  const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
  if (decision === "grant") {
    const { clearHold } = await import("./moderation.server");
    await clearHold(appeal.user_id as string);
    await notify(supabaseAdmin as never, {
      userId: appeal.user_id as string,
      category: "safety",
      eventType: "appeal_granted",
      title: NOTIFICATION_COPY.appeal_granted.title,
      body: reviewerNote?.trim() || NOTIFICATION_COPY.appeal_granted.body,
      actionPath: "/account/appeal",
      dedupeKey: `appeal_granted:${appealId}`,
    });
  } else {
    await notify(supabaseAdmin as never, {
      userId: appeal.user_id as string,
      category: "safety",
      eventType: "appeal_upheld",
      title: NOTIFICATION_COPY.appeal_upheld.title,
      body: reviewerNote?.trim() || NOTIFICATION_COPY.appeal_upheld.body,
      actionPath: "/account/appeal",
      dedupeKey: `appeal_upheld:${appealId}`,
    });
  }

  return { ok: true };
}
