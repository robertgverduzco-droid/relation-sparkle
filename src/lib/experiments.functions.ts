// Founder-controlled experiment administration. The warmth A/B override
// lives in public.personality_variant_overrides (service_role only); these
// functions are the sanctioned path and require the caller to hold the
// `founder` role. Not a member-facing setting.
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPersonalityVariant, type PersonalityVariant } from "./personality-variants";

async function requireFounder(supabase: unknown, userId: string): Promise<void> {
  const client = supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data: isFounder } = await client.rpc("has_role", {
    _user_id: userId,
    _role: "founder",
  });
  if (!isFounder) throw new Response("Forbidden", { status: 403 });
}

/** Set (or change) the personality variant for an account. Founder only. */
export const setPersonalityVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        variant: z.string().refine(isPersonalityVariant, { message: "unknown variant" }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireFounder(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("personality_variant_overrides")
      .upsert(
        { user_id: data.userId, variant: data.variant, set_by: context.userId },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, variant: data.variant as PersonalityVariant };
  });

/** Remove an account's override, returning it to standard Athena. */
export const clearPersonalityVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireFounder(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("personality_variant_overrides")
      .delete()
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true, userId: data.userId, variant: "standard" as PersonalityVariant };
  });

/** Read which variant an account is running. Founder only. */
export const getPersonalityVariant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireFounder(context.supabase, context.userId);
    const { resolvePersonalityVariant } = await import("./personality-variant.server");
    const variant = await resolvePersonalityVariant(data.userId);
    return { userId: data.userId, variant };
  });
