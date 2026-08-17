/**
 * Entitlement architecture (server-only).
 *
 * Provider-neutral by design: the same record and the same evaluation serve
 * Apple StoreKit (native), web billing, and non-billing internal test grants.
 * Nothing about a member's paid state is ever decided on the device — the
 * client can read its own entitlement row and nothing else, and it has no
 * write path to it at all (no INSERT/UPDATE/DELETE grant).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTITLED_STATUSES, type MembershipStatus, type PlanKey } from "./membership";

export type EntitlementProvider = "none" | "apple_app_store" | "web_billing" | "internal_test";
export type EntitlementEnvironment = "development" | "production";

export type EntitlementRow = {
  user_id: string;
  plan_key: string | null;
  status: MembershipStatus;
  provider: EntitlementProvider;
  environment: EntitlementEnvironment;
  product_id: string | null;
  billing_period: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  cancel_at_period_end: boolean;
  last_verified_at: string | null;
  grant_reason: string | null;
  updated_at: string;
};

export type Entitlement = {
  entitled: boolean;
  status: MembershipStatus;
  planKey: string | null;
  provider: EntitlementProvider;
  environment: EntitlementEnvironment;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isInternalTest: boolean;
};

const EMPTY: Entitlement = {
  entitled: false,
  status: "none",
  planKey: null,
  provider: "none",
  environment: "development",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isInternalTest: false,
};

/**
 * Production entitlements only exist when the deployment is explicitly marked
 * as the live billing environment. Absent that, everything is development —
 * which the database refuses to combine with an internal_test grant.
 */
export function entitlementEnvironment(): EntitlementEnvironment {
  return process.env.ATHENA_BILLING_ENV === "production" ? "production" : "development";
}

/** True when a period-bound status has run out. Evaluated server-side only. */
function expiredByTime(row: EntitlementRow, now: Date): boolean {
  const end = row.grace_until ?? row.current_period_end;
  if (!end) return false;
  return new Date(end).getTime() <= now.getTime();
}

export function evaluateEntitlementRow(
  row: EntitlementRow | null,
  now: Date = new Date(),
): Entitlement {
  if (!row) return EMPTY;
  const timedOut = ENTITLED_STATUSES.includes(row.status) && expiredByTime(row, now);
  const status: MembershipStatus = timedOut ? "expired" : row.status;
  return {
    entitled: ENTITLED_STATUSES.includes(status),
    status,
    planKey: row.plan_key,
    provider: row.provider,
    environment: row.environment,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    isInternalTest: row.provider === "internal_test",
  };
}

export async function readEntitlement(
  admin: SupabaseClient,
  userId: string,
): Promise<Entitlement> {
  const { data } = await admin
    .from("membership_entitlements")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return evaluateEntitlementRow((data as EntitlementRow | null) ?? null);
}

export async function recordEntitlementEvent(
  admin: SupabaseClient,
  args: {
    userId: string;
    event: string;
    fromStatus: string | null;
    toStatus: string;
    provider: EntitlementProvider;
    environment: EntitlementEnvironment;
    planKey?: string | null;
    productId?: string | null;
    actor: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await admin.from("entitlement_events").insert({
    user_id: args.userId,
    event: args.event,
    from_status: args.fromStatus,
    to_status: args.toStatus,
    provider: args.provider,
    environment: args.environment,
    plan_key: args.planKey ?? null,
    product_id: args.productId ?? null,
    actor: args.actor,
    detail: args.detail ?? {},
  });
}

/**
 * A member choosing a plan is an *intention*, not an entitlement. Until a
 * provider confirms a purchase, status stays where it is.
 */
export async function recordPlanSelection(
  admin: SupabaseClient,
  userId: string,
  planKey: PlanKey,
): Promise<Entitlement> {
  const current = await readEntitlement(admin, userId);
  await admin.from("membership_entitlements").upsert(
    {
      user_id: userId,
      plan_key: planKey,
      status: current.status === "none" ? "none" : current.status,
      provider: current.provider,
      environment: entitlementEnvironment(),
    },
    { onConflict: "user_id" },
  );
  await recordEntitlementEvent(admin, {
    userId,
    event: "plan_selected",
    fromStatus: current.status,
    toStatus: current.status,
    provider: current.provider,
    environment: entitlementEnvironment(),
    planKey,
    actor: "member",
  });
  return readEntitlement(admin, userId);
}

/**
 * Non-billing internal test entitlement. Refused outright in the production
 * billing environment — and refused again by a database trigger, so a code
 * mistake cannot manufacture a paid member.
 */
export async function grantInternalTestEntitlement(
  admin: SupabaseClient,
  args: { userId: string; planKey: PlanKey; actorUserId: string; reason: string; days?: number },
): Promise<Entitlement> {
  const environment = entitlementEnvironment();
  if (environment === "production") {
    throw new Error("Internal test entitlements are not available in the live billing environment");
  }
  if (!args.reason.trim()) throw new Error("A recorded reason is required");

  const current = await readEntitlement(admin, args.userId);
  const end = new Date(Date.now() + (args.days ?? 30) * 86_400_000).toISOString();
  await admin.from("membership_entitlements").upsert(
    {
      user_id: args.userId,
      plan_key: args.planKey,
      status: "active",
      provider: "internal_test",
      environment,
      product_id: null,
      current_period_end: end,
      grace_until: null,
      cancel_at_period_end: false,
      last_verified_at: new Date().toISOString(),
      granted_by: args.actorUserId,
      grant_reason: args.reason.trim(),
    },
    { onConflict: "user_id" },
  );
  await recordEntitlementEvent(admin, {
    userId: args.userId,
    event: "internal_test_granted",
    fromStatus: current.status,
    toStatus: "active",
    provider: "internal_test",
    environment,
    planKey: args.planKey,
    actor: `user:${args.actorUserId}`,
    detail: { reason: args.reason.trim(), expires_at: end },
  });
  return readEntitlement(admin, args.userId);
}

export async function endInternalTestEntitlement(
  admin: SupabaseClient,
  args: { userId: string; actorUserId: string },
): Promise<Entitlement> {
  const current = await readEntitlement(admin, args.userId);
  if (current.provider !== "internal_test") return current;
  await admin
    .from("membership_entitlements")
    .update({ status: "revoked", current_period_end: null, grace_until: null })
    .eq("user_id", args.userId);
  await recordEntitlementEvent(admin, {
    userId: args.userId,
    event: "internal_test_revoked",
    fromStatus: current.status,
    toStatus: "revoked",
    provider: "internal_test",
    environment: current.environment,
    planKey: current.planKey,
    actor: `user:${args.actorUserId}`,
  });
  return readEntitlement(admin, args.userId);
}

/**
 * Restore: re-verify with the provider of record. No provider is configured in
 * V1, so this truthfully reports that nothing was found rather than inventing
 * an entitlement. Native StoreKit restore attaches here unchanged.
 */
export async function restoreEntitlement(
  admin: SupabaseClient,
  userId: string,
): Promise<{ entitlement: Entitlement; restored: boolean }> {
  const current = await readEntitlement(admin, userId);
  await recordEntitlementEvent(admin, {
    userId,
    event: "restore_attempted",
    fromStatus: current.status,
    toStatus: current.status,
    provider: current.provider,
    environment: entitlementEnvironment(),
    planKey: current.planKey,
    actor: "member",
  });
  return { entitlement: current, restored: current.entitled };
}

/**
 * Access gate for later activation. Roles are never a substitute for payment:
 * a founder or moderator is not automatically a paid member.
 */
export async function requireActiveMembership(
  admin: SupabaseClient,
  userId: string,
): Promise<Entitlement> {
  const e = await readEntitlement(admin, userId);
  const { MEMBERSHIP_REQUIRED } = await import("./membership");
  if (MEMBERSHIP_REQUIRED && !e.entitled) {
    throw new Error("Membership required");
  }
  return e;
}
