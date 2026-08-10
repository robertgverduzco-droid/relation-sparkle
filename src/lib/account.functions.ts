// Account lifecycle: pause / resume / delete.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const setAccountPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ paused: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ is_paused: data.paused })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, paused: data.paused };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ confirm: z.literal("delete my account") }).parse(v),
  )
  .handler(async ({ context }) => {
    const { userId } = context;
    const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
    const result = await purgeMemberAndDeleteAuthUser(userId);
    return result;
  });

