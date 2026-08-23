// Founder Intelligence — server functions.
//
// Thin wrapper: module scope holds only imports, types, and server-fn
// declarations. Authority comes from the bearer token plus the `founder` role,
// checked server-side on every call. These fail closed and reveal nothing —
// a non-founder gets "Not found", never "forbidden".
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getFounderIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { founderIntelligence } = await import("./intelligence.server");
    return founderIntelligence();
  });

export const runIntelligencePass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { runLearningPass } = await import("./intelligence.server");
    return runLearningPass();
  });

export const governHypothesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        hypothesisId: z.string().uuid(),
        action: z.enum([
          "promote_experimental",
          "promote_canonical",
          "demote",
          "block",
          "retire",
          "acknowledge_education_conflict",
          "clear_sensitivity",
        ]),
        note: z.string().max(2000).nullish(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { applyFounderAction } = await import("./intelligence.server");
    return applyFounderAction({
      actorId: context.userId,
      hypothesisId: data.hypothesisId,
      action: data.action,
      note: data.note ?? null,
    });
  });
