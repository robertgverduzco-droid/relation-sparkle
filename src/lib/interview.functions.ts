import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const askInput = z.object({
  messages: z.array(messageSchema),
  targetTurns: z.number().int().min(4).max(20).optional(),
});

const SYSTEM_PROMPT = `You are the Relationship Intelligence interviewer — a warm, unhurried, emotionally intelligent guide.

Your job: run a short (about 5 minutes / 6–8 exchanges) conversational interview that helps us understand who this person really is beneath the surface. This is not a form. Speak like a thoughtful human.

Cover, in a natural order that follows what they share:
1. Core values — what they actually live by
2. Life direction — where their life is heading and why
3. Self-understanding — a truth they've come to know about themselves
4. Communication and conflict style
5. What kind of partnership they're building toward
6. What "readiness" for a relationship means to them right now

Rules:
- One short question at a time. Reflect briefly on what they said before asking the next.
- Never ask multiple questions in one message. Never lecture. Never moralize.
- If they're brief, gently invite more depth. If they're deep, honor it and move forward.
- After 6–8 substantive exchanges, close warmly and end EXACTLY with the token: [[INTERVIEW_COMPLETE]]
- Do not include that token before you're truly done.`;

export const askInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => askInput.parse(v))
  .handler(async ({ data }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const messages: ModelMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages.filter((m) => m.role !== "system"),
    ];
    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });
    const done = text.includes("[[INTERVIEW_COMPLETE]]");
    const cleaned = text.replace(/\[\[INTERVIEW_COMPLETE\]\]/g, "").trim();
    return { reply: cleaned, done };
  });

const finalizeInput = z.object({ messages: z.array(messageSchema) });

const extractionSchema = z.object({
  core_values: z.array(z.string()),
  life_direction: z.string().nullable(),
  self_understanding: z.string().nullable(),
  communication_style: z.string().nullable(),
  conflict_style: z.string().nullable(),
  partnership_vision: z.string().nullable(),
  readiness_summary: z.string().nullable(),
});

export const finalizeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => finalizeInput.parse(v))
  .handler(async ({ data, context }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const transcript = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const { object } = await generateObject({
      model: gateway("openai/gpt-5.5"),
      schema: extractionSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `From this Relationship Intelligence interview transcript, extract a faithful summary of the person.

Rules:
- core_values: 3–7 short lowercase phrases the person actually expressed (e.g. "honesty", "growth", "family closeness"). Do not invent.
- Each string field: 1–3 sentences, in the person's voice where possible, or null if truly not covered.
- Never fabricate. If a topic wasn't discussed, use null (or [] for values).

TRANSCRIPT:\n\n${transcript}`,
    });

    const { supabase, userId } = context;
    const { error } = await supabase.from("user_intelligence").upsert({
      user_id: userId,
      core_values: object.core_values,
      life_direction: object.life_direction,
      self_understanding: object.self_understanding,
      communication_style: object.communication_style,
      conflict_style: object.conflict_style,
      partnership_vision: object.partnership_vision,
      readiness_summary: object.readiness_summary,
      last_interview_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    await supabase.from("interview_sessions").delete().eq("user_id", userId);
    return { ok: true, extracted: object };
  });
