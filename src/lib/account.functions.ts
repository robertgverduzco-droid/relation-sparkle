// Account lifecycle: pause / resume / delete.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

export const setAccountPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ paused: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // A-08: account state is not browser-writable; the verified server writes it.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin
      .from("profiles")
      .update({ is_paused: data.paused })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { evaluateReadiness } = await import("./readiness.server");
      await evaluateReadiness(supabaseAdmin, userId, "pause_change");
    }
    return { ok: true, paused: data.paused };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ confirm: z.literal("delete my account") }).parse(v),
  )
  .handler(async ({ context }) => {
    const { userId } = context;
    // F-12: a signed-in device alone can never destroy an account. The member
    // must have re-proved their password within the last few minutes; this
    // throws when no unexpired grant exists.
    const { consumeStepUp } = await import("./step-up.server");
    await consumeStepUp(userId, "account_deletion");
    const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
    const result = await purgeMemberAndDeleteAuthUser(userId);
    return result;
  });

