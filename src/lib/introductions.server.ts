// Server-only helpers for the introduction (matching) engine.
// Cross-user reads use the service-role admin client to bypass RLS while
// keeping user privacy: only Athena's server code ever sees other users'
// facets; nothing is returned to the caller other than the presentation
// Athena chooses for them.
import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

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
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  is_paused: boolean | null;
};

export type PrefsRow = {
  user_id: string;
  seeking_genders: string[] | null;
  age_min: number | null;
  age_max: number | null;
  relationship_intent: string | null;
  wants_children: string | null;
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

export function mutuallyEligible(
  a: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
  b: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
): boolean {
  if (a.profile.is_paused || b.profile.is_paused) return false;

  const checkOne = (
    self: { profile: ProfileRow; prefs: PrefsRow | null },
    other: { profile: ProfileRow; ageA: number | null },
  ) => {
    const p = self.prefs;
    if (!p) return true;
    if (p.seeking_genders && p.seeking_genders.length > 0 && other.profile.gender) {
      if (!p.seeking_genders.includes(other.profile.gender)) return false;
    }
    if (other.ageA != null) {
      if (p.age_min != null && other.ageA < p.age_min) return false;
      if (p.age_max != null && other.ageA > p.age_max) return false;
    }
    return true;
  };

  if (!checkOne(a, b)) return false;
  if (!checkOne(b, a)) return false;

  const ia = a.prefs?.relationship_intent ?? null;
  const ib = b.prefs?.relationship_intent ?? null;
  if (ia && ib && ia !== ib) return false;

  return true;
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
    .map(
      (r) =>
        `- ${r.facet_key} [confidence ${Number(r.confidence).toFixed(2)}]: ${r.understanding}`,
    )
    .join("\n");
}

export async function reasonPair(args: {
  a: { name: string; facets: FacetRow[] };
  b: { name: string; facets: FacetRow[] };
}) {
  const { createLovableGateway } = await import("./ai-gateway.server");
  const gateway = createLovableGateway();
  const { object } = await generateObject({
    model: gateway("openai/gpt-5.5"),
    schema: reasoningSchema,
    providerOptions: { lovable: { reasoningEffort: "none" } },
    prompt: `You are Athena. Consider whether these two people might be worth introducing.

HOW YOU DECIDE (governed by L6c Matchmaking Intelligence — never narrated as rules)
- You are not looking for a perfect match. You are looking for a meaningful possibility. An introduction is an invitation, never a prediction.
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabase = supabaseAdmin as SupabaseClient;

  const [{ data: selfProfile }, { data: selfPrefs }, { data: selfFacets }, { data: selfIntel }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, birth_date, gender, city, is_paused").eq("id", userId).maybeSingle(),
      supabase.from("user_preferences").select("user_id, seeking_genders, age_min, age_max, relationship_intent, wants_children").eq("user_id", userId).maybeSingle(),
      supabase.from("understanding_facets").select("facet_key, understanding, reasoning, confidence").eq("user_id", userId),
      supabase.from("user_intelligence").select("last_interview_at, last_matchmaking_at").eq("user_id", userId).maybeSingle(),
    ]);

  if (!selfProfile) return { ok: false, reason: "no_profile" };
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
    const [{ data: focused }, { data: holding }] = await Promise.all([
      supabase.from("relationship_focus").select("user_low, user_high").is("ended_at", null).not("started_at", "is", null),
      supabase.from("member_transitions").select("user_id, choice, hold_until").is("resolved_at", null),
    ]);
    for (const f of focused ?? []) {
      eligibleIds.delete(f.user_low as string);
      eligibleIds.delete(f.user_high as string);
    }
    for (const t of holding ?? []) {
      const restingOver =
        t.choice === "rest" &&
        t.hold_until &&
        new Date(t.hold_until as string).getTime() <= Date.now();
      if (t.choice === "resume" || restingOver) continue;
      eligibleIds.delete(t.user_id as string);
    }
    if (eligibleIds.size === 0) return { ok: true, considered: 0, reason: "no_pool" };
  }

  const { data: others } = await supabase
    .from("profiles")
    .select("id, display_name, birth_date, gender, city, is_paused")
    .in("id", Array.from(eligibleIds))
    .eq("is_paused", false)
    .limit(200);
  if (!others || others.length === 0) return { ok: true, considered: 0, reason: "no_pool" };

  const otherIds = others.map((o) => o.id as string);
  const [{ data: otherPrefs }, { data: otherFacets }, { data: blocks }, { data: existingPairs }] =
    await Promise.all([
      supabase.from("user_preferences").select("user_id, seeking_genders, age_min, age_max, relationship_intent, wants_children").in("user_id", otherIds),
      supabase.from("understanding_facets").select("user_id, facet_key, understanding, reasoning, confidence").in("user_id", otherIds),
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

  type Candidate = { other: ProfileRow; otherFacets: FacetRow[] };
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
    eligible.push({ other: o, otherFacets: oFacets });
  }
  if (eligible.length === 0) {
    await supabase.from("user_intelligence").update({ last_matchmaking_at: new Date().toISOString() }).eq("user_id", userId);
    return { ok: true, considered: 0, reason: "no_eligible" };
  }

  eligible.sort((x, y) => facetAverage(y.otherFacets) - facetAverage(x.otherFacets));
  const toReason = eligible.slice(0, 6);

  let introduced = 0;
  for (const c of toReason) {
    if (introduced >= remainingSlots) break;
    const [low, high] = userId < c.other.id ? [userId, c.other.id] : [c.other.id, userId];

    const object = await reasonPair({
      a: { name: (selfProfile.display_name as string) ?? "them", facets: selfFacetRows },
      b: { name: (c.other.display_name as string) ?? "them", facets: c.otherFacets },
    });
    const wantsIntroduction = object.status === "introduced";
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
      await supabase.from("introduction_responses").upsert(
        [
          { pair_id: upserted.id, user_id: low, response: "pending" },
          { pair_id: upserted.id, user_id: high, response: "pending" },
        ],
        { onConflict: "pair_id,user_id" },
      );
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
    supabase.from("understanding_facets").select("user_id, facet_key, understanding, reasoning, confidence").in("user_id", [userId, ...otherIds]),
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
      const nextStatus = wasIntroduced ? "introduced" : object.status;
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


