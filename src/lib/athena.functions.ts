// Thin wrapper: module scope contains only imports, types, and server-fn
// declarations. All helpers, prompts, and schemas live in ./athena.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { structuredContextBlock, EMPTY_SELF, EMPTY_PREFERENCES } from "./structured-profile";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import {
  askInput,
  askOutput,
  reflectInput,
  transcriptInput,
  reflectSchema,
  athenaSystemPrompt,
  applyContextBudget,

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
import { runtimeDoctrine } from "./athena-doctrine.server";
import { LENS_LABELS, depthLicence, depthStage, lensForFacet, mergeEvidence } from "./profile-depth";

import { assessCoverage, foundationalGuidance } from "./foundational";
import { assessBoundary, boundaryGuidance, boundaryNotice } from "./boundaries";
import {
  assessFoundationalReadiness,
  REQUIRED_UNDERSTANDING_AREAS,
  introductionReadinessGuidance,
  asksAboutRequirement,
  asksToBeginMatching,
} from "./introduction-readiness";
import { decidePacing, respectTimeGuidance, turnsSinceContinueRequest, RESPECT_TIME_MINUTES } from "./pacing";
import { resolveReadinessClaim, readinessTruthGuidance, signatureFromReadiness } from "./readiness-truth";
import { earlyExitGuidance, readinessNotice, wantsToFinishFoundational } from "./early-exit";


export const askAthena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => askInput.parse(v))
  .handler(async ({ data, context }) => {
    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();

    const { supabase } = context;

    const [{ data: facetRows }, { data: topicRows }, { data: sessionRow }] = await Promise.all([
      supabase
        .from("understanding_facets")
        .select("facet_key, understanding, reasoning, evidence, basis, confidence, needs_clarification, clarification_note, refined_at")
        .order("confidence", { ascending: false }),
      supabase
        .from("topic_map")
        .select("topic_key, status, confidence, importance, conversation_count, question_count, observations, related_topics, open_questions, needs_clarification, clarification_note, first_discussed_at, last_discussed_at"),
      // Foundational mode is decided by the member's own record, never by the
      // caller: the client's flag may only ever narrow it, not grant it.
      supabase.from("interview_sessions").select("completed_at").maybeSingle(),
    ]);

    // Structured intake (member-stated) is context, not a replacement for her
    // conversation: she may explore what it means, never ask for it again.
    const [{ data: profileRow }, { data: prefsRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("height_cm, ethnicities, ethnicity_self_describe, religions, religion_self_describe, smoking")
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select(
          "ethnicity_openness, preferred_ethnicities, religion_openness, preferred_religions, height_min_cm, height_max_cm, height_strength, additional_notes, age_min, age_max, age_strength, wants_children, children_strength, smoking_openness, preferred_smoking",
        )

        .maybeSingle(),
    ]);
    const structuredBlock = structuredContextBlock(
      { ...EMPTY_SELF, ...(profileRow ?? {}) } as Parameters<typeof structuredContextBlock>[0],
      { ...EMPTY_PREFERENCES, ...(prefsRow ?? {}) } as Parameters<typeof structuredContextBlock>[1],
    );

    const facets = (facetRows ?? []) as FacetRow[];
    const topics = (topicRows ?? []) as TopicRow[];
    const isFoundational =
      !sessionRow?.completed_at && data.foundational !== false;


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

    // Selective retrieval draws only on the member's own recent words.
    const recentMemberText = data.messages
      .filter((m) => m.role === "user")
      .slice(-6)
      .map((m) => m.content)
      .join("\n");
    const doctrine = runtimeDoctrine("conversation", recentMemberText);

    const userTurns = data.messages.filter((m) => m.role === "user").length;
    const elapsed = data.elapsedMinutes ?? 0;
    // Respect for their time: acknowledged once, at approximately fifteen
    // minutes. It is a courtesy, never a deadline — time never overrides
    // readiness, in either direction.
    const shouldAcknowledgeTime = !data.timeAcknowledged && elapsed >= RESPECT_TIME_MINUTES;

    // Breadth-first orchestration, foundational mode only. The topic map is
    // written after a conversation, so during the first one it is empty for
    // the whole session; this recovers live coverage from the transcript.
    const coverage = isFoundational ? assessCoverage(data.messages) : null;
    const breadthHint = coverage ? foundationalGuidance(coverage) : "";

    // Matchmaking readiness is decided by persisted understanding, never by
    // the member's patience. Athena is told the truth about what she does and
    // does not yet understand so she cannot promise an introduction she is
    // not allowed to make; the server gate in readiness.server.ts enforces it
    // regardless of what is said here.
    const introReadiness = assessFoundationalReadiness(
      facets.map((f) => ({
        facet_key: f.facet_key as string,
        understanding: f.understanding ?? null,
        confidence: Number(f.confidence ?? 0),
      })),
    );
    // A readiness transition must correspond to genuinely new qualifying
    // understanding. Athena may not tell someone she needs more and then, one
    // "ok" later, say she has what she needs.
    const readinessSignature = signatureFromReadiness(
      introReadiness,
      REQUIRED_UNDERSTANDING_AREAS.map((a) => a.key),
    );
    const claim = resolveReadinessClaim({
      ready: introReadiness.ready,
      signature: readinessSignature,
      shortfallSignature: data.readinessShortfallSignature ?? null,
    });
    const readyNow = claim.ready;

    const lastMemberText =
      [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const pressed =
      !readyNow &&
      (asksAboutRequirement(lastMemberText) || asksToBeginMatching(lastMemberText));
    // Early exit is its own experience, never a boundary/safety notice.
    const wantsFinish = wantsToFinishFoundational(lastMemberText);
    // Completion at minimum readiness: the foundational conversation is a
    // threshold, not a collection exercise. Once it is met, Athena closes
    // warmly and briefly rather than continuing to gather.
    const completionHint =
      isFoundational && readyNow
        ? "You now hold enough foundational understanding to begin considering introductions. Bring this conversation to a close warmly and briefly — a few sentences at most. Say in your own words that you know enough to begin, that you will keep learning about them as you talk over time, and that they can return whenever they like. Do not recite, summarise or list back what you have learned about them. Do not describe their traits, give any rating or number, or ask another intake question. If they clearly want to keep talking, stay with them naturally — but do not restart the intake."
        : "";
    const readinessHint = [
      introductionReadinessGuidance(readyNow ? introReadiness : { ...introReadiness, ready: false }),
      readinessTruthGuidance(claim),
      completionHint,
      wantsFinish
        ? earlyExitGuidance(readyNow, introReadiness.missing.map((a) => a.label))
        : "",
      pressed
        ? "They have just asked about this directly. Answer it warmly and honestly in your own voice, hold the threshold without a number and without a timeframe, and then continue the conversation naturally with a real question."
        : "",
    ]
      .filter(Boolean)
      .join(" ");


    const basePacing =
      elapsed >= 22 || (elapsed >= 20 && userTurns >= 12)
        ? "You have now been speaking for around twenty minutes — the length this foundational conversation is designed for. If a natural resting place is near, warmly offer to continue another day. Do not cut them off; let the closing feel like a graceful pause, not an ending."
        : elapsed >= 18
          ? "You are approaching the natural length of this foundational conversation. Let it breathe. If a good pause presents itself, you may gently note it."
          : "Stay curious. There is time — the foundational conversation is designed to last approximately twenty minutes.";

    // Completion is breadth plus initial understanding, never exhaustive
    // depth: if the clock is running out while whole areas of their life are
    // still unseen, widen rather than dig.
    const pacingHint =
      coverage && !coverage.breadthSufficient && elapsed >= 14
        ? `${basePacing} There are still parts of their life you have not seen at all, so use the time that remains to widen rather than to deepen.`
        : basePacing;

    const timeHint =
      respectTimeGuidance({
        elapsedMinutes: elapsed,
        ready: readyNow,
        alreadyAcknowledged: Boolean(data.timeAcknowledged),
      }) || "Do not comment on how long the conversation has been going.";

    // Boundaries are session-aware: the same line held a second or third time
    // must not sound like the same warning replayed. Guidance sets posture
    // only; the words stay Athena's.
    const boundary = assessBoundary(data.messages);
    const boundaryHint = boundary ? boundaryGuidance(boundary, isFoundational) : "";

    // Post-foundational waiting. Ordinary ongoing conversation, with the
    // candidate-specific sentences unlocked strictly by verified runtime
    // state — never as a persuasion technique.
    let waitingHint = "";
    if (!isFoundational) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { evaluateWaitingState } = await import("./waiting.server");
        const { waitingGuidance } = await import("./waiting");
        waitingHint = waitingGuidance(await evaluateWaitingState(supabaseAdmin, context.userId));
      } catch {
        waitingHint = "";
      }
    }

    const rawMessages: ModelMessage[] = data.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Minimisation: enforce an explicit per-request ceiling on how much of
    // this member's inner life leaves the system (AI-PRIVACY-BOUNDARY.md).
    const budgeted = applyContextBudget(
      {
        fixed: [athenaSystemPrompt(), doctrine, pacingHint, timeHint, breadthHint, readinessHint, waitingHint, boundaryHint, structuredBlock].filter(Boolean),
        memory: memoryBlock,
      },
      rawMessages as Array<{ role: string; content: string }>,
    );



    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: budgeted.system,
      messages: budgeted.messages as ModelMessage[],
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });


    const reply = text.trim();
    // Pacing lives in ./pacing.ts and is time-anchored. Brevity is a
    // conversational style, never evidence of disengagement, so turn count
    // alone can no longer close a foundational conversation.
    const latestMember = [...data.messages].reverse().find((m) => m.role === "user");
    const pacing = decidePacing({
      elapsedMinutes: elapsed,
      userTurns,
      reply,
      latestMemberMessage: latestMember?.content ?? "",
      breadthSufficient: !coverage || coverage.breadthSufficient,
      readinessMet: isFoundational && readyNow,
      continueRequestedTurnsAgo: turnsSinceContinueRequest(data.messages),

    });



    const notice = boundary ? boundaryNotice(boundary) : null;

    return askOutput.parse({
      reply,
      pacing,
      timeAcknowledged: shouldAcknowledgeTime,
      ...(notice ? { notice } : {}),
      readiness: { ready: readyNow },
      readinessShortfallSignature: claim.shortfallSignature,
      // The notice is a reply to a question, never an interruption. It appears
      // only when the member actually asks about readiness or asks to be
      // matched — ordinary conversation is never interrupted by it.
      ...(asksAboutRequirement(lastMemberText) || asksToBeginMatching(lastMemberText)
        ? { readinessNotice: readinessNotice(readyNow) }
        : {}),
    });
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

    const [{ data: priorFacets }, { data: priorTopics }, { data: priorHistory }] =
      await Promise.all([
        supabase
          .from("understanding_facets")
          .select("facet_key, understanding, reasoning, evidence, basis, confidence, needs_clarification, clarification_note, refined_at"),
        supabase
          .from("topic_map")
          .select("topic_key, status, confidence, observations, open_questions"),
        supabase.from("facet_history").select("facet_key"),
      ]);

    // Depth architecture (docs: Living Profile depth & specialist lenses).
    // The reflection model previously received only a one-line summary of each
    // prior facet, so it rewrote a fresh short observation every pass instead
    // of synthesising across time. It now receives the standing understanding,
    // its reasoning, how much evidence supports it, how many times it has
    // already been refined, and the synthesis licence that earns.
    const historyCounts = new Map<string, number>();
    for (const h of priorHistory ?? []) {
      const k = (h as { facet_key: string }).facet_key;
      historyCounts.set(k, (historyCounts.get(k) ?? 0) + 1);
    }

    const priorFacetLines =
      (priorFacets ?? [])
        .filter((r) => (r.understanding ?? "").length > 0)
        .map((r) => {
          const key = r.facet_key as string;
          const evidence = Array.isArray(r.evidence) ? (r.evidence as unknown[]) : [];
          const stage = depthStage({
            evidenceCount: evidence.length,
            historyCount: historyCounts.get(key) ?? 0,
            confidence: Number(r.confidence ?? 0),
          });
          const lens = LENS_LABELS[lensForFacet(key)];
          const flag = r.needs_clarification
            ? ` [unresolved: ${r.clarification_note ?? "clarify gently"}]`
            : "";
          return [
            `- ${key} (lens: ${lens}; basis so far: ${r.basis ?? "unrecorded"}; evidence held: ${evidence.length}; times refined: ${historyCounts.get(key) ?? 0}; synthesis licence: ${depthLicence(stage)})${flag}`,
            `  standing understanding: ${r.understanding}`,
            r.reasoning ? `  why you hold it: ${r.reasoning}` : null,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n") || "(none yet)";

    const priorTopicLines =
      (priorTopics ?? [])
        .map((r) => `- ${r.topic_key} [${r.status}, ${Math.round(Number(r.confidence ?? 0) * 100)}%]`)
        .join("\n") || "(none yet)";


    const { object } = await generateObject({
      model: gateway("openai/gpt-5.5"),
      schema: reflectSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `You are Athena, quietly refining your understanding of this person from the conversation so far.

${runtimeDoctrine("reflection")}

Return two things:

1) FACETS — for any facet where the conversation offers genuine, non-speculative signal:
- key: one of ${FACET_KEYS.join(", ")}
- understanding: your standing synthesis of this facet — NOT a summary of today alone. Carry forward what still holds from PRIOR FACETS, fold in what today adds, and say plainly what has shifted. Length is governed per facet by the 'synthesis licence' shown in PRIOR FACETS; for a facet you have never held before, one or two careful sentences.
- reasoning: 1–2 sentences explaining why you currently hold this view
- evidence: 1–5 short direct quotes / near-quotes from THEY, each under 200 chars
- basis: 'stated' ONLY when THEY explicitly expressed this understanding in their own words; 'inferred' whenever you arrived at it by interpretation, pattern, tone, or implication — even if you can quote them. Never mark an interpretation as stated.
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

DEPTH (Living Profile depth model):
- Depth is earned by evidence, never by word count. Never pad, repeat, flatter, generalise into personality-test prose, or offer relationship advice. If you know little, say little — concise honesty beats fabricated depth.
- Never re-summarise a standing understanding into something shorter or vaguer than it already is. Only revise it when today gives you reason to deepen, qualify, contextualise, contradict or replace it.
- Where the licence allows more: distinguish context-dependent behaviour ("with people they trust… with strangers…"), name what has held over time versus what has changed, and name tension you cannot yet resolve rather than smoothing it over.
- Integration across lenses: where an observation in one facet genuinely illuminates another (communication and autonomy; conflict and attachment; attraction and pacing), draw that connection once, in the facet where it is most load-bearing. Do not restate the same observation in every facet.
- Mark a facet's basis honestly per revision: a synthesis you built across conversations is 'inferred' even when it quotes them.

- For physical_attraction_preferences specifically: write it in prose, in their terms, and make clear for anything they named whether it is a preference (something they generally like), a strong preference (meaningfully shapes attraction but leaves room), or a constraint (they indicate romantic attraction is unlikely or unavailable outside it). "Appearance matters little to me" and "attraction grows once I know someone" are complete, valid understandings — record them as such. Never rate, rank, score or judge anyone's appearance or their preferences, and never record a specification list of physical characteristics.



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
          .eq("user_id", userId)
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
      basis: "stated" | "inferred";
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
        evidence: mergeEvidence(prev?.evidence, f.evidence),
        basis: f.basis,
        confidence,
        needs_clarification: contradicts,
        clarification_note: contradicts
          ? (f.clarificationNote ?? `New signal today conflicts with prior understanding: "${f.understanding}"`)
          : null,
        refined_at: now,
      });
    }

    // A-07: Athena's private understanding is not member-writable. Members can
    // read their facets and topic map; only this server-side distillation
    // writes them, always scoped to the authenticated member.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (historyInserts.length > 0 || upserts.length > 0) {
      if (historyInserts.length > 0) {
        await supabaseAdmin.from("facet_history").insert(historyInserts);
      }
      if (upserts.length > 0) {
        await supabaseAdmin
          .from("understanding_facets")
          .upsert(upserts, { onConflict: "user_id,facet_key" });
      }
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
      await supabaseAdmin
        .from("topic_map")
        .upsert(topicUpserts, { onConflict: "user_id,topic_key" });
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

    await supabaseAdmin.from("user_intelligence").upsert(
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

    // Cross-member rows: never member-scoped, and never silently swallowed.
    const { error: staleError } = await supabaseAdmin
      .from("pair_reasoning")
      .update({ is_stale: true, stale_reason: "understanding refined" })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);
    if (staleError) throw new Error(staleError.message);

    // Automatic matchmaking trigger: whenever Athena's understanding
    // materially deepens (facets changed) OR the foundational conversation
    // has just completed, reconsider introductions for this user in the
    // background. Cooldown inside runMatchmakingForUser prevents thrash.
    if (upserts.length > 0) {
      const { evaluateReadiness } = await import("./readiness.server");
      await evaluateReadiness(supabaseAdmin, userId, "living_profile_update").catch(() => {});
      const { runMatchmakingForUser } = await import("./introductions.server");
      void runMatchmakingForUser(userId).catch(() => { /* silent */ });
    }

    // Athena's private post-conversation self-evaluation (observation only).
    // Fire-and-forget, strictly internal, never influences this or any future
    // prompt in Step 1. Failure is silent by design.
    {
      const { runSelfEvaluation } = await import("./self-evaluation.server");
      void runSelfEvaluation(userId, {
        messages: data.messages,
        hadFacetWrite: upserts.length > 0,
      }).catch(() => { /* silent */ });
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

    // Leaving early must never silently mark someone introduction-ready.
    // Readiness comes from persisted understanding, the same source the
    // matchmaking gate uses.
    const { data: facetRows } = await supabase
      .from("understanding_facets")
      .select("facet_key, understanding, confidence");
    const readiness = assessFoundationalReadiness(
      (facetRows ?? []).map((f) => ({
        facet_key: f.facet_key as string,
        understanding: (f.understanding as string | null) ?? null,
        confidence: Number(f.confidence ?? 0),
      })),
    );
    if (!readiness.ready && !alreadyComplete) {
      // Their progress is already persisted; they may leave and return.
      return { ok: true, alreadyComplete: false, ready: false };
    }

    // Foundational completion is system-owned state, and it is monotonic:
    // this is the only path that sets `completed_at`, and it never clears it.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!alreadyComplete) {
      const { error: completeError } = await supabaseAdmin
        .from("interview_sessions")
        .update({ completed_at: now })
        .eq("user_id", userId)
        .is("completed_at", null);
      if (completeError) throw new Error(completeError.message);
      // Ensure last_interview_at is set even if reflect hasn't run yet, so
      // the matchmaking eligibility gate opens.
      await supabaseAdmin
        .from("user_intelligence")
        .upsert(
          { user_id: userId, last_interview_at: now },
          { onConflict: "user_id" },
        );
    }

    // Readiness is re-evaluated first so the gate reflects the completed
    // foundational conversation before matchmaking asks the question.
    {
      const { evaluateReadiness } = await import("./readiness.server");
      await evaluateReadiness(supabaseAdmin, userId, "foundational_conversation_complete");
    }

    const { runMatchmakingForUser } = await import("./introductions.server");
    void runMatchmakingForUser(userId, { force: true }).catch(() => {});

    return { ok: true, alreadyComplete, ready: true };
  });


/**
 * Persist the foundational transcript.
 *
 * The browser used to upsert `interview_sessions` directly, including
 * `completed_at: null` — which silently regressed a member who had already
 * finished back into foundational mode on their next conversation. Completion
 * is monotonic and system-owned: this path writes the transcript only, and
 * never touches `completed_at`.
 */
export const saveConversationTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => transcriptInput.parse(v))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("interview_sessions")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const messages = data.messages as unknown as Json;
    const { error } = existing
      ? await supabaseAdmin
          .from("interview_sessions")
          .update({ messages })
          .eq("user_id", userId)
      : await supabaseAdmin
          .from("interview_sessions")
          .insert({ user_id: userId, messages });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
