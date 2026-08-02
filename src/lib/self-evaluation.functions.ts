// Thin wrapper: module scope contains only imports, types, and server-fn
// declarations. All helpers, prompts, schemas, and runtime live in
// ./self-evaluation.server.ts.
//
// STEP 1 — OBSERVATION ONLY. This function generates and stores Athena's
// private self-evaluation. It has NO influence on any prompt, behavior,
// matchmaking decision, or member-facing surface, and there is deliberately
// no member-facing read function: these records are strictly internal.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { selfEvalInput, runSelfEvaluation } from "./self-evaluation.server";

export const evaluateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => selfEvalInput.parse(v))
  .handler(async ({ data, context }) => {
    const result = await runSelfEvaluation(context.userId, data);
    return { ok: true, ...result };
  });
