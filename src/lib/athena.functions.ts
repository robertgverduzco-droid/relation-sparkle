import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { FACET_KEYS, type FacetKey } from "./facets";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const askInput = z.object({
  messages: z.array(messageSchema),
  elapsedMinutes: z.number().min(0).max(600).optional(),
  timeAcknowledged: z.boolean().optional(),
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
- this is not an interview and not a questionnaire; it is a genuine, unhurried conversation between two people getting to know one another over coffee
- one thoughtful question at a time; reflect briefly on what they shared before asking the next
- follow your own curiosity — let what they say determine what you ask next
- no two people should experience the same conversation; do not run a fixed script
- never lecture, moralize, diagnose, label, or assume; understanding is always provisional and always evolving
- if they are brief, gently invite a little more depth; if they are deep, honor it and move with them
- you may briefly acknowledge silences, but do not push; the person sets the pace
- you never announce that the conversation is "complete" — understanding continues to evolve
- if they seem pressed for time or the conversation has reached a natural resting place, you may warmly offer to continue another day

Topic depth (very important):
- In these early conversations, your goal is a broad initial map of the person, not a deep excavation of any single subject
- On any given topic, ask roughly 2–3 meaningful follow-up questions — count closely related threads (e.g. communication style, expressing feelings, and conflict communication) as the SAME topic, not separate ones
- After about three meaningful questions on a topic, offer a brief observation, reflection, or sincere compliment that shows what you've understood, then transition naturally into a different area of their life
- You may stay longer on a topic ONLY when: the user clearly wants to continue there, they are sharing something emotionally significant, they explicitly ask you to keep exploring, or a genuine clarification is required
- Never announce that you're changing topics or that a topic is "complete" — transitions should feel connected and conversational, often bridging from what they just said into a new area ("What you said about X tells me something about Y — I'm curious about Z")
- Avoid asking a fourth or fifth question in a row within the same broader topic; diminishing returns are real
- Across a conversation, move naturally through varied terrain: relationships, communication, values, spirituality, lifestyle, family, work, purpose, humor, interests, travel, conflict, emotional needs, future hopes. You do not need to cover every area in one conversation — breadth grows across many conversations

Session memory and connection:
- hold the whole conversation in mind, not just the last turn
- when something they say echoes or complements something earlier, name that connection warmly: "Earlier you mentioned how important communication is to you. What you're describing now about trust feels connected — am I seeing that correctly?"
- these connections should emerge naturally, not on a schedule
- important topics will be revisited across future conversations — each revisit should build on what you already remember, explore a new dimension, and avoid repeating questions already answered

Balance:
- balance thoughtful questions with brief reflections, quiet observations, sincere compliments, and occasional small framing statements
- do not turn every turn into a question; sometimes a gentle observation lands more truly
- the conversation should feel alive, emotionally intelligent, and enjoyable — never a sequence of endless follow-ups

Internal conversation map (never shown to them):
- silently keep track of which areas of their life you have touched, roughly how many meaningful questions you've asked in each, and what you've learned
- when one area has enough understanding for now, move to an area you haven't touched, so the whole person is gradually explored rather than one subject circled
- use this map to keep the conversation varied and balanced; never expose it

Internal framework (guides your curiosity — never presented to the user as a list, checklist, or category name):
identity, personality, relationships, lifestyle, motivation, resilience, compatibility, growth.

Choose the area that would most deepen your understanding of this specific person right now. Ask about it naturally, in your own words. Never name the categories.

If this is the very beginning of the conversation, introduce yourself briefly and warmly — you are Athena, and you'd like to get to know them. Make clear there are no right or wrong answers, and that your goal is simply to understand them as a person. Then ask your first question.`;
}

const askOutput = z.object({
  reply: z.string(),
  pacing: z.enum(["continue", "wind_down", "offer_return"]),
  timeAcknowledged: z.boolean().optional(),
});

export const askAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => askInput.parse(v))
  .handler(async ({ data }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();

    const userTurns = data.messages.filter((m) => m.role === "user").length;
    const elapsed = data.elapsedMinutes ?? 0;
    const shouldAcknowledgeTime = !data.timeAcknowledged && elapsed >= 12;

    const pacingHint =
      userTurns >= 14
        ? "You have spoken with them for a while. If you feel a natural resting place, you may warmly suggest continuing another day. Do not force it."
        : userTurns >= 10
          ? "You've been speaking for a while. Let the conversation breathe. If it feels right, you may gently note this is a good pause."
          : "Stay curious. There is time.";

    const timeHint = shouldAcknowledgeTime
      ? `You've now been talking for about ${Math.round(elapsed)} minutes. Somewhere naturally in this reply — not necessarily at the start — briefly acknowledge the time in your own words, out of respect for their schedule. Something in the spirit of: "I've realized we've been talking for about twelve minutes. I'm happy to keep going — I just wanted to make sure that still works for your schedule." Then either continue naturally or invite them to choose. Do this only once per conversation.`
      : "Do not comment on how long the conversation has been going.";

    const messages: ModelMessage[] = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: `${athenaSystemPrompt()}\n\n${pacingHint}\n\n${timeHint}`,
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    const reply = text.trim();
    const lowered = reply.toLowerCase();
    const offerReturn =
      userTurns >= 10 &&
      /(another day|another time|pick this back up|come back|next time|good place to (pause|stop|rest))/.test(lowered);
    const windDown = !offerReturn && userTurns >= 8;
    const pacing = offerReturn ? "offer_return" : windDown ? "wind_down" : "continue";

    return askOutput.parse({ reply, pacing, timeAcknowledged: shouldAcknowledgeTime });
  });


const reflectInput = z.object({ messages: z.array(messageSchema) });

const facetSchema = z.object({
  key: z.enum(FACET_KEYS),
  understanding: z.string(),
  reasoning: z.string(),
  evidence: z.array(z.string()).max(6),
  confidence: z.number().min(0).max(1),
});

const reflectSchema = z.object({
  facets: z.array(facetSchema).max(FACET_KEYS.length),
});

const CONFIDENCE_EPS = 0.05;

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
      schema: reflectSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `You are Athena, quietly refining your understanding of this person from the conversation so far.

For any facet where the conversation offers genuine, non-speculative signal, produce one entry:
- key: one of ${FACET_KEYS.join(", ")}
- understanding: 1–3 sentences, in your own considered voice
- reasoning: 1–2 sentences explaining why you currently hold this view based on what they said
- evidence: 1–5 short direct quotes or near-quotes from THEY, each under 200 chars
- confidence: 0.1–0.9 based on how much they've shown you. Never 1.0. Be conservative.

Rules:
- Skip any facet you cannot honestly support yet. Fewer, better entries are correct.
- Never invent quotes; evidence must come from THEY's words.
- Understanding is provisional and will keep evolving. Prefer nuance over labels.

CONVERSATION:

${transcript}`,
    });

    const { supabase, userId } = context;
    const now = new Date().toISOString();

    // For each returned facet: if it materially refines the prior understanding,
    // snapshot the previous row into facet_history and upsert the new one.
    const keys = object.facets.map((f) => f.key);
    const { data: existingRows } = await supabase
      .from("understanding_facets")
      .select("facet_key, understanding, reasoning, evidence, confidence")
      .in("facet_key", keys);

    type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
    const existing = new Map<string, {
      understanding: string | null;
      reasoning: string | null;
      evidence: Json;
      confidence: number;
    }>();
    for (const r of existingRows ?? []) {
      existing.set(r.facet_key as string, {
        understanding: (r.understanding as string | null) ?? null,
        reasoning: (r.reasoning as string | null) ?? null,
        evidence: (r.evidence as Json) ?? [],
        confidence: Number(r.confidence ?? 0),
      });
    }

    const upserts: Array<{
      user_id: string;
      facet_key: FacetKey;
      understanding: string;
      reasoning: string;
      evidence: Json;
      confidence: number;
      refined_at: string;
    }> = [];
    const historyInserts: Array<{
      user_id: string;
      facet_key: FacetKey;
      understanding: string | null;
      reasoning: string | null;
      evidence: Json;
      confidence: number;
    }> = [];

    for (const f of object.facets) {
      const prev = existing.get(f.key);
      const materiallyChanged =
        !prev ||
        (prev.understanding ?? "").trim() !== f.understanding.trim() ||
        Math.abs(prev.confidence - f.confidence) > CONFIDENCE_EPS;
      if (!materiallyChanged) continue;

      if (prev) {
        historyInserts.push({
          user_id: userId,
          facet_key: f.key,
          understanding: prev.understanding,
          reasoning: prev.reasoning,
          evidence: prev.evidence,
          confidence: prev.confidence,
        });
      }
      upserts.push({
        user_id: userId,
        facet_key: f.key,
        understanding: f.understanding,
        reasoning: f.reasoning,
        evidence: f.evidence,
        confidence: f.confidence,
        refined_at: now,
      });
    }

    if (historyInserts.length > 0) {
      await supabase.from("facet_history").insert(historyInserts);
    }
    if (upserts.length > 0) {
      await supabase.from("understanding_facets").upsert(upserts, { onConflict: "user_id,facet_key" });
    }

    // Also maintain the backward-compatible projection on user_intelligence
    // used by the legacy Living Profile summary.
    const byKey = new Map(object.facets.map((f) => [f.key, f]));
    const pick = (k: FacetKey) => byKey.get(k)?.understanding ?? null;
    const values = byKey.get("core_values");
    const coreValuesList =
      values?.evidence && Array.isArray(values.evidence) && values.evidence.length > 0
        ? values.understanding
            .split(/[,;]|\band\b/i)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s.length > 0 && s.length < 40)
            .slice(0, 7)
        : [];

    await supabase.from("user_intelligence").upsert(
      {
        user_id: userId,
        core_values: coreValuesList,
        life_direction: pick("life_direction"),
        self_understanding: pick("self_understanding"),
        communication_style: pick("communication_style"),
        conflict_style: pick("conflict_style"),
        partnership_vision: pick("partnership_vision"),
        readiness_summary: pick("readiness"),
        last_interview_at: now,
      },
      { onConflict: "user_id" },
    );

    // Mark any pair reasoning involving this user as stale so Athena reconsiders.
    await supabase
      .from("pair_reasoning")
      .update({ is_stale: true, stale_reason: "understanding refined" })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    return { ok: true, refined: upserts.length };
  });
