// F-11 export — thin wrapper. Logic lives in ./export.server.ts.
//
// Gated by step-up reauthentication: a signed-in device alone must never be
// able to lift a member's whole inner life out of the system.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateMyExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertFeatureEnabled } = await import("./security.server");
    await assertFeatureEnabled("data_export");

    const { consumeStepUp } = await import("./step-up.server");
    await consumeStepUp(context.userId, "data_export");

    const { buildExport, recordExport, withinExportAllowance } = await import("./export.server");
    if (!(await withinExportAllowance(context.userId))) {
      throw new Error("You've already generated an export recently. Try again tomorrow.");
    }

    const bundle = await buildExport(context.supabase, context.userId);
    const json = JSON.stringify(bundle, null, 2);
    await recordExport(context.userId, bundle, json.length);
    return { ok: true as const, filename: `athena-export-${bundle.generated_at.slice(0, 10)}.json`, json };
  });
