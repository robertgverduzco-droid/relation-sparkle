// Thin wrapper — F-12 device safety surface. Logic lives in ./step-up.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

const purposeSchema = z.enum([
  "account_deletion",
  "data_export",
  "security_change",
  "sign_out_everywhere",
]);

export const getAccountSecurity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { accountSecurityOverview } = await import("./step-up.server");
    return accountSecurityOverview(context.userId);
  });

export const verifyStepUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ password: z.string().min(1).max(200), purpose: purposeSchema }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { grantStepUp } = await import("./step-up.server");
    const res = await grantStepUp(context.userId, data.password, data.purpose);
    if (!res.ok) {
      if (res.reason === "rate_limited")
        throw new Error("Too many attempts. Try again in a few minutes.");
      if (res.reason === "unsupported")
        throw new Error(
          "This account signs in with Google. Add a password in security settings first.",
        );
      throw new Error("That password didn't match.");
    }
    return { ok: true };
  });

export const signOutEverywhere = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { consumeStepUp, signOutAllDevices } = await import("./step-up.server");
    await consumeStepUp(context.userId, "sign_out_everywhere");
    await signOutAllDevices(context.userId);
    return { ok: true };
  });
