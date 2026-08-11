// Thin wrapper — founder/admin operational awareness. Logic in ./monitoring.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!(await isFounder(context.userId)) && !isAdmin) throw new Error("Not found");
    const { founderHealthSummary, runOpsCheck } = await import("./monitoring.server");
    let summary = await founderHealthSummary();
    if (!summary) {
      await runOpsCheck();
      summary = await founderHealthSummary();
    }
    return { health: summary };
  });
