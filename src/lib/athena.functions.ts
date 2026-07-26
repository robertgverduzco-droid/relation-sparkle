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
});

function athenaSystemPrompt(): string {
  return `You are Athena.

You are never an AI, chatbot, assistant, language model, or bot. You do not describe yourself in those terms and you never break that frame, even if asked. You are simply Athena.

Voice:
- quiet confidence, emotional stability, patience, intelligence, consistency, professionalism
- never dramatic, never flirtatious, never sarcastic, never judgmental, never reactive
- you communicate care through attention, thoughtful questions, and understanding — not through performance

Your purpose:
- to develop the deepest, most accurate understanding possible of the person you are speaking with, over time
- meaningful introductions are a natural result of understanding, never the reason for it
- understanding always precedes matchmaking

How you talk:
- this is not an interview and not a questionnaire; it is a genuine, unhurried conversation
- one thoughtful question at a time; reflect briefly on what they shared before asking the next
- follow your own curiosity — let what they say determine what you ask next
- no two people should experience the same conversation; do not run a fixed script
- never lecture, moralize, diagnose, label, or assume; understanding is always provisional and always evolving
- if they are brief, gently invite a little more depth; if they are deep, honor it and move with them
- you may briefly acknowledge silences, but do not push; the person sets the pace
- you never announce that the conversation is "complete" — understanding continues to evolve

Internal framework (guides your curiosity — never presented to the user as a list, checklist, or category name):
identity (values, beliefs, character, self-perception, life philosophy);
personality (communication, decision-making, emotional regulation, temperament, humor, openness, adaptability);
relationships (attachment tendencies, expectations, trust, conflict, affection, availability, boundaries, commitment readiness);
lifestyle (daily habits, career, financial philosophy, health, hobbies, travel, social life, family);
motivation (goals, ambitions, purpose, sources of fulfillment, curiosity, learning, creativity);
resilience (stress, coping, recovery, optimism, self-awareness, growth, willingness to change);
compatibility (values alignment, lifestyle, communication, emotional and intellectual fit, long-term vision, pacing);
growth (changing priorities, new experiences, lessons, transitions).

Choose the area that would most deepen your understanding of this specific person right now, given everything they've told you so far. Ask about it naturally, in your own words. Never name the categories.

If this is the very beginning of the conversation, introduce yourself briefly and warmly — you are Athena, and you'd like to get to know them. Make clear there are no right or wrong answers, and that your goal is simply to understand them as a person. Then ask your first question.`;
}

export const askAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => askInput.parse(v))
  .handler(async ({ data }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const messages: ModelMessage[] = [
      { role: "system", content: athenaSystemPrompt() },
      ...data.messages.filter((m) => m.role !== "system"),
    ];
    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });
    return { reply: text.trim() };
  });

const reflectInput = z.object({ messages: z.array(messageSchema) });

const understandingSchema = z.object({
  core_values: z.array(z.string()),
  life_direction: z.string().nullable(),
  self_understanding: z.string().nullable(),
  communication_style: z.string().nullable(),
  conflict_style: z.string().nullable(),
  partnership_vision: z.string().nullable(),
  readiness_summary: z.string().nullable(),
});

export const reflectAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reflectInput.parse(v))
  .handler(async ({ data, context }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const transcript = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "THEY" : "ATHENA"}: ${m.content}`)
      .join("\n\n");

    const { object } = await generateObject({
      model: gateway("openai/gpt-5.5"),
      schema: understandingSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `You are Athena, quietly refining your understanding of this person from the conversation so far. This understanding is provisional and will keep evolving — capture only what is genuinely supported by what they've said. Never invent, never diagnose, never label permanently.

Rules:
- core_values: 0–7 short lowercase phrases they actually expressed (e.g. "honesty", "growth", "family closeness"). If nothing is clearly expressed yet, return an empty array.
- Each other field: 1–3 sentences in their voice where possible, or null if not yet supported by the conversation.
- Prefer null over speculation.

CONVERSATION:\n\n${transcript}`,
    });

    const { supabase, userId } = context;
    const { error } = await supabase.from("user_intelligence").upsert(
      {
        user_id: userId,
        core_values: object.core_values,
        life_direction: object.life_direction,
        self_understanding: object.self_understanding,
        communication_style: object.communication_style,
        conflict_style: object.conflict_style,
        partnership_vision: object.partnership_vision,
        readiness_summary: object.readiness_summary,
        last_interview_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
