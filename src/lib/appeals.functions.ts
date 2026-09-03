// Appeals — thin wrapper. Runtime logic lives in ./appeals.server.ts.
//
// Member-facing functions below need only a valid session. Founder-facing
// functions additionally check the founder role server-side on every call,
// failing closed with "Not found" -- same contract as photo-moderation.functions.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

/** The member's own hold, if any, and any appeal already filed against it. */
export const getHoldStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getMyHoldStatus } = await import("./appeals.server");
    return getMyHoldStatus(context.supabase, context.userId);
  });

/** File the one appeal a hold gets. */
export const submitAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ statement: z.string().min(1).max(2000) }).parse(v))
  .handler(async ({ data, context }) => {
    const { fileAppeal } = await import("./appeals.server");
    return fileAppeal(context.supabase, context.userId, data.statement.trim());
  });

export const getOpenAppealsForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { listOpenAppealsForFounder } = await import("./appeals.server");
    return listOpenAppealsForFounder();
  });

export const decideAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        appeal_id: z.string().uuid(),
        decision: z.enum(["grant", "uphold"]),
        note: z.string().max(1000).nullish(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { resolveAppealAsFounder } = await import("./appeals.server");
    return resolveAppealAsFounder(context.userId, data.appeal_id, data.decision, data.note ?? null);
  });
