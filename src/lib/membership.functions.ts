// Thin wrapper. Runtime logic lives in ./membership.server.ts.
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { readEntitlement } = await import("./membership.server");
    return readEntitlement(supabaseAdmin, context.userId);
  });

export const selectMembershipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ planKey: z.enum(["monthly", "annual"]) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordPlanSelection } = await import("./membership.server");
    const { BILLING_ACTIVE } = await import("./membership");
    const entitlement = await recordPlanSelection(supabaseAdmin, context.userId, data.planKey);
    return { entitlement, billingActive: BILLING_ACTIVE };
  });

export const restoreMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { restoreEntitlement } = await import("./membership.server");
    return restoreEntitlement(supabaseAdmin, context.userId);
  });

/**
 * Non-billing test grant for internal builds. Never available in live billing,
 * and never available to an ordinary member: minting an entitlement is an
 * internal act, so the caller must hold `founder` or `admin`. Signing in is
 * not authorization.
 */
async function assertInternalActor(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> },
  userId: string,
): Promise<void> {
  const [{ data: isFounder }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (isFounder !== true && isAdmin !== true) {
    throw new Error("Not authorized.");
  }
}

export const startInternalTestMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ planKey: z.enum(["monthly", "annual"]).default("monthly"), reason: z.string().min(3).max(200) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertInternalActor(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { grantInternalTestEntitlement } = await import("./membership.server");
    return grantInternalTestEntitlement(supabaseAdmin, {
      userId: context.userId,
      planKey: data.planKey,
      actorUserId: context.userId,
      reason: data.reason,
    });
  });

export const endInternalTestMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertInternalActor(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { endInternalTestEntitlement } = await import("./membership.server");
    return endInternalTestEntitlement(supabaseAdmin, {
      userId: context.userId,
      actorUserId: context.userId,
    });
  });
