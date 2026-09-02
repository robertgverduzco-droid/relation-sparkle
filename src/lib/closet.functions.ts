// THE CLOSET — server functions.
//
// Member side records a playful interaction and nothing else: no charge, no
// policy change, no alternate model, no purchase flow. Founder side reads
// de-identified aggregates only.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

export const recordClosetInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        kind: z.enum(["closet_impression", "closet_click"]),
        surface: z.enum(["conversation", "live", "ui", "member_asked"]).default("conversation"),
        hadRapport: z.boolean().default(false),
        sessionId: z.string().uuid().nullish(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { recordClosetEvent } = await import("./closet.server");
    await recordClosetEvent({
      userId: context.userId,
      kind: data.kind,
      surface: data.surface,
      hadRapport: data.hadRapport,
      sessionId: data.sessionId ?? null,
    });
    // Playful acknowledgement. Nothing unlocks, because there is nothing there.
    return { ok: true as const, reply: "Locked. The key costs $550 a week and I've hidden it." };
  });

export const getClosetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { closetAnalytics } = await import("./closet.server");
    return closetAnalytics();
  });

/**
 * Runtime observability. What Athena DECIDED, never what anyone said.
 * De-identified aggregates only, founder-gated like everything else here.
 */
export const getRuntimeDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { decisionAnalytics } = await import("./turn-decisions.server");
    return decisionAnalytics();
  });
