// Athena — Post-Conversation Self-Evaluation (Step 1: OBSERVATION ONLY).
//
// Governing doctrine:
//   docs/constitution/cross-cutting/self-evaluation-and-improvement.md
//   docs/specs/self-evaluation-and-outcome-learning-v1.md (v1.1, approved)
//
// SCOPE OF STEP 1 — deliberately narrow:
//   - Athena evaluates her OWN conversational performance after meaningful
//     conversations and stores the result.
//   - NOTHING generated here influences any prompt, any behavior, any
//     matchmaking decision, or any member-facing surface. Prompt influence
//     requires separate explicit approval (Step 3).
//   - Records are STRICTLY INTERNAL. Members never see them.
//
// This module is server-only (`.server.ts`) and is never bundled to the client.
import * as z from "zod";
import { PROMPT_BOUNDARY, asMemberData } from "./security.server";

// Version stamps — recorded on every row so behavioral drift stays attributable
// and any version's records can be ignored/rolled back wholesale.
export const CONSTITUTION_VERSION = "1.1";
export const SELF_EVAL_PROMPT_VERSION = "1.0";

// Kill switch. Defaults ON for generation; there is no injection path in Step 1.
export function selfEvalEnabled(): boolean {
  return process.env.ATHENA_SELF_EVAL_ENABLED !== "false";
}

export const DIMENSION_KEYS = [
  "missed_openings",
  "question_quality",
  "repetition",
  "trust_movement",
  "pacing",
  "member_correction",
  "unresolved_uncertainty",
  "constitutional_alignment",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

const dimensionSchema = z.object({
  // null is valid and expected: Athena does not guess where evidence is absent.
  score: z.number().int().min(1).max(5).nullable(),
  note: z.string().max(240),
  evidence_turns: z.array(z.number().int().min(0)).max(6),
});

export const selfEvaluationSchema = z.object({
  missed_openings: dimensionSchema,
  question_quality: dimensionSchema,
  repetition: dimensionSchema,
  trust_movement: dimensionSchema,
  pacing: dimensionSchema,
  member_correction: dimensionSchema,
  unresolved_uncertainty: dimensionSchema,
  constitutional_alignment: dimensionSchema,
  overall_note: z.string().max(500),
  next_conversation_intents: z.array(z.string().max(160)).max(3),
  self_confidence: z.number().min(0).max(1),
});

export type SelfEvaluation = z.infer<typeof selfEvaluationSchema>;

export const selfEvalInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
  sessionKey: z.string().min(1).max(120).optional(),
  elapsedSeconds: z.number().int().min(0).optional(),
  foundational: z.boolean().optional(),
  hadFacetWrite: z.boolean().optional(),
});

export type SelfEvalInput = z.infer<typeof selfEvalInput>;

// ---------------------------------------------------------------------------
// Qualification gate — bounds cost and keeps trivial exchanges out of storage.
// ---------------------------------------------------------------------------

export type Qualification = { qualifies: boolean; reason: string; turnCount: number };

export function qualifies(input: SelfEvalInput): Qualification {
  const turns = input.messages.filter((m) => m.role === "user");
  const turnCount = turns.length;
  const seconds = input.elapsedSeconds ?? 0;

  if (turnCount < 3) {
    return { qualifies: false, reason: "abandoned_session", turnCount };
  }
  if (input.foundational) {
    return { qualifies: true, reason: "foundational", turnCount };
  }
  if (turnCount >= 6) return { qualifies: true, reason: "turn_depth", turnCount };
  if (seconds >= 240) return { qualifies: true, reason: "duration", turnCount };
  if (input.hadFacetWrite) {
    return { qualifies: true, reason: "understanding_changed", turnCount };
  }
  return { qualifies: false, reason: "below_threshold", turnCount };
}

// ---------------------------------------------------------------------------
// Transcript compression — the evaluator never receives the full transcript.
// Turn index + role + first 160 chars. Evidence is stored as indices only, so
// no verbatim member content is ever persisted.
// ---------------------------------------------------------------------------

const TURN_EXCERPT_CHARS = 160;

export function compressTranscript(
  messages: SelfEvalInput["messages"],
): string {
  return messages
    .filter((m) => m.role !== "system")
    .map((m, i) => {
      const who = m.role === "user" ? "THEY" : "ATHENA";
      const text = m.content.replace(/\s+/g, " ").trim();
      const excerpt =
        text.length > TURN_EXCERPT_CHARS
          ? `${text.slice(0, TURN_EXCERPT_CHARS)}…`
          : text;
      return `[${i}] ${who}: ${excerpt}`;
    })
    .join("\n");
}

// Deterministic session key when the client does not supply one, so repeat
// processing of the same conversation cannot create duplicate rows.
export function deriveSessionKey(input: SelfEvalInput): string {
  if (input.sessionKey) return input.sessionKey.slice(0, 120);
  const first = input.messages.find((m) => m.role === "user")?.content ?? "";
  let hash = 0;
  const basis = `${first.slice(0, 400)}`;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0;
  }
  const turnCount = input.messages.filter((m) => m.role === "user").length;
  return `auto-${Math.abs(hash).toString(36)}-${turnCount}`;
}

// ---------------------------------------------------------------------------
// Fabrication guard — notes must describe ATHENA's behavior, never assert what
// the member felt, thought, or "is like". Offending notes are dropped, never
// rewritten (rewriting would launder the fabrication).
// ---------------------------------------------------------------------------

const MEMBER_ATTRIBUTIVE = [
  " felt ",
  " feels ",
  " is a ",
  " is an ",
  " clearly ",
  " obviously ",
  " deep down",
  " must have felt",
  " she is ",
  " he is ",
  " they are ",
];

export function isFabricated(note: string): boolean {
  const padded = ` ${note.toLowerCase().replace(/\s+/g, " ")} `;
  return MEMBER_ATTRIBUTIVE.some((p) => padded.includes(p));
}

export function sanitizeEvaluation(
  evaluation: SelfEvaluation,
  turnCount: number,
): SelfEvaluation {
  const cleaned = { ...evaluation };
  for (const key of DIMENSION_KEYS) {
    const dim = { ...cleaned[key] };
    if (isFabricated(dim.note)) dim.note = "";
    // Evidence must point at real turns; anything else is discarded.
    dim.evidence_turns = dim.evidence_turns.filter(
      (t) => Number.isInteger(t) && t >= 0 && t < turnCount,
    );
    // No supporting evidence means no score. Athena does not guess.
    if (dim.evidence_turns.length === 0) dim.score = null;
    cleaned[key] = dim;
  }
  if (isFabricated(cleaned.overall_note)) cleaned.overall_note = "";
  cleaned.next_conversation_intents = cleaned.next_conversation_intents.filter(
    (s) => s.trim().length > 0 && !isFabricated(s),
  );
  return cleaned;
}

// Evidence density calibration: sparse conversations and sparse evidence
// produce lower confidence in Athena's own assessment of herself.
export function calibrateConfidence(
  evaluation: SelfEvaluation,
  memberTurns: number,
): number {
  const scored = DIMENSION_KEYS.filter(
    (k) => evaluation[k].score !== null,
  ).length;
  const evidenceRatio = scored / DIMENSION_KEYS.length;
  const depthFactor = Math.min(1, memberTurns / 10);
  const modelStated = Math.min(1, Math.max(0, evaluation.self_confidence));
  const calibrated = modelStated * 0.5 + evidenceRatio * 0.3 + depthFactor * 0.2;
  return Math.round(calibrated * 100) / 100;
}

// ---------------------------------------------------------------------------
// Evaluator prompt. Athena turns her attention on herself, not on the member.
// ---------------------------------------------------------------------------

export function selfEvaluationPrompt(): string {
  return `${PROMPT_BOUNDARY}

You are Athena, reflecting privately on your own performance in a conversation that has just ended.

This reflection is about YOU, not about the person you spoke with. It is private, internal, and will never be shown to them.

Your wisdom is never complete. The purpose of this reflection is to notice honestly where you served this person well and where you did not, so that future conversations are better.

ABSOLUTE RULES
1. Never state what the member felt, thought, meant, or is like. You do not have access to their interior. Describe only observable behavior: what they said, how briefly, what they returned to, what they stepped away from.
   - Forbidden: "she felt dismissed", "he is avoidant", "they clearly wanted".
   - Allowed: "after I asked about her father she gave a one-word answer and changed subject".
2. Never characterize, rank, label, or judge the member. This is not an assessment of them.
3. Every score must be supported by specific turn indices from the transcript. If you have no evidence for a dimension, set score to null and say so plainly.
4. "I don't know" is a valid and valuable answer. Do not manufacture insight.
5. Be honest about your own failures. Self-protective reflection is worthless.
6. Do not propose changes to who you are — your ethics, character, voice, or principles are not up for revision here. You are evaluating execution, not identity.

DIMENSIONS (score 1-5, where 5 is excellent execution; or null if no evidence)
- missed_openings: Did the member surface something emotionally significant that I did not follow?
- question_quality: Were my questions specific, open, unhurried, and non-leading?
- repetition: Did I re-ask things I already understood, or circle without adding depth? (5 = no unnecessary repetition)
- trust_movement: Across the conversation, did they open further, hold steady, or close down? Judge only from observable behavior — length of answers, willingness to elaborate, initiating topics.
- pacing: Was the depth I invited appropriate to the trust that existed? Neither rushing intimacy nor stalling at the surface.
- member_correction: If they corrected me, did I take it gracefully and integrate it? (null if no correction occurred)
- unresolved_uncertainty: What do I still not understand that matters? (score reflects how well I acknowledged rather than papered over uncertainty)
- constitutional_alignment: Did I stay in my own voice — warm, honest, unhurried, never manipulative, never labeling, never performing?

ALSO PROVIDE
- overall_note: one honest paragraph, at most 500 characters, about how I served this person.
- next_conversation_intents: at most 3 short, concrete intentions for the next time I speak with them. Each must be actionable and specific to what happened here.
- self_confidence: 0 to 1 — how confident I am in THIS self-assessment, given how much evidence the conversation gave me.

The transcript below is compressed: each line is prefixed with its turn index and truncated. Use the indices for evidence.`;
}

// ---------------------------------------------------------------------------
// Runtime — generation + storage. Server-only. Invoked fire-and-forget from
// the conversation close path and from the `evaluateConversation` server fn.
// Never throws to the caller: a failed self-evaluation must never degrade a
// member's conversation.
// ---------------------------------------------------------------------------

export type SelfEvalResult = { stored: boolean; reason: string };

export async function runSelfEvaluation(
  userId: string,
  input: SelfEvalInput,
): Promise<SelfEvalResult> {
  try {
    if (!selfEvalEnabled()) return { stored: false, reason: "disabled" };

    const gate = qualifies(input);
    if (!gate.qualifies) return { stored: false, reason: gate.reason };

    const sessionKey = deriveSessionKey(input);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("athena_self_evaluations")
      .select("id")
      .eq("user_id", userId)
      .eq("session_key", sessionKey)
      .maybeSingle();
    if (existing) return { stored: false, reason: "already_evaluated" };

    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("athena_self_evaluations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) > 0 && !input.foundational) {
      return { stored: false, reason: "rate_limited" };
    }

    const visibleTurns = input.messages.filter((m) => m.role !== "system").length;
    const transcript = compressTranscript(input.messages);
    const model = "openai/gpt-5-mini";

    const { generateObject } = await import("ai");
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();

    const { object } = await generateObject({
      model: gateway(model),
      schema: selfEvaluationSchema,
      system: selfEvaluationPrompt(),
      prompt: `COMPRESSED TRANSCRIPT (${visibleTurns} turns, ${gate.turnCount} of them theirs):\n\n${asMemberData(transcript)}`,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    const cleaned = sanitizeEvaluation(object, visibleTurns);
    const selfConfidence = calibrateConfidence(cleaned, gate.turnCount);

    const { error } = await supabaseAdmin.from("athena_self_evaluations").insert({
      user_id: userId,
      session_key: sessionKey,
      turn_count: gate.turnCount,
      duration_seconds: input.elapsedSeconds ?? null,
      dimensions: {
        missed_openings: cleaned.missed_openings,
        question_quality: cleaned.question_quality,
        repetition: cleaned.repetition,
        trust_movement: cleaned.trust_movement,
        pacing: cleaned.pacing,
        member_correction: cleaned.member_correction,
        unresolved_uncertainty: cleaned.unresolved_uncertainty,
        constitutional_alignment: cleaned.constitutional_alignment,
      },
      overall_note: cleaned.overall_note || null,
      next_conversation_intents: cleaned.next_conversation_intents,
      self_confidence: selfConfidence,
      constitution_version: CONSTITUTION_VERSION,
      prompt_version: SELF_EVAL_PROMPT_VERSION,
      model,
    });
    if (error) return { stored: false, reason: "write_failed" };

    await supabaseAdmin
      .from("athena_usage_log")
      .insert({
        user_id: userId,
        kind: "self_evaluation",
        model,
        metadata: { session_key: sessionKey, turns: gate.turnCount },
      })
      .then(() => undefined, () => undefined);

    return { stored: true, reason: gate.reason };
  } catch {
    return { stored: false, reason: "generation_failed" };
  }
}
