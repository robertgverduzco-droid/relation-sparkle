// Moderation & Enforcement Standard — runtime ladder.
// Doctrine: docs/security/MODERATION-AND-ENFORCEMENT.md
//
// Principles enforced here:
//  - proportionality: three substantiated ordinary violations before removal;
//  - behavioural specificity: notices name conduct, never the person;
//  - reporter protection: nothing recorded in a member-visible field can
//    identify who reported;
//  - no AI-only permanent ban: automated detection may only open a review.
import { createHash } from "crypto";

export type EnforcementAction =
  | "warning"
  | "messaging_restriction"
  | "introduction_suspension"
  | "account_hold"
  | "suspension"
  | "removal";

/** Conduct categories that bypass the ladder when substantiated. */
export const SEVERE_CONDUCT = [
  "credible_threat",
  "stalking",
  "sexual_violence",
  "sexual_coercion",
  "predatory_conduct",
  "serious_harassment",
  "non_consensual_intimate_content",
  "serious_fraud",
  "dangerous_impersonation",
  "severe_hateful_abuse",
  "safety_system_abuse",
  "ban_evasion",
] as const;
export type SevereConduct = (typeof SEVERE_CONDUCT)[number];

export function isSevereConduct(category: string): category is SevereConduct {
  return (SEVERE_CONDUCT as readonly string[]).includes(category);
}

export type LadderDecision = {
  level: 1 | 2 | 3 | 4;
  action: EnforcementAction;
  immediate_path: boolean;
  prior_action_count: number;
  rationale: string;
};

/**
 * Decide the proportionate action. Pure function — auditable and testable
 * without a database.
 */
export function decideLadder(
  category: string,
  priorSubstantiated: number,
): LadderDecision {
  if (isSevereConduct(category)) {
    return {
      level: 4,
      action: "removal",
      immediate_path: true,
      prior_action_count: priorSubstantiated,
      rationale:
        "Substantiated severe conduct. The graduated ladder is not an entitlement where conduct creates serious risk to a member.",
    };
  }
  if (priorSubstantiated >= 2) {
    return {
      level: 3,
      action: "removal",
      immediate_path: false,
      prior_action_count: priorSubstantiated,
      rationale: "Third substantiated ordinary violation, evaluated cumulatively.",
    };
  }
  if (priorSubstantiated === 1) {
    return {
      level: 2,
      action: "messaging_restriction",
      immediate_path: false,
      prior_action_count: priorSubstantiated,
      rationale: "Repeated conduct after a formal warning. Narrowly tailored restriction.",
    };
  }
  return {
    level: 1,
    action: "warning",
    immediate_path: false,
    prior_action_count: priorSubstantiated,
    rationale: "First substantiated ordinary violation. Behaviour named, no restriction.",
  };
}

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function priorCount(admin: Admin, userId: string): Promise<number> {
  const { count } = await admin
    .from("enforcement_actions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("review_status", "substantiated");
  return count ?? 0;
}

/** Salted hash of a banned identifier. Never store the raw address (F-17). */
export function identifierHash(value: string): string {
  const salt = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  return createHash("sha256")
    .update(`ri-ban:${salt}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export type EnforcementInput = {
  userId: string;
  conductCategory: string;
  severity: "low" | "medium" | "high" | "critical";
  evidenceBasis: string;
  behaviorNote: string;
  actorId: string | null;
  actorSystem?: string;
  reportId?: string | null;
  /** Automated detection may only queue a review, never conclude one. */
  pendingReview?: boolean;
};

/**
 * Record an enforcement action and apply its runtime effect.
 * Returns the action row id and the decision that produced it.
 */
export async function applyEnforcement(input: EnforcementInput): Promise<{
  action_id: string;
  decision: LadderDecision;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;
  const decision = decideLadder(input.conductCategory, await priorCount(admin, input.userId));
  const pending = input.pendingReview === true;

  const restrictionUntil =
    !pending && decision.action === "messaging_restriction"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : !pending && decision.action === "account_hold"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

  const { data, error } = await admin
    .from("enforcement_actions")
    .insert({
      user_id: input.userId,
      level: decision.level,
      action: decision.action,
      conduct_category: input.conductCategory,
      severity: input.severity,
      evidence_basis: input.evidenceBasis,
      behavior_note: input.behaviorNote,
      immediate_path: decision.immediate_path,
      prior_action_count: decision.prior_action_count,
      initiated_by: input.actorId,
      initiated_by_system: input.actorSystem ?? null,
      report_id: input.reportId ?? null,
      review_status: pending ? "pending_review" : "substantiated",
      restriction_until: restrictionUntil,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const actionId = data.id as string;

  if (pending) return { action_id: actionId, decision };

  // --- runtime effect ------------------------------------------------------
  const { notify } = await import("./notifications.server");
  if (decision.action === "removal") {
    // Retain the hashed identifier BEFORE the account disappears (F-17).
    const { data: u } = await admin.auth.admin.getUserById(input.userId);
    const email = u?.user?.email;
    const phone = u?.user?.phone;
    const rows: Array<{ identifier_hash: string; identifier_kind: "email" | "phone" }> = [];
    if (email) rows.push({ identifier_hash: identifierHash(email), identifier_kind: "email" });
    if (phone) rows.push({ identifier_hash: identifierHash(phone), identifier_kind: "phone" });
    for (const r of rows) {
      await admin
        .from("banned_identifiers")
        .upsert(
          { ...r, reason_category: input.conductCategory, action_id: actionId },
          { onConflict: "identifier_hash" },
        );
    }
    const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
    await purgeMemberAndDeleteAuthUser(input.userId);
  } else {
    if (decision.action === "introduction_suspension" || decision.level >= 2) {
      await admin.from("profiles").update({ is_paused: true }).eq("id", input.userId);
    }
    await notify({
      userId: input.userId,
      category: "relationship",
      eventType: "enforcement.action",
      title: "A note about your account",
      body:
        decision.level === 1
          ? "Something in a recent exchange crossed a line for another member. Your account is unchanged; please read the note in your account settings."
          : "Some of your account activity is temporarily limited. The details are in your account settings.",
      actionPath: "/profile",
      dedupeKey: `enforcement:${actionId}`,
    }).catch(() => undefined);
  }

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: input.actorId ?? undefined,
    actorRole: input.actorId ? "moderator" : "system",
    action: `enforcement.${decision.action}`,
    resource: "enforcement_actions",
    subjectId: decision.action === "removal" ? null : input.userId,
    purpose: "Member safety enforcement",
    metadata: {
      level: decision.level,
      category: input.conductCategory,
      immediate: decision.immediate_path,
      prior: decision.prior_action_count,
    },
  });

  return { action_id: actionId, decision };
}

/** Is this identifier under a safety ban? Checked before account creation. */
export async function isIdentifierBanned(value: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("banned_identifiers")
    .select("id, expires_at")
    .eq("identifier_hash", identifierHash(value))
    .limit(1);
  const row = data?.[0];
  if (!row) return false;
  const exp = row.expires_at as string | null;
  return !exp || new Date(exp) > new Date();
}

/** Current live restrictions for a member, used by messaging/matchmaking gates. */
export async function activeRestrictions(userId: string): Promise<{
  messaging_blocked: boolean;
  introductions_blocked: boolean;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("enforcement_actions")
    .select("action, restriction_until, review_status")
    .eq("user_id", userId)
    .eq("review_status", "substantiated")
    .not("restriction_until", "is", null);
  const now = Date.now();
  let messaging = false;
  let intros = false;
  for (const r of data ?? []) {
    const until = r.restriction_until as string | null;
    if (!until || new Date(until).getTime() < now) continue;
    if (r.action === "messaging_restriction" || r.action === "account_hold") messaging = true;
    if (r.action === "introduction_suspension" || r.action === "account_hold") intros = true;
  }
  return { messaging_blocked: messaging, introductions_blocked: intros };
}
