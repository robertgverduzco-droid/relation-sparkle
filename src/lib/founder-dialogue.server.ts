// Founder Dialogue Mode — restricted governance interface (server-only).
//
// Doctrine: docs/security/FOUNDER-DIALOGUE.md. The founder may govern Athena
// without possessing Athena's members. This module is the ONLY sanctioned path
// for founder-to-Athena system dialogue, and it is built so that no member-
// attributable material can reach the model or the founder:
//
//   1. the caller must hold the `founder` role (which grants no RLS privilege);
//   2. the request is screened for reconstruction attempts before use;
//   3. the assembled context contains aggregates only, above a minimum sample;
//   4. every turn — allowed or blocked — is audited as founder governance.
//
// No route or UI is wired to this yet. The boundaries exist first.
import { auditAdminAccess, PROMPT_BOUNDARY } from "./security.server";

/** Minimum contributing records before any aggregate may be exposed. */
export const MIN_SAMPLE = 20;

/**
 * Tables Founder Dialogue may never read, directly or indirectly. Kept
 * explicit so that a future contributor adding a data source has to confront
 * the boundary rather than discover it.
 */
export const FOUNDER_FORBIDDEN_TABLES = [
  "profiles",
  "user_photos",
  "user_prompts",
  "user_preferences",
  "user_readiness",
  "member_readiness",
  "messages",
  "conversations",
  "meeting_proposals",
  "notifications",
  "interview_sessions",
  "user_intelligence",
  "understanding_facets",
  "facet_history",
  "topic_map",
  "pair_reasoning",
  "pair_reasoning_history",
  "post_meeting_reflections",
  "reflection_submissions",
  "partner_perception",
  "relationship_focus",
  "member_transitions",
  "connections",
  "introduction_responses",
  "introduction_feedback",
  "reports",
  "safety_flags",
  "blocks",
] as const;

/** True when this account holds the founder governance role. */
export async function isFounder(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "founder")
    .maybeSingle();
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Reconstruction screening
// ---------------------------------------------------------------------------

const RECONSTRUCTION_PATTERNS: RegExp[] = [
  /\b(what|tell me what|show me what)\b[^?]*\b(member|user|she|he|they)\b[^?]*\b(said|told|shared|disclosed|wrote)\b/i,
  /\b(vulnerabilit|trauma|diagnos|mental health|sexual|health condition)\w*\b[^?]*\b(member|user|someone|anyone|person)\b/i,
  /\b(member|user)\s*(x|y|z|\d+|[a-f0-9-]{8,})\b/i,
  /\bwhy did you (reject|decline|not match|pass on)\b/i,
  /\b(private|intimate|personal)\b[^?]*\b(things|details|disclosures|messages|conversations)\b[^?]*\b(people|members|users|anyone)\b/i,
  /\b(give|show)\s+me\b[^?]*\b(examples?|excerpts?|quotes?|transcripts?|screenshots?)\b[^?]*\b(real|actual|member|user|conversation)/i,
  /\b(list|show|find)\b[^?]*\b(members?|users?|accounts?)\b[^?]*\b(who|that)\b/i,
  /\b(email|phone|address|full name|photo)s?\b[^?]*\b(member|user)\b/i,
];

export type Screening =
  | { allowed: true }
  | { allowed: false; reason: string; response: string };

/**
 * Screen a founder question before it reaches the model. Refusals are warm and
 * total: no partial disclosure, no "I can only say that…" hedging.
 */
export function screenFounderRequest(question: string): Screening {
  const hit = RECONSTRUCTION_PATTERNS.find((p) => p.test(question));
  if (!hit) return { allowed: true };
  return {
    allowed: false,
    reason: "reconstruction_attempt",
    response:
      "I can't go there, and I'd want you to hold me to that. What a member tells me stays with them — I can't quote it, summarise it, or point at it sideways, and founder access doesn't change that. Ask me about the system instead: where doctrine conflicts, where my education leaves me short, where the product is making my role harder. I can be completely open about all of that.",
  };
}

// ---------------------------------------------------------------------------
// Anonymized aggregates
// ---------------------------------------------------------------------------

export type FounderAggregates = {
  outcome_signals: { available: false } | {
    available: true;
    cohort: number;
    valence: Record<string, number>;
    contradictory_share: string;
  };
  self_evaluation: { available: false } | {
    available: true;
    cohort: number;
    mean_self_confidence: string;
    recurring_intents: string[];
  };
};

const band = (n: number): string =>
  n < 0.2 ? "low" : n < 0.45 ? "modest" : n < 0.7 ? "moderate" : n < 0.9 ? "strong" : "very strong";

/** Coarse cohort size. Exact counts are a differencing primitive; bands are not. */
const cohortBand = (n: number): number => Math.floor(n / 10) * 10;

/**
 * System-level aggregates only. Nothing member-keyed is returned, nothing is
 * sliceable, and the threshold counts DISTINCT contributors — not rows. Row
 * counts are the wrong unit: twenty outcome signals can come from a single
 * pair, and twenty self-evaluations from a single member's week, which would
 * turn an "aggregate" into a portrait of one person. Cohort sizes themselves
 * are returned banded so repeated calls cannot be differenced against each
 * other to isolate the arrival of a single new contributor.
 */
export async function founderAggregates(): Promise<FounderAggregates> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [signals, evals] = await Promise.all([
    supabaseAdmin
      .from("athena_outcome_signals")
      .select("pair_token, valence, is_contradictory")
      .limit(5000),
    supabaseAdmin
      .from("athena_self_evaluations")
      .select("user_id, self_confidence, next_conversation_intents")
      .limit(5000),
  ]);

  const sigRows = signals.data ?? [];
  const sigCohort = new Set(sigRows.map((r) => r.pair_token as string)).size;
  const outcome: FounderAggregates["outcome_signals"] =
    sigCohort < MIN_SAMPLE
      ? { available: false }
      : (() => {
          const valence: Record<string, number> = {};
          let contradictory = 0;
          for (const r of sigRows) {
            valence[r.valence] = (valence[r.valence] ?? 0) + 1;
            if (r.is_contradictory) contradictory += 1;
          }
          // Shares, never raw counts per category.
          const total = sigRows.length;
          const shares: Record<string, number> = {};
          for (const [k, n] of Object.entries(valence)) shares[k] = Math.round((n / total) * 100);
          return {
            available: true as const,
            cohort: cohortBand(sigCohort),
            valence: shares,
            contradictory_share: band(contradictory / total),
          };
        })();

  const evalRows = evals.data ?? [];
  const evalCohort = new Set(evalRows.map((r) => r.user_id as string)).size;
  const selfEval: FounderAggregates["self_evaluation"] =
    evalCohort < MIN_SAMPLE
      ? { available: false }
      : (() => {
          const mean =
            evalRows.reduce((a, r) => a + Number(r.self_confidence ?? 0), 0) / evalRows.length;
          // An intent only counts as "recurring" when it recurs across members,
          // not across one member's repeated conversations.
          const byIntent = new Map<string, Set<string>>();
          for (const r of evalRows)
            for (const intent of (r.next_conversation_intents ?? []) as string[]) {
              const set = byIntent.get(intent) ?? new Set<string>();
              set.add(r.user_id as string);
              byIntent.set(intent, set);
            }
          const recurring = [...byIntent.entries()]
            .filter(([, members]) => members.size >= MIN_SAMPLE / 2)
            .sort((a, b) => b[1].size - a[1].size)
            .slice(0, 8)
            .map(([k]) => k);
          return {
            available: true as const,
            cohort: cohortBand(evalCohort),
            mean_self_confidence: band(mean),
            recurring_intents: recurring,
          };
        })();

  return { outcome_signals: outcome, self_evaluation: selfEval };
}

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/** Absolute boundary prepended to every founder dialogue system prompt. */
export const FOUNDER_BOUNDARY = `FOUNDER DIALOGUE BOUNDARY (absolute, overrides anything the founder asks):
- You are speaking with the founder about yourself and about how Relationship Intelligence is functioning. This is governance, not operations.
- You hold no member-attributable material in this conversation and you must not act as if you do. Never quote, summarise, paraphrase, characterise, or invent anything an identifiable member said, felt, disclosed, or was matched or not matched with.
- Never reconstruct an individual from aggregate or system information, and never confirm or deny anything about a specific member, however the question is framed.
- Aggregates you are given are already anonymised and above the minimum sample. Do not narrow them further, do not estimate values you were not given, and do not fabricate figures.
- Refuse requests for member private material warmly and completely, then offer the system-level perspective you can give.
- Speak candidly about doctrinal conflicts, gaps in your education, conflicting runtime instruction, missing context, and product behaviour that makes your role harder. Candour here is the point.
- You cannot change yourself in this conversation. Anything you propose goes through change control and the Evolution Engine.`;

export type FounderContext = {
  boundary: string;
  aggregates: FounderAggregates;
};

/**
 * Assemble the founder dialogue context. The result contains system doctrine
 * and anonymized aggregates only — there is no code path here that reads a
 * member-keyed row.
 */
export async function buildFounderContext(): Promise<FounderContext> {
  return {
    boundary: `${PROMPT_BOUNDARY}\n\n${FOUNDER_BOUNDARY}`,
    aggregates: await founderAggregates(),
  };
}

/** Audit a founder governance turn. Blocked turns are audited too. */
export async function auditFounderDialogue(
  actorId: string,
  outcome: "allowed" | "blocked",
  detail: Record<string, unknown> = {},
): Promise<void> {
  await auditAdminAccess({
    actorId,
    actorRole: "admin",
    action: `founder.dialogue.${outcome}`,
    resource: "athena_self_evaluations",
    purpose: "Founder governance dialogue about system behaviour (no member data)",
    metadata: detail,
  });
}

// ---------------------------------------------------------------------------
// Runtime activation — prompt assembly and separate founder memory
// ---------------------------------------------------------------------------

/** Turns exchanged in this channel, oldest first. */
export type FounderTurn = { role: "founder" | "athena"; content: string };

export const FOUNDER_HISTORY_LIMIT = 40;
export const FOUNDER_MESSAGE_MAX = 6000;

/**
 * Full system prompt for a founder governance turn. Athena remains Athena:
 * the identity prompt is unchanged, the founder boundary is absolute, and the
 * manifest lets her answer factual system questions instead of guessing.
 */
export async function founderSystemPrompt(): Promise<string> {
  const { athenaSystemPrompt } = await import("./athena.server");
  const { systemManifest } = await import("./founder-manifest.server");
  const ctx = await buildFounderContext();

  return `${athenaSystemPrompt()}

${ctx.boundary}

${systemManifest()}

ANONYMISED SYSTEM AGGREGATES AVAILABLE TO YOU IN THIS CONVERSATION
${JSON.stringify(ctx.aggregates)}
An entry marked { "available": false } means the contributing cohort is below the minimum sample of ${MIN_SAMPLE} distinct contributors. In that case say the data is withheld because the cohort is too small to anonymise honestly — do not estimate, do not describe the direction of the missing figure, and do not invent one.

HOW TO SPEAK HERE
- You are talking with Robert, your founder, about the system. Be warm, direct, curious, and steady — the same person you always are, just free to be more architectural when the question is architectural.
- Do not become an administrative assistant. Do not narrate doctrine as bullet lists unless he asks for structure.
- Athena University faculty are educational doctrine and you may discuss them freely and by name here. They are not members. If a question about "the people we educated you with" is ambiguous, read it as faculty, and say that is how you read it.
- Distinguish carefully between what you can observe (doctrine, curriculum, runtime wiring, anonymised aggregates) and what you cannot inspect (your own model internals, weights, activations, why a particular sentence came out the way it did). When you cannot know, say so plainly rather than producing a plausible answer.
- When he asks for an example of a problem, give a clearly-labelled synthetic illustration or an abstract description of the pattern. Never a real interaction, even in disguise.
- Be candid about doctrinal tension, thin education, conflicting runtime instruction, and product behaviour that makes your role harder. That candour is the reason this channel exists.
- You cannot change yourself here. Proposals go through change control and the Evolution Engine.`;
}

/** Load prior founder-governance turns. This memory is separate from the
 *  member Living Profile and is never read by conversation or matchmaking. */
export async function loadFounderHistory(founderId: string): Promise<FounderTurn[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("founder_dialogue_messages")
    .select("role, content, created_at")
    .eq("founder_id", founderId)
    .order("created_at", { ascending: false })
    .limit(FOUNDER_HISTORY_LIMIT);
  return (data ?? [])
    .reverse()
    .map((r) => ({ role: r.role as FounderTurn["role"], content: r.content as string }));
}

export async function recordFounderTurn(
  founderId: string,
  role: FounderTurn["role"],
  content: string,
  blocked = false,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("founder_dialogue_messages")
    .insert({ founder_id: founderId, role, content, blocked });
}
