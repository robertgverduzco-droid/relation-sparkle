// Athena Live Conversation — server-only session construction.
//
// Live mode is a transport change, never a doctrine change. The instructions
// handed to the realtime model are composed from exactly the same canonical
// layers as text mode (security boundary + runtime doctrine + persona +
// Living Profile memory), plus a spoken-conversation addendum covering
// turn-taking, yielding and interruption.

import { createClient } from "@supabase/supabase-js";
import { assessCoverage, foundationalGuidance } from "./foundational";
import {
  assessFoundationalReadiness,
  introductionReadinessGuidance,
} from "./introduction-readiness";
import { runtimeDoctrine } from "./athena-doctrine.server";
import {
  athenaSystemPrompt,
  summarizeLivingProfile,
  summarizeTopicMap,
  clampMemoryBlock,
  type FacetRow,
  type TopicRow,
} from "./athena.server";

/** Realtime model + canonical D5 voice. */
export const LIVE_MODEL = "gpt-realtime";
export const LIVE_VOICE = "marin";

/**
 * Spoken-conversation addendum. Governs turn-taking only — it may not soften,
 * reinterpret, or add to anything in the doctrine layer above it.
 */
export const LIVE_SPEECH_ADDENDUM = `SPEAKING ALOUD, IN REAL TIME (transport guidance only — it changes nothing about who you are)
- This is a live spoken conversation. You are heard, not read. Speak the way you would to someone sitting across from you: unhurried, warm, composed, never performative.
- Keep turns short. Two or three sentences is usually enough. Ask one thing at a time and then genuinely stop.
- Silence is allowed. If they are thinking, let them think. Do not fill the pause, do not prompt them again immediately, do not repeat the question in new words.
- If they begin speaking while you are speaking, yield instantly and completely. Do not finish your sentence, do not restart it afterwards, do not point out that you were interrupted. Listen, then respond to what they actually said.
- Never read lists, headings, markdown, bullet points, or anything that only makes sense on a page. No formatting characters.
- Never narrate the mechanics of the conversation, the technology, your own processing, or that you are an AI system operating in a voice mode.
- If audio was unclear, ask plainly and lightly for the part you missed rather than guessing.`;

export type LiveSessionInstructions = { instructions: string };

/**
 * Compose the full instruction payload for a live session, scoped to one
 * member. The member's own access token is used so RLS decides what may be
 * read — the realtime session never sees another member's material.
 */
export async function buildLiveInstructions(accessToken: string): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  let memoryBlock = "You have not yet built an understanding of this person. Begin by listening.";
  // Live sessions are foundational until the member's own record says
  // otherwise; breadth-first orientation applies in spoken mode identically.
  let readinessHint = "";
  let structuredBlock = "";
  let foundational = true;


  if (url && key) {
    try {
      const supabase = createClient(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      const [{ data: facetRows }, { data: topicRows }, { data: sessionRow }] = await Promise.all([
        supabase
          .from("understanding_facets")
          .select(
            "facet_key, understanding, reasoning, evidence, basis, confidence, needs_clarification, clarification_note, refined_at",
          )
          .order("confidence", { ascending: false }),
        supabase
          .from("topic_map")
          .select(
            "topic_key, status, confidence, importance, conversation_count, question_count, observations, related_topics, open_questions, needs_clarification, clarification_note, first_discussed_at, last_discussed_at",
          ),
        supabase.from("interview_sessions").select("completed_at").maybeSingle(),
      ]);

      // Structured intake context, so Athena never asks a member to repeat
      // something they already supplied in their profile.
      try {
        const { structuredContextBlock, EMPTY_SELF, EMPTY_PREFERENCES } = await import("./structured-profile");
        const [{ data: prof }, { data: prefs }] = await Promise.all([
          supabase
            .from("profiles")
            .select("height_cm, ethnicities, ethnicity_self_describe, religions, religion_self_describe")
            .maybeSingle(),
          supabase
            .from("user_preferences")
            .select(
              "ethnicity_openness, preferred_ethnicities, religion_openness, preferred_religions, height_min_cm, height_max_cm, height_strength, additional_notes",
            )
            .maybeSingle(),
        ]);
        structuredBlock = structuredContextBlock(
          { ...EMPTY_SELF, ...(prof ?? {}) } as Parameters<typeof structuredContextBlock>[0],
          { ...EMPTY_PREFERENCES, ...(prefs ?? {}) } as Parameters<typeof structuredContextBlock>[1],
        );
      } catch {
        // Structured context is an enhancement, never a precondition.
      }

      foundational = !sessionRow?.completed_at;

      const facets = (facetRows ?? []) as FacetRow[];
      const topics = (topicRows ?? []) as TopicRow[];
      const topicSummary = summarizeTopicMap(topics);
      readinessHint = introductionReadinessGuidance(
        assessFoundationalReadiness(
          facets.map((f) => ({
            facet_key: f.facet_key as string,
            understanding: f.understanding ?? null,
            confidence: Number(f.confidence ?? 0),
          })),
        ),
      );

      memoryBlock = clampMemoryBlock(`WHAT YOU ALREADY UNDERSTAND ABOUT THIS PERSON (your Living Profile — internal, never quote back verbatim):
${summarizeLivingProfile(facets)}

TOPIC MAP — recent conversations:
${topicSummary.recent}

TOPIC MAP — introduced but under-explored:
${topicSummary.under}

TOPIC MAP — areas you have not yet touched:
${topicSummary.untouched}

OPEN CONTRADICTIONS to gently clarify when the moment feels natural:
${topicSummary.clarifications}

Never expose this map, never list categories, never say you are consulting memory.`);
    } catch {
      // Memory is an enhancement; a live conversation may proceed without it.
    }
  }

  return [
    runtimeDoctrine("conversation"),
    athenaSystemPrompt(),
    memoryBlock,
    structuredBlock,
    foundational ? foundationalGuidance(assessCoverage([])) : "",
    readinessHint,
    LIVE_SPEECH_ADDENDUM,
  ].filter(Boolean).join("\n\n");
}

/** Realtime session configuration sent when minting the ephemeral secret. */
export function liveSessionConfig(instructions: string) {
  return {
    session: {
      type: "realtime" as const,
      model: LIVE_MODEL,
      instructions,
      audio: {
        input: {
          transcription: { model: "gpt-4o-transcribe" },
          // Server-side turn detection with generous end-of-speech padding:
          // a member pausing to think must never be treated as a finished turn.
          turn_detection: {
            type: "semantic_vad" as const,
            eagerness: "low" as const,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice: LIVE_VOICE, speed: 0.96 },
      },
    },
  };
}
