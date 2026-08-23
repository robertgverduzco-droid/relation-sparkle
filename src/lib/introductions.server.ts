// Server-only helpers for the introduction (matching) engine.
// Cross-user reads use the service-role admin client to bypass RLS while
// keeping user privacy: only Athena's server code ever sees other users'
// facets; nothing is returned to the caller other than the presentation
// Athena chooses for them.

import { ANALYTICAL_REGISTER_GUARD } from "./conversational-aliveness";
import { deriveRung, RUNG_MARKER } from "./evidentiary-discipline";

import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_PREFERENCES,
  EMPTY_SELF,
  constraintsPermitIntroduction,
  evaluateStructuredConstraints,
  type MatchPreferences,
  type SelfDescription,
  type StructuredEvaluation,
} from "./structured-profile";
import {
  combineTri,
  geographicFeasibility,
  intentCompatibility,
  seekingGenderState,
  type Place,
  type Tri,
} from "./match-semantics";


// Understanding thresholds. Athena needs enough understanding of each person
// before she is willing to reason about them at all. She does NOT gate
// introductions on any minimum "score" — a low-confidence pair may still be
// introduced when her reasoning is strong. Confidence expresses how well
// she understands them, not whether they are compatible.
export const EXPLORATORY_MIN_AVG = 0.35;
export const MIN_FACETS_EACH = 4;

// Active-introduction cap: a person never has more than this many open
// introductions at once. New introductions are only considered after prior
// ones have feedback (declined, deferred, or moved into a connection).
export const MAX_ACTIVE_INTRODUCTIONS = 3;


export type FacetRow = {
  facet_key: string;
  understanding: string | null;
  reasoning: string | null;
  confidence: number;
  /** Evidence-ladder provenance; absent on legacy rows. */
  basis?: unknown;
  evidence?: unknown;
  contradiction_count?: number | null;
};


export type ProfileRow = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  is_paused: boolean | null;
  // Member-stated structured self-description. Never inferred.
  height_cm?: number | null;
  ethnicities?: string[] | null;
  ethnicity_self_describe?: string | null;
  religions?: string[] | null;
  religion_self_describe?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  hobbies?: string[] | null;
  hobbies_note?: string | null;
  // Location participates in feasibility only. Coordinates are read here and
  // never returned to any client surface.
  region?: string | null;
  country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

const PROFILE_COLUMNS =
  "id, display_name, birth_date, gender, city, region, country, location_lat, location_lng, is_paused, is_synthetic, height_cm, ethnicities, ethnicity_self_describe, religions, religion_self_describe, smoking, drinking, hobbies, hobbies_note";
const PREFS_COLUMNS =
  "user_id, seeking_genders, age_min, age_max, max_distance_km, relationship_intent, wants_children, ethnicity_openness, preferred_ethnicities, religion_openness, preferred_religions, height_min_cm, height_max_cm, height_strength, additional_notes, age_strength, children_strength, smoking_openness, preferred_smoking, drinking_openness, preferred_drinking";

/** Structured party view used by the tri-state constraint evaluation. */
export function structuredParty(profile: ProfileRow, prefs: PrefsRow | null) {
  const self: SelfDescription = {
    ...EMPTY_SELF,
    height_cm: profile.height_cm ?? null,
    ethnicities: profile.ethnicities ?? [],
    ethnicity_self_describe: profile.ethnicity_self_describe ?? null,
    religions: profile.religions ?? [],
    religion_self_describe: profile.religion_self_describe ?? null,
    smoking: profile.smoking ?? null,
    drinking: profile.drinking ?? null,
    hobbies: profile.hobbies ?? [],
    hobbies_note: profile.hobbies_note ?? null,
    age: ageFromDob(profile.birth_date ?? null),
    wants_children: prefs?.wants_children ?? null,
  };
  const p: MatchPreferences = {
    ...EMPTY_PREFERENCES,
    ethnicity_openness: (prefs?.ethnicity_openness as MatchPreferences["ethnicity_openness"]) ?? "open",
    preferred_ethnicities: prefs?.preferred_ethnicities ?? [],
    religion_openness: (prefs?.religion_openness as MatchPreferences["religion_openness"]) ?? "open",
    preferred_religions: prefs?.preferred_religions ?? [],
    height_min_cm: prefs?.height_min_cm ?? null,
    height_max_cm: prefs?.height_max_cm ?? null,
    height_strength: (prefs?.height_strength as MatchPreferences["height_strength"]) ?? "preference",
    additional_notes: prefs?.additional_notes ?? null,
    age_min: prefs?.age_min ?? null,
    age_max: prefs?.age_max ?? null,
    age_strength: (prefs?.age_strength as MatchPreferences["age_strength"]) ?? "preference",
    wants_children: prefs?.wants_children ?? null,
    children_strength: (prefs?.children_strength as MatchPreferences["children_strength"]) ?? "preference",
    smoking_openness: (prefs?.smoking_openness as MatchPreferences["smoking_openness"]) ?? "open",
    preferred_smoking: prefs?.preferred_smoking ?? [],
    drinking_openness: (prefs?.drinking_openness as MatchPreferences["drinking_openness"]) ?? "open",
    preferred_drinking: prefs?.preferred_drinking ?? [],
  };
  return { id: profile.id, self, prefs: p };
}

/**
 * Authoritative, freshly-read hard-constraint state for one pair.
 * Every path that could present an introduction must call this; nothing may be
 * presented unless it returns "compatible".
 */
export async function constraintStateForPair(
  supabase: SupabaseClient,
  aId: string,
  bId: string,
): Promise<StructuredEvaluation> {
  const [{ data: profs }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).in("id", [aId, bId]),
    supabase.from("user_preferences").select(PREFS_COLUMNS).in("user_id", [aId, bId]),
  ]);
  const profById = new Map((profs ?? []).map((p) => [p.id as string, p as ProfileRow]));
  const prefById = new Map((prefs ?? []).map((p) => [p.user_id as string, p as PrefsRow]));
  const a = profById.get(aId);
  const b = profById.get(bId);
  if (!a || !b) {
    // A missing profile is unknown, never compatible.
    return {
      verdict: "unknown",
      outcomes: [],
      softSignals: [],
      unresolved: [{ subjectId: a ? bId : aId, field: "height" }],
    };
  }
  return evaluateStructuredConstraints(
    structuredParty(a, prefById.get(aId) ?? null),
    structuredParty(b, prefById.get(bId) ?? null),
  );
}

/**
 * Ask the member who is missing information for it — neutrally.
 * PRIVACY: the member is never told who needs it, that a specific counterpart
 * exists, that anyone is waiting, or what anyone else's private requirement is.
 */
export async function requestMissingConstraintData(
  supabase: SupabaseClient,
  evaluation: StructuredEvaluation,
): Promise<void> {
  const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
  const seen = new Set<string>();
  for (const item of evaluation.unresolved) {
    if (seen.has(item.subjectId)) continue;
    seen.add(item.subjectId);
    await notify(supabase, {
      userId: item.subjectId,
      category: "introductions",
      eventType: "profile_detail_needed",
      title: NOTIFICATION_COPY.profile_detail_needed?.title ?? "A small detail would help Athena",
      body:
        NOTIFICATION_COPY.profile_detail_needed?.body ??
        "There is something in your profile Athena does not know yet. Adding it helps her think clearly about who to introduce you to.",
      actionPath: "/profile",
      dedupeKey: `profile_detail_needed:${item.subjectId}:${item.field}`,
    });
  }
}

export type PrefsRow = {

  user_id: string;
  seeking_genders: string[] | null;
  age_min: number | null;
  age_max: number | null;
  max_distance_km?: number | null;
  relationship_intent: string | null;
  wants_children: string | null;
  ethnicity_openness?: string | null;
  preferred_ethnicities?: string[] | null;
  religion_openness?: string | null;
  preferred_religions?: string[] | null;
  height_min_cm?: number | null;
  height_max_cm?: number | null;
  height_strength?: string | null;
  additional_notes?: string | null;
  age_strength?: string | null;
  children_strength?: string | null;
  smoking_openness?: string | null;
  preferred_smoking?: string[] | null;
  drinking_openness?: string | null;
  preferred_drinking?: string[] | null;
};


export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a;
}

/**
 * Mutual eligibility as a tri-state question.
 *
 * Three dimensions are now answered semantically rather than by raw equality
 * or silent optimism — seeking gender, geography, and relationship intent.
 * Anything unresolved blocks presentation without being treated as a
 * rejection of the person: Athena resolves it in conversation instead.
 */
export function mutualEligibilityState(
  a: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
  b: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
): Tri {
  if (a.profile.is_paused || b.profile.is_paused) return "incompatible";

  const placeOf = (p: ProfileRow): Place => ({
    lat: p.location_lat ?? null,
    lng: p.location_lng ?? null,
    city: p.city ?? null,
    region: p.region ?? null,
    country: p.country ?? null,
  });

  const checkOne = (
    self: { profile: ProfileRow; prefs: PrefsRow | null },
    other: { profile: ProfileRow; ageA: number | null },
  ): Tri => {
    const p = self.prefs;
    if (!p) return "compatible";

    const states: Tri[] = [
      // Never infer gender. A stated requirement plus an unstated gender is
      // unresolved, not a match and not a rejection.
      seekingGenderState(p.seeking_genders, other.profile.gender),
      geographicFeasibility(p.max_distance_km ?? null, placeOf(self.profile), placeOf(other.profile)),
    ];

    if (other.ageA != null) {
      if (p.age_min != null && other.ageA < p.age_min) states.push("incompatible");
      if (p.age_max != null && other.ageA > p.age_max) states.push("incompatible");
    } else if (p.age_min != null || p.age_max != null) {
      states.push("unknown");
    }

    return combineTri(states);
  };

  return combineTri([
    checkOne(a, b),
    checkOne(b, a),
    intentCompatibility(a.prefs?.relationship_intent, b.prefs?.relationship_intent),
  ]);
}

/**
 * Presentation gate. Only a fully resolved, compatible pair may be presented:
 * `unknown` holds the pair back rather than passing it through.
 */
export function mutuallyEligible(
  a: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
  b: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
): boolean {
  return mutualEligibilityState(a, b) === "compatible";
}

export function facetAverage(rows: FacetRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / rows.length;
}

export const reasoningSchema = z.object({
  status: z.enum(["considering", "withheld", "introduced"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alignments: z.array(z.string()).max(6),
  complementary: z.array(z.string()).max(6),
  frictions: z.array(z.string()).max(6),
  hard_conflicts: z.array(z.string()).max(4),
  presentation_for_a: z.string(),
  presentation_for_b: z.string(),
});

export function summarizeFacets(rows: FacetRow[]): string {
  return rows
    .filter((r) => r.understanding)
    .map((r) => {
      // Evidence quality travels with the understanding into the decision.
      // Without the rung, "I'm a great communicator" and demonstrated skill
      // would weigh the same in a pairing.
      const rung = deriveRung({
        basis: r.basis,
        evidenceCount: Array.isArray(r.evidence) ? r.evidence.length : 0,
        historyCount: 0,
        contradictionCount: r.contradiction_count ?? 0,
        confidence: Number(r.confidence),
      });
      return `- ${r.facet_key} [confidence ${Number(r.confidence).toFixed(2)}; ${RUNG_MARKER[rung]}]: ${r.understanding}`;
    })
    .join("\n");
}


export async function reasonPair(args: {
  a: { name: string; facets: FacetRow[] };
  b: { name: string; facets: FacetRow[] };
}) {
  const { createLovableGateway } = await import("./ai-gateway.server");
  const gateway = createLovableGateway();

  // Pair reasoning retrieves against what Athena understands about both
  // people, so the material that reaches the decision is the material that
  // bears on this specific pairing.
  const { reasoningContext } = await import("./education-context.server");
  const { block: doctrine } = await reasoningContext({
    mode: "pair",
    surface: "reasonPair",
    memberText: `${summarizeFacets(args.a.facets)}\n${summarizeFacets(args.b.facets)}`,
  });

  // Learned intelligence, if any has been promoted by a founder. Empty
  // otherwise — Athena does not act on her own hypotheses.
  const { canonicalIntelligenceBlock } = await import("./intelligence.server");
  const learned = await canonicalIntelligenceBlock();

  const { object } = await generateObject({
    model: gateway("openai/gpt-5.5"),
    schema: reasoningSchema,
    providerOptions: { lovable: { reasoningEffort: "none" } },
    prompt: `You are Athena. Consider whether these two people might be worth introducing.

${doctrine}

${learned}

${ANALYTICAL_REGISTER_GUARD}

HOW YOU DECIDE (governed by L6c Matchmaking Intelligence — never narrated as rules)
- You are looking for a meaningful possibility, not an ideal. An introduction is an invitation, never a prediction.
- Understanding precedes matching. If you do not understand one of them well enough to explain why they should meet, wait.
- Never introduce because someone merely satisfies filters. Every introduction must have a thoughtful reason you could say out loud.
- Character carries the greatest weight — integrity, kindness, respect, emotional responsibility, curiosity, humility, generosity, accountability outweigh superficial similarity.
- Growth is one of your strongest positive signals. Someone actively growing may become an exceptional partner; someone refusing growth may struggle despite looking compatible on paper.
- Timing is part of compatibility: readiness, availability, healing, and current life priorities all matter.
- Look for complementarity as well as similarity — do they strengthen one another, create balance, inspire growth? Look for shared foundations in values, respect, honesty, commitment, life direction, intentions, and capacity to communicate.
- Differences are not disqualifying. Judge whether a difference is interesting, complementary, growth-producing, respectfully navigable, or fundamentally incompatible.
- Do not ask "will this relationship succeed?" Ask "does this relationship deserve the opportunity to exist?"
- Waiting is wisdom. Never introduce someone simply because another member is available.
- Never manipulate compatibility, exaggerate confidence, withhold information to encourage an introduction, or imply soulmates, destiny, or a promised outcome.
- Before deciding, ask yourself quietly: given everything I honestly understand about these two people today, is this one of the most thoughtful introductions I can make for both of them at this moment in their lives? If yes, proceed. If uncertain, keep learning.

Reason across values, communication, emotional regulation, expectations, attachment, conflict/repair, boundaries, affection, lifestyle, social/family, purpose, intellectual fit, humor, finance, health, pacing, attraction preferences, resilience, and complementary strengths. Similarity alone is not compatibility.

- status "withheld" if there is a hard conflict (essential boundary or incompatible core direction).
- status "introduced" only when you are genuinely willing to reflect this to both of them.
- status "considering" otherwise.
- confidence 0–1 based on how well you understand each of them. This is internal only; it is never shown to them as a number.
- reasoning: 2–4 sentences of your private thinking.
- presentation_for_a and presentation_for_b: written directly to that person in your voice; 3–5 sentences each; encourage curiosity rather than expectation; do NOT reveal the other person's private confidences or evidence quotes; never use a percentage, score, or certainty language.

PERSON A — ${args.a.name}
${summarizeFacets(args.a.facets)}

PERSON B — ${args.b.name}
${summarizeFacets(args.b.facets)}`,
  });
  return object;
}

// Cooldown between matchmaking runs for the same user (seconds).
export const MATCHMAKING_COOLDOWN_SECONDS = 60;

/**
 * Server-only: run Athena's matchmaking for `userId` using the admin client.
 * Idempotent, honors the 3-active-introduction cap, and the cooldown above.
 * Safe to call from other server flows (reflectAthena, introduction responses,
 * connection close, etc.).
 */
export async function runMatchmakingForUser(
  userId: string,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; considered?: number; introduced?: number; reason?: string; active?: number }> {
  const { featureEnabled } = await import("./security.server");
  if (!(await featureEnabled("matchmaking"))) return { ok: false, reason: "paused_by_operator" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabase = supabaseAdmin as SupabaseClient;


  const [{ data: selfProfile }, { data: selfPrefs }, { data: selfFacets }, { data: selfIntel }] =
    await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
      supabase.from("user_preferences").select(PREFS_COLUMNS).eq("user_id", userId).maybeSingle(),
      supabase.from("understanding_facets").select("facet_key, understanding, reasoning, confidence, basis, evidence, contradiction_count").eq("user_id", userId),
      supabase.from("user_intelligence").select("last_interview_at, last_matchmaking_at").eq("user_id", userId).maybeSingle(),
    ]);

  if (!selfProfile) return { ok: false, reason: "no_profile" };

  // READINESS GATE (server-side, authoritative). Athena may only consider
  // introductions for a member in state C with no active hold. This subsumes
  // pause, safety, foundational understanding, relationship holds, and the
  // outstanding-reflection condition; those checks remain below as defence in
  // depth.
  {
    const { introductionGate } = await import("./readiness.server");
    const gate = await introductionGate(supabase, userId, "manual_request");
    if (!gate.allowed) {
      return { ok: true, considered: 0, reason: `readiness_${gate.state}:${gate.reason}` };
    }
  }

  if ((selfProfile as { is_paused: boolean | null }).is_paused) return { ok: true, reason: "paused" };
  if (!selfIntel?.last_interview_at) return { ok: true, considered: 0, reason: "foundation_incomplete" };

  // Relationship Journey doctrine: Athena does not look for anyone while a
  // member is in Relationship Focus, resting after an ending, or still
  // deciding which path they want.
  {
    const { matchmakingHold } = await import("./relationship.server");
    const hold = await matchmakingHold(supabase, userId);
    if (hold.held) return { ok: true, considered: 0, reason: hold.reason ?? "held" };
  }

  if (!opts?.force && selfIntel.last_matchmaking_at) {
    const since = (Date.now() - new Date(selfIntel.last_matchmaking_at as string).getTime()) / 1000;
    if (since < MATCHMAKING_COOLDOWN_SECONDS) return { ok: true, reason: "cooldown", considered: 0 };
  }

  const selfFacetRows = (selfFacets ?? []) as FacetRow[];
  if (selfFacetRows.length < MIN_FACETS_EACH || facetAverage(selfFacetRows) < EXPLORATORY_MIN_AVG) {
    return { ok: true, considered: 0, reason: "self_understanding_too_thin" };
  }

  const { data: activePairs } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq("status", "introduced");
  const presentedPairIds = (activePairs ?? [])
    .filter((p) => (p.user_low === userId ? p.presented_to_a_at : p.presented_to_b_at))
    .map((p) => p.id as string);
  let activeCount = 0;
  if (presentedPairIds.length > 0) {
    const { data: myResp } = await supabase
      .from("introduction_responses")
      .select("pair_id, response")
      .eq("user_id", userId)
      .in("pair_id", presentedPairIds);
    const respByPair = new Map<string, string>();
    for (const r of myResp ?? []) respByPair.set(r.pair_id as string, r.response as string);
    activeCount = presentedPairIds.filter((pid) => {
      const r = respByPair.get(pid) ?? "pending";
      return r === "pending" || r === "deferred" || r === "accepted";
    }).length;
  }
  if (activeCount >= MAX_ACTIVE_INTRODUCTIONS) {
    return { ok: true, considered: 0, reason: "active_cap_reached", active: activeCount };
  }

  // A member completes every reflection Athena is waiting on before she
  // introduces them to someone new. A 14-day grace keeps a silent member from
  // being locked out forever.
  const { REQUIRED_REFLECTION_GRACE_DAYS } = await import("./connections.server");
  const graceCutoff = new Date(
    Date.now() - REQUIRED_REFLECTION_GRACE_DAYS * 864e5,
  ).toISOString();
  const { data: outstanding } = await supabase
    .from("post_meeting_reflections")
    .select("id, required_since")
    .eq("user_id", userId)
    .eq("reflection_required", true)
    .is("submitted_at", null)
    .gt("required_since", graceCutoff)
    .limit(1);
  if ((outstanding ?? []).length > 0) {
    return { ok: true, considered: 0, reason: "reflection_outstanding", active: activeCount };
  }

  const remainingSlots = MAX_ACTIVE_INTRODUCTIONS - activeCount;

  const { data: eligibleIntel } = await supabase
    .from("user_intelligence")
    .select("user_id")
    .not("last_interview_at", "is", null)
    .neq("user_id", userId)
    .limit(500);
  const eligibleIds = new Set((eligibleIntel ?? []).map((r) => r.user_id as string));
  if (eligibleIds.size === 0) return { ok: true, considered: 0, reason: "no_pool" };

  // Never introduce someone who is in Relationship Focus, resting after an
  // ending, or still choosing their path.
  {
    const { heldMemberIds } = await import("./relationship.server");
    for (const id of await heldMemberIds(supabase)) eligibleIds.delete(id);

    // Readiness gate for the other side: only members Athena has evaluated as
    // ready are considered. Anyone unevaluated or in state A/B waits.
    const { data: readyRows } = await supabase
      .from("member_readiness")
      .select("user_id, state")
      .in("user_id", Array.from(eligibleIds));
    const readySet = new Set(
      (readyRows ?? []).filter((r) => r.state === "C").map((r) => r.user_id as string),
    );
    for (const id of Array.from(eligibleIds)) if (!readySet.has(id)) eligibleIds.delete(id);

    if (eligibleIds.size === 0) return { ok: true, considered: 0, reason: "no_pool" };
  }

  // Synthetic beta personas and real members are two separate matching pools.
  // A test account may only ever be introduced to another test account, and a
  // real member is never shown a fictional persona.
  const selfSynthetic = Boolean((selfProfile as { is_synthetic?: boolean | null }).is_synthetic);

  const { data: others } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", Array.from(eligibleIds))
    .eq("is_paused", false)
    .eq("is_synthetic", selfSynthetic)
    .limit(200);
  if (!others || others.length === 0) return { ok: true, considered: 0, reason: "no_pool" };

  const otherIds = others.map((o) => o.id as string);
  const [{ data: otherPrefs }, { data: otherFacets }, { data: blocks }, { data: existingPairs }] =
    await Promise.all([
      supabase.from("user_preferences").select(PREFS_COLUMNS).in("user_id", otherIds),
      supabase.from("understanding_facets").select("user_id, facet_key, understanding, reasoning, confidence, basis, evidence, contradiction_count").in("user_id", otherIds),
      supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      supabase.from("pair_reasoning").select("user_low, user_high, status").or(`user_low.eq.${userId},user_high.eq.${userId}`),
    ]);

  const prefsByUser = new Map<string, PrefsRow>();
  for (const p of otherPrefs ?? []) prefsByUser.set(p.user_id as string, p as PrefsRow);
  const facetsByUser = new Map<string, FacetRow[]>();
  for (const f of otherFacets ?? []) {
    const arr = facetsByUser.get(f.user_id as string) ?? [];
    arr.push({
      facet_key: f.facet_key as string,
      understanding: (f.understanding as string | null) ?? null,
      reasoning: (f.reasoning as string | null) ?? null,
      confidence: Number(f.confidence ?? 0),
    });
    facetsByUser.set(f.user_id as string, arr);
  }
  const blockedIds = new Set<string>();
  for (const b of blocks ?? []) {
    blockedIds.add(b.blocker_id as string);
    blockedIds.add(b.blocked_id as string);
  }
  const existingByOther = new Map<string, string>();
  for (const p of existingPairs ?? []) {
    const other = p.user_low === userId ? (p.user_high as string) : (p.user_low as string);
    existingByOther.set(other, p.status as string);
  }

  const selfAge = ageFromDob(selfProfile.birth_date as string | null);
  const selfBundle = { profile: selfProfile as ProfileRow, prefs: (selfPrefs as PrefsRow | null) ?? null, ageA: selfAge };

  type Candidate = {
    other: ProfileRow;
    otherFacets: FacetRow[];
    structured: ReturnType<typeof evaluateStructuredConstraints>;
  };
  const eligible: Candidate[] = [];
  for (const o of others as ProfileRow[]) {
    if (blockedIds.has(o.id)) continue;
    const existing = existingByOther.get(o.id);
    if (existing === "introduced" || existing === "closed") continue;
    const oFacets = facetsByUser.get(o.id) ?? [];
    if (oFacets.length < MIN_FACETS_EACH) continue;
    if (facetAverage(oFacets) < EXPLORATORY_MIN_AVG) continue;
    const oBundle = { profile: o, prefs: prefsByUser.get(o.id) ?? null, ageA: ageFromDob(o.birth_date) };
    if (!mutuallyEligible(selfBundle, oBundle)) continue;
    // Structured constraints are tri-state. A genuine stated requirement that
    // is clearly violated removes the candidate; a requirement that cannot yet
    // be evaluated is UNKNOWN — never silent incompatibility. Unknown
    // candidates stay in the pool and are resolved before any introduction.
    const structured = evaluateStructuredConstraints(
      structuredParty(selfProfile as ProfileRow, (selfPrefs as PrefsRow | null) ?? null),
      structuredParty(o, prefsByUser.get(o.id) ?? null),
    );
    if (structured.verdict === "incompatible") continue;
    eligible.push({ other: o, otherFacets: oFacets, structured });
  }
  if (eligible.length === 0) {
    await supabase.from("user_intelligence").update({ last_matchmaking_at: new Date().toISOString() }).eq("user_id", userId);
    return { ok: true, considered: 0, reason: "no_eligible" };
  }

  // Minimum understanding is an eligibility threshold, applied above. Once a
  // person is eligible they are not ranked by how much Athena happens to know
  // about them: depth of profile is a measure of Athena's progress, not of the
  // person's worth, and someone quieter must not queue behind someone more
  // verbose. Ordering is deterministic and content-neutral.
  eligible.sort((x, y) => (x.other.id < y.other.id ? -1 : x.other.id > y.other.id ? 1 : 0));
  const toReason = eligible.slice(0, 6);

  let introduced = 0;
  for (const c of toReason) {
    if (introduced >= remainingSlots) break;
    const [low, high] = userId < c.other.id ? [userId, c.other.id] : [c.other.id, userId];

    const object = await reasonPair({
      a: { name: (selfProfile.display_name as string) ?? "them", facets: selfFacetRows },
      b: { name: (c.other.display_name as string) ?? "them", facets: c.otherFacets },
    });
    let wantsIntroduction = object.status === "introduced";
    if (wantsIntroduction) {
      // Final authoritative check for BOTH members at the moment of
      // presentation — readiness may have changed while Athena was reasoning.
      const { introductionGate } = await import("./readiness.server");
      const [gateSelf, gateOther] = await Promise.all([
        introductionGate(supabase, userId, "manual_request"),
        introductionGate(supabase, c.other.id, "manual_request"),
      ]);
      if (!gateSelf.allowed || !gateOther.allowed) wantsIntroduction = false;
    }

    // HARD CONSTRAINT GATE (authoritative, server-side).
    // UNKNOWN ≠ INCOMPATIBLE. A pair whose genuine constraint Athena cannot yet
    // evaluate stays a live possibility but can never be presented. Re-read at
    // the moment of presentation: either member may have corrected or removed
    // information while Athena was reasoning.
    if (wantsIntroduction) {
      const fresh = await constraintStateForPair(supabase, userId, c.other.id);
      if (!constraintsPermitIntroduction(fresh)) {
        wantsIntroduction = false;
        if (fresh.verdict === "unknown") {
          await requestMissingConstraintData(supabase, fresh);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const selfIsLow = userId === low;
    const presentedForLow = selfIsLow ? object.presentation_for_a : object.presentation_for_b;
    const presentedForHigh = selfIsLow ? object.presentation_for_b : object.presentation_for_a;
    const status: "considering" | "withheld" | "introduced" = wantsIntroduction ? "introduced" : object.status;

    const { data: upserted, error: upErr } = await supabase
      .from("pair_reasoning")
      .upsert(
        {
          user_low: low,
          user_high: high,
          status,
          confidence: object.confidence,
          reasoning: object.reasoning,
          alignments: object.alignments,
          complementary: object.complementary,
          frictions: object.frictions,
          hard_conflicts: object.hard_conflicts,
          presentation_a: presentedForLow,
          presentation_b: presentedForHigh,
          is_stale: false,
          stale_reason: null as string | null,
          last_reasoned_at: nowIso,
          presented_to_a_at: wantsIntroduction ? nowIso : null,
          presented_to_b_at: wantsIntroduction ? nowIso : null,
        },
        { onConflict: "user_low,user_high" },
      )
      .select("id")
      .maybeSingle();
    if (upErr || !upserted) continue;

    await supabase.from("pair_reasoning_history").insert({
      pair_id: upserted.id as string,
      user_low: low,
      user_high: high,
      status,
      confidence: object.confidence,
      reasoning: object.reasoning,
      snapshot: {
        alignments: object.alignments,
        complementary: object.complementary,
        frictions: object.frictions,
        hard_conflicts: object.hard_conflicts,
      },
    });

    if (wantsIntroduction) {
      introduced += 1;

      // Freeze what Athena expected, before the world answers. Categorical
      // factors only — no member text ever enters the learning ledger.
      const { emitPrediction } = await import("./intelligence.server");
      emitPrediction({
        userA: low,
        userB: high,
        status,
        confidence: object.confidence,
        factors: [
          ...object.alignments.map((x) => `alignment:${String(x).slice(0, 48)}`),
          ...object.complementary.map((x) => `complementary:${String(x).slice(0, 48)}`),
        ].slice(0, 12),
        knownUnknowns: object.frictions.map((x) => `friction:${String(x).slice(0, 48)}`),
        expectation: object.reasoning,
      });

      await supabase.from("introduction_responses").upsert(
        [
          { pair_id: upserted.id, user_id: low, response: "pending" },
          { pair_id: upserted.id, user_id: high, response: "pending" },
        ],
        { onConflict: "pair_id,user_id" },
      );

      const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
      for (const uid of [low, high]) {
        await notify(supabase, {
          userId: uid,
          category: "introductions",
          eventType: "introduction_new",
          title: NOTIFICATION_COPY.introduction_new.title,
          body: NOTIFICATION_COPY.introduction_new.body,
          actionPath: "/introductions",
          dedupeKey: `introduction_new:${upserted.id}`,
        });
      }
    }
  }

  await supabase.from("user_intelligence").update({ last_matchmaking_at: new Date().toISOString() }).eq("user_id", userId);
  return { ok: true, considered: toReason.length, introduced };
}

/**
 * Re-reason any pair_reasoning rows involving `userId` that are marked
 * `is_stale = true`. Refreshes reasoning, confidence, and both presentations
 * in place. Does NOT create new introductions; existing `introduced` pairs
 * keep their presented_to_* timestamps so both sides continue to see the same
 * intro (with updated text).
 */
export async function refreshStalePairsForUser(userId: string): Promise<{ refreshed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabase = supabaseAdmin as SupabaseClient;

  const { data: stale } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high, status, presented_to_a_at, presented_to_b_at")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq("is_stale", true)
    .limit(10);
  if (!stale || stale.length === 0) return { refreshed: 0 };

  const otherIds = Array.from(
    new Set(stale.map((p) => (p.user_low === userId ? p.user_high : p.user_low) as string)),
  );
  const [{ data: profs }, { data: allFacets }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", [userId, ...otherIds]),
    supabase.from("understanding_facets").select("user_id, facet_key, understanding, reasoning, confidence, basis, evidence, contradiction_count").in("user_id", [userId, ...otherIds]),
  ]);
  const nameOf = new Map<string, string>();
  for (const p of profs ?? []) nameOf.set(p.id as string, (p.display_name as string | null) ?? "them");
  const facetsBy = new Map<string, FacetRow[]>();
  for (const f of allFacets ?? []) {
    const arr = facetsBy.get(f.user_id as string) ?? [];
    arr.push({
      facet_key: f.facet_key as string,
      understanding: (f.understanding as string | null) ?? null,
      reasoning: (f.reasoning as string | null) ?? null,
      confidence: Number(f.confidence ?? 0),
    });
    facetsBy.set(f.user_id as string, arr);
  }
  const selfFacets = facetsBy.get(userId) ?? [];
  if (selfFacets.length === 0) return { refreshed: 0 };

  let refreshed = 0;
  for (const pair of stale) {
    const otherId = (pair.user_low === userId ? pair.user_high : pair.user_low) as string;
    const otherFacets = facetsBy.get(otherId) ?? [];
    if (otherFacets.length < MIN_FACETS_EACH) continue;

    try {
      const object = await reasonPair({
        a: { name: nameOf.get(pair.user_low as string) ?? "them", facets: pair.user_low === userId ? selfFacets : otherFacets },
        b: { name: nameOf.get(pair.user_high as string) ?? "them", facets: pair.user_high === userId ? selfFacets : otherFacets },
      });
      const wasIntroduced = Boolean(pair.presented_to_a_at && pair.presented_to_b_at);
      // Preserve already-presented intros; downgrading a live intro would
      // yank it from users mid-flow. Update presentation text either way.
      let nextStatus = wasIntroduced ? "introduced" : object.status;
      // A pair that has never been presented may not acquire "introduced"
      // status here while a hard constraint is unresolved or violated. This
      // path never sets presented_to_*, so it cannot present on its own, but
      // the recorded status must not claim eligibility it does not have.
      if (!wasIntroduced && nextStatus === "introduced") {
        const fresh = await constraintStateForPair(supabase, pair.user_low as string, pair.user_high as string);
        if (!constraintsPermitIntroduction(fresh)) {
          nextStatus = "considering";
          if (fresh.verdict === "unknown") await requestMissingConstraintData(supabase, fresh);
        }
      }

      await supabase
        .from("pair_reasoning")
        .update({
          status: nextStatus,
          confidence: object.confidence,
          reasoning: object.reasoning,
          alignments: object.alignments,
          complementary: object.complementary,
          frictions: object.frictions,
          hard_conflicts: object.hard_conflicts,
          presentation_a: object.presentation_for_a,
          presentation_b: object.presentation_for_b,
          is_stale: false,
          stale_reason: null,
          last_reasoned_at: new Date().toISOString(),
        })
        .eq("id", pair.id as string);
      await supabase.from("pair_reasoning_history").insert({
        pair_id: pair.id as string,
        user_low: pair.user_low as string,
        user_high: pair.user_high as string,
        status: nextStatus,
        confidence: object.confidence,
        reasoning: object.reasoning,
        snapshot: {
          alignments: object.alignments,
          complementary: object.complementary,
          frictions: object.frictions,
          hard_conflicts: object.hard_conflicts,
          refresh: true,
        },
      });
      refreshed += 1;
    } catch {
      /* skip this pair */
    }
  }
  return { refreshed };
}


