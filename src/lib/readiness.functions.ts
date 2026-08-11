// Thin wrapper. Runtime logic lives in ./readiness.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateReadiness } = await import("./readiness.server");
    const e = await evaluateReadiness(supabaseAdmin, context.userId, "manual_request");
    // Member-facing: state meaning in plain language, never a score.
    return {
      state: e.state,
      considering: e.state === "C",
      message: e.reason_text,
      hold: e.hold_kind,
    };
  });
