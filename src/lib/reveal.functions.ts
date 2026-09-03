// Thin wrapper. Runtime logic lives in ./reveal.server.ts and ./reveal.ts.
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The reveal (Rebuild Spec §5). Generated once readiness is met, reviewed by
 * the member, and required before the payment step.
 */
export const getReveal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadOrGenerateReveal } = await import("./reveal.server");
    return loadOrGenerateReveal(context.supabase, context.userId);
  });

/** "That's me — continue." The only action that ever confirms a reveal. */
export const confirmReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { confirmRevealFor } = await import("./reveal.server");
    return confirmRevealFor(context.supabase, context.userId);
  });

/**
 * "Something's off." Reopens the reveal for one AI re-review and always logs
 * the member's own words, whether or not a rewrite happens this time.
 */
export const flagReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ note: z.string().min(1).max(2000) }).parse(v))
  .handler(async ({ data, context }) => {
    const { flagRevealFor } = await import("./reveal.server");
    return flagRevealFor(context.supabase, context.userId, data.note.trim());
  });
