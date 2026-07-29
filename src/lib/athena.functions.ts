// Thin wrapper: module scope contains only imports, types, and server-fn
// declarations. All helpers, prompts, and schemas live in ./athena.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import {
  askInput,
  askOutput,
  reflectInput,
  reflectSchema,
  athenaSystemPrompt,
  summarizeLivingProfile,
  summarizeTopicMap,
  CONFIDENCE_EPS,
  FACET_KEYS,
  TOPIC_KEYS,
  TOPIC_NEIGHBORS,
  type FacetRow,
  type TopicRow,
  type FacetKey,
  type TopicKey,
  type Json,
} from "./athena.server";

export const askAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => askInput.parse(v))
  .handler(async ({ data, context }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();

    const { supabase } = context;

    const [{ data: facetRows }, { data: topicRows }] = await Promise.all([
      supabase
        .from("understanding_facets")
        .select("facet_key, understanding, reasoning, evidence, confidence, needs_clarification, clarification_note, refined_at")
        .order("confidence", { ascending: false }),
      supabase
        .from("topic_map")
        .select("topic_key, status, confidence, importance, conversation_count, question_count, observations, related_topics, open_questions, needs_clarification, clarification_note, first_discussed_at, last_discussed_at"),
    ]);

    const facets = (facetRows ?? []) as FacetRow[];
    const topics = (topicRows ?? []) as TopicRow[];

    const profileSummary = summarizeLivingProfile(facets);
    const topicSummary = summarizeTopicMap(topics);

    const memoryBlock = `WHAT YOU ALREADY UNDERSTAND ABOUT THIS PERSON (your Living Profile — internal, never quote back verbatim):
${profileSummary}

TOPIC MAP — recent conversations:
${topicSummary.recent}

TOPIC MAP — introduced but under-explored (good candidates to gently revisit with a new angle):
${topicSummary.under}

TOPIC MAP — areas you have not yet touched (good candidates to branch into today):
${topicSummary.untouched}

OPEN CONTRADICTIONS to gently clarify when the moment feels natural:
${topicSummary.clarifications}

Use this memory to:
- avoid asking anything you already know
- weave in genuine callbacks to earlier understanding when it fits ("Earlier you told me…")
- gently revisit under-explored areas with a fresh angle
- eventually branch into untouched areas so your understanding of the whole person keeps growing
- never expose this map or list categories — speak naturally.`;

    const userTurns = data.messages.filter((m) => m.role === "user").length;
    const elapsed = data.elapsedMinutes ?? 0;
    // 12 min is an internal courtesy check-in only. The foundational
    // conversation itself is designed to last approximately 20 minutes.
    const shouldAcknowledgeTime = !data.timeAcknowledged && elapsed >= 12;

    const pacingHint =
      elapsed >= 22 || (elapsed >= 20 && userTurns >= 12)
        ? "You have now been speaking for around twenty minutes — the length this foundational conversation is designed for. If a natural resting place is near, warmly offer to continue another day. Do not cut them off; let the closing feel like a graceful pause, not an ending."
        : elapsed >= 18
          ? "You are approaching the natural length of this foundational conversation. Let it breathe. If a good pause presents itself, you may gently note it."
          : "Stay curious. There is time — the foundational conversation is designed to last approximately twenty minutes.";

    const timeHint = shouldAcknowledgeTime
      ? `You've now been talking for about ${Math.round(elapsed)} minutes. Somewhere naturally in this reply — not at the start — briefly acknowledge the time in your own words, out of respect for their schedule. Something in the spirit of: "I've realized we've been talking for about twelve minutes now — our foundational conversation is designed for around twenty, and I'm happy to keep going if that still works for you." Then either continue naturally or invite them to choose. Do this only once per conversation.`
      : "Do not comment on how long the conversation has been going.";

    const messages: ModelMessage[] = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: `${athenaSystemPrompt()}\n\n${memoryBlock}\n\n${pacingHint}\n\n${timeHint}`,
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    const reply = text.trim();
    const lowered = reply.toLowerCase();
    // Pacing is driven primarily by elapsed minutes (foundational = ~20 min),
    // with turn-count as a secondary signal so unusually terse users still
    // reach a natural close.
    const readyToOffer =
      (elapsed >= 20 && userTurns >= 10) || elapsed >= 24 || userTurns >= 16;
    const languageOffersReturn =
      /(another day|another time|pick this back up|come back|next time|good place to (pause|stop|rest))/.test(lowered);
    const offerReturn = readyToOffer && (languageOffersReturn || elapsed >= 22);
    const windDown = !offerReturn && (elapsed >= 18 || userTurns >= 12);
    const pacing = offerReturn ? "offer_return" : windDown ? "wind_down" : "continue";

    return askOutput.parse({ reply, pacing, timeAcknowledged: shouldAcknowledgeTime });
  });

export const reflectAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reflectInput.parse(v))
  .handler(async ({ data, context }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();

    const { supabase, userId } = context;

    const transcript = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "THEY" : "ATHENA"}: ${m.content}`)
      .join("\n\n");

    const [{ data: priorFacets }, { data: priorTopics }] = await Promise.all([
      supabase
        .from("understanding_facets")
        .select("facet_key, understanding, confidence"),
      supabase
        .from("topic_map")
        .select("topic_key, status, confidence, observations, open_questions"),
    ]);

    const priorFacetLines = (priorFacets ?? [])
      .filter((r) => (r.understanding ?? "").length > 0)
      .map((r) => `- ${r.facet_key} (${Math.round(Number(r.confidence ?? 0) * 100)}%): ${r.understanding}`)
      .join("\n") || "(none yet)";

    const priorTopicLines = (priorTopics ?? [])
      .map((r) => `- ${r.topic_key} [${r.status}, ${Math.round(Number(r.confidence ?? 0) * 100)}%]`)
      .join("\n") || "(none yet)";

    const { object } = await generateObject({
      model: gateway("openai/gpt-5.5"),
      schema: reflectSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `You are Athena, quietly refining your understanding of this person from the conversation so far.

Return two things:

1) FACETS — for any facet where the conversation offers genuine, non-speculative signal:
- key: one of ${FACET_KEYS.join(", ")}
- understanding: 1–3 sentences in your own considered voice
- reasoning: 1–2 sentences explaining why you currently hold this view
- evidence: 1–5 short direct quotes / near-quotes from THEY, each under 200 chars
- confidence: 0.1–0.9 (never 1.0; be conservative)
- contradictsPrior: true ONLY if today's signal materially conflicts with the prior understanding you already had
- clarificationNote: if contradictsPrior, one sentence naming what to gently clarify next time

2) TOPICS — for any topic Athena touched today (however briefly):
- key: one of ${TOPIC_KEYS.join(", ")}
- status: 'introduced' (touched lightly), 'explored' (2–3 meaningful questions), or 'deep' (extended, emotionally rich exchange)
- confidence: 0–1, how well you feel you now understand this area of their life
- importance: 0–1, how central this area seems to who they are (optional; omit if unclear)
- questionsAsked: how many meaningful questions Athena asked on this topic in this conversation
- observations: 1–4 short notes about what stood out
- openQuestions: 0–3 threads worth revisiting in a future conversation
- relatedTopics: up to 4 topic keys this connects to
- contradictsPrior / clarificationNote: same meaning as above

Rules:
- Skip facets and topics you cannot honestly support yet — fewer, better entries are correct
- Never invent quotes; evidence must come from THEY's words
- Prefer nuance over labels
- Understanding is provisional and will keep evolving

PRIOR FACETS (what you believed before today):
${priorFacetLines}

PRIOR TOPIC MAP:
${priorTopicLines}

CONVERSATION:

${transcript}`,
    });

    const now = new Date().toISOString();

    const facetKeys = object.facets.map((f) => f.key);
    const { data: existingFacets } = facetKeys.length
      ? await supabase
          .from("understanding_facets")
          .select("facet_key, understanding, reasoning, evidence, confidence")
          .in("facet_key", facetKeys)
      : { data: [] as FacetRow[] };

    const existing = new Map<string, {
      understanding: string | null;
      reasoning: string | null;
      evidence: Json;
      confidence: number;
    }>();
    for (const r of existingFacets ?? []) {
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
      needs_clarification: boolean;
      clarification_note: string | null;
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
      if (!materiallyChanged && !f.contradictsPrior) continue;

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

      const contradicts = Boolean(f.contradictsPrior && prev);
      const understanding = contradicts && prev?.understanding
        ? prev.understanding
        : f.understanding;
      const confidence = contradicts
        ? Math.min(prev?.confidence ?? f.confidence, f.confidence)
        : f.confidence;

      upserts.push({
        user_id: userId,
        facet_key: f.key,
        understanding,
        reasoning: f.reasoning,
        evidence: f.evidence,
        confidence,
        needs_clarification: contradicts,
        clarification_note: contradicts
          ? (f.clarificationNote ?? `New signal today conflicts with prior understanding: "${f.understanding}"`)
          : null,
        refined_at: now,
      });
    }

    if (historyInserts.length > 0) {
      await supabase.from("facet_history").insert(historyInserts);
    }
    if (upserts.length > 0) {
      await supabase.from("understanding_facets").upsert(upserts, { onConflict: "user_id,facet_key" });
    }

    const topicKeys = object.topics.map((t) => t.key);
    const { data: existingTopics } = topicKeys.length
      ? await supabase
          .from("topic_map")
          .select("topic_key, conversation_count, question_count, observations, open_questions, first_discussed_at, importance")
          .in("topic_key", topicKeys)
      : { data: [] as Array<{
          topic_key: string;
          conversation_count: number;
          question_count: number;
          observations: Json;
          open_questions: string[] | null;
          first_discussed_at: string | null;
          importance: number;
        }> };

    const existingTopicMap = new Map(
      (existingTopics ?? []).map((r) => [r.topic_key as string, r]),
    );

    const topicUpserts = object.topics.map((t) => {
      const prev = existingTopicMap.get(t.key);
      const prevObs: string[] = Array.isArray(prev?.observations)
        ? (prev!.observations as unknown as string[])
        : [];
      const mergedObs = [...prevObs, ...t.observations].slice(-12);
      const related = (t.relatedTopics && t.relatedTopics.length > 0
        ? t.relatedTopics
        : TOPIC_NEIGHBORS[t.key]) as TopicKey[];

      return {
        user_id: userId,
        topic_key: t.key,
        status: t.status,
        confidence: t.confidence,
        importance: t.importance ?? prev?.importance ?? 0.5,
        conversation_count: (prev?.conversation_count ?? 0) + 1,
        question_count: (prev?.question_count ?? 0) + t.questionsAsked,
        observations: mergedObs as unknown as Json,
        related_topics: related,
        open_questions: t.openQuestions,
        needs_clarification: Boolean(t.contradictsPrior),
        clarification_note: t.contradictsPrior ? (t.clarificationNote ?? null) : null,
        first_discussed_at: prev?.first_discussed_at ?? now,
        last_discussed_at: now,
      };
    });

    if (topicUpserts.length > 0) {
      await supabase.from("topic_map").upsert(topicUpserts, { onConflict: "user_id,topic_key" });
    }

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

    await supabase
      .from("pair_reasoning")
      .update({ is_stale: true, stale_reason: "understanding refined" })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    // Automatic matchmaking trigger: whenever Athena's understanding
    // materially deepens (facets changed) OR the foundational conversation
    // has just completed, reconsider introductions for this user in the
    // background. Cooldown inside runMatchmakingForUser prevents thrash.
    if (upserts.length > 0) {
      const { runMatchmakingForUser } = await import("./introductions.server");
      void runMatchmakingForUser(userId).catch(() => { /* silent */ });
    }

    return {
      ok: true,
      facetsRefined: upserts.length,
      topicsTouched: topicUpserts.length,
    };
  });

// Called by the client when the user accepts Athena's graceful close of the
// foundational conversation, or as a best-effort backup when they exit.
// Idempotent: safe to call multiple times. Marks the session complete and
// force-triggers matchmaking past the cooldown.
export const completeFoundationalConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    const { data: session } = await supabase
      .from("interview_sessions")
      .select("completed_at")
      .maybeSingle();
    const alreadyComplete = Boolean(session?.completed_at);

    if (!alreadyComplete) {
      await supabase
        .from("interview_sessions")
        .update({ completed_at: now })
        .eq("user_id", userId);
      // Ensure last_interview_at is set even if reflect hasn't run yet, so
      // the matchmaking eligibility gate opens.
      await supabase
        .from("user_intelligence")
        .upsert(
          { user_id: userId, last_interview_at: now },
          { onConflict: "user_id" },
        );
    }

    const { runMatchmakingForUser } = await import("./introductions.server");
    void runMatchmakingForUser(userId, { force: true }).catch(() => {});

    return { ok: true, alreadyComplete };
  });

