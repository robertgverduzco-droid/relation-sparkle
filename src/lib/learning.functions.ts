// Thin wrapper. All logic lives in ./learning.server.ts.
//
// STEP 4 — SIGNAL RECORDING ONLY. Nothing here aggregates, promotes, or
// influences Athena's reasoning. Members cannot read outcome signals.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

const optOutInput = z.object({ opt_out: z.boolean() });

/** Member consent control: exclude my outcomes from cross-member learning. */
export const setLearningOptOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => optOutInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ learning_opt_out: data.opt_out })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, opt_out: data.opt_out };
  });

/** Admin-only review surface: counts per signal kind. No member data. */
export const summarizeOutcomeSignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("athena_outcome_signals")
      .select("signal_kind, valence, strength, reason_category, is_contradictory")
      .limit(5000);
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const key = (row as { signal_kind: string }).signal_kind;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return { total: (data ?? []).length, counts };
  });
