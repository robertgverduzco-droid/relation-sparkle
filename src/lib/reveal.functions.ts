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

export const confirmReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ member_note: z.string().max(2000).optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { confirmRevealFor } = await import("./reveal.server");
    return confirmRevealFor(context.supabase, context.userId, data.member_note ?? null);
  });
