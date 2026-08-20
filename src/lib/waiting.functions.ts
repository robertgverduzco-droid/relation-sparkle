// Thin wrapper. Runtime logic lives in ./waiting.server.ts and ./waiting.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWaitingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateWaitingState } = await import("./waiting.server");
    const { waitingCopy } = await import("./waiting");
    const state = await evaluateWaitingState(supabaseAdmin, context.userId);
    // Only phase, the config flag and Athena's own words cross the boundary.
    // No candidate identity, no reasoning, no counts.
    return {
      phase: state.phase,
      earlyCommunity: state.earlyCommunity,
      hasCandidateInProgress: state.candidate === "unresolved_candidate",
      copy: waitingCopy(state),
    };
  });
