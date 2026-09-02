// Thin wrapper: module scope holds only imports, types and server-fn
// declarations. Every implementation lives in ./qa-harness.server.ts.
//
// Founder-only. Authority never travels in the payload: the caller is
// re-derived from the verified bearer token and the surface fails closed
// unless that account holds the `founder` role.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

export const getQaHarnessAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    return { allowed: await isFounder(context.userId) };
  });

export const runQaHarnessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        aiMatrix: z.enum(["none", "representative", "all"]).default("representative"),
        seed: z.boolean().default(false),
      })
      .parse(v ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertFounder } = await import("./synthetic.server");
    await assertFounder(context.userId);
    const { runQaHarness } = await import("./qa-harness.server");
    const { renderReport } = await import("./qa-harness");
    const report = await runQaHarness({ aiMatrix: data.aiMatrix, seed: data.seed });
    return { report, text: renderReport(report) };
  });
