// Thin wrapper: module scope contains only imports, types, and server-fn
// declarations. All helpers, prompts, and schemas live in
// ./self-evaluation.server.ts.
//
// STEP 1 — OBSERVATION ONLY. This function generates and stores Athena's
// private self-evaluation. It has NO influence on any prompt, behavior,
// matchmaking decision, or member-facing surface, and there is deliberately
// no member-facing read function: these records are strictly internal.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject } from "ai";
import {
  selfEvalInput,
  selfEvaluationSchema,
  selfEvaluationPrompt,
  qualifies,
  compressTranscript,
  deriveSessionKey,
  sanitizeEvaluation,
  calibrateConfidence,
  selfEvalEnabled,
  CONSTITUTION_VERSION,
  SELF_EVAL_PROMPT_VERSION,
} from "./self-evaluation.server";

export const evaluateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => selfEvalInput.parse(v))
  .handler(async ({ data, context }) => {
    if (!selfEvalEnabled()) return { ok: true, stored: false, reason: "disabled" };

    const gate = qualifies(data);
    if (!gate.qualifies) {
      return { ok: true, stored: false, reason: gate.reason };
    }

    const { userId } = context;
    const sessionKey = deriveSessionKey(data);

    // Privileged: self-evaluations are service-role only by design. Loaded
    // inside the handler so the server-only module never enters a client graph.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency — one evaluation per session, ever.
    const { data: existing } = await supabaseAdmin
      .from("athena_self_evaluations")
      .select("id")
      .eq("user_id", userId)
      .eq("session_key", sessionKey)
      .maybeSingle();
    if (existing) return { ok: true, stored: false, reason: "already_evaluated" };

    // Rate limit: at most one self-evaluation per member per 30 minutes.
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("athena_self_evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) > 0 && !data.foundational) {
      return { ok: true, stored: false, reason: "rate_limited" };
    }

    const visibleTurns = data.messages.filter((m) => m.role !== "system").length;
    const transcript = compressTranscript(data.messages);
    const model = "openai/gpt-5-mini";

    let evaluation;
    try {
      const { createLovableGateway } = await import("./ai-gateway.server");
      const gateway = createLovableGateway();
      const result = await generateObject({
        model: gateway(model),
        schema: selfEvaluationSchema,
        system: selfEvaluationPrompt(),
        prompt: `COMPRESSED TRANSCRIPT (${visibleTurns} turns, ${gate.turnCount} of them theirs):\n\n${transcript}`,
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });
      evaluation = result.object;
    } catch {
      // Never blocks or degrades the member's experience.
      return { ok: true, stored: false, reason: "generation_failed" };
    }

    const cleaned = sanitizeEvaluation(evaluation, visibleTurns);
    const selfConfidence = calibrateConfidence(cleaned, gate.turnCount);

    const dimensions = {
      missed_openings: cleaned.missed_openings,
      question_quality: cleaned.question_quality,
      repetition: cleaned.repetition,
      trust_movement: cleaned.trust_movement,
      pacing: cleaned.pacing,
      member_correction: cleaned.member_correction,
      unresolved_uncertainty: cleaned.unresolved_uncertainty,
      constitutional_alignment: cleaned.constitutional_alignment,
    };

    const { error } = await supabaseAdmin.from("athena_self_evaluations").insert({
      user_id: userId,
      session_key: sessionKey,
      turn_count: gate.turnCount,
      duration_seconds: data.elapsedSeconds ?? null,
      dimensions,
      overall_note: cleaned.overall_note || null,
      next_conversation_intents: cleaned.next_conversation_intents,
      self_confidence: selfConfidence,
      constitution_version: CONSTITUTION_VERSION,
      prompt_version: SELF_EVAL_PROMPT_VERSION,
      model,
    });
    if (error) return { ok: true, stored: false, reason: "write_failed" };

    // Cost visibility, consistent with other Athena model usage.
    await supabaseAdmin
      .from("athena_usage_log")
      .insert({
        user_id: userId,
        kind: "self_evaluation",
        model,
        metadata: { session_key: sessionKey, turns: gate.turnCount },
      })
      .then(() => undefined, () => undefined);

    return { ok: true, stored: true, reason: gate.reason };
  });
