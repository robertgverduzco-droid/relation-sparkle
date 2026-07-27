// Thin wrapper. All helpers/schemas live in ./introductions.server.ts.
//
// Matchmaking design: cross-user reads and pair writes use the service-role
// admin client, loaded inside the handler. The caller is still authenticated
// via requireSupabaseAuth — Athena never reveals another user's private data
// to the caller; only the presentation she chose for them is returned.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  EXPLORATORY_MIN_AVG,
  STRONG_MIN_AVG,
  MIN_FACETS_EACH,
  MAX_INTRODUCTIONS_PER_USER,
  ageFromDob,
  mutuallyEligible,
  facetAverage,
  reasonPair,
  type FacetRow,
  type ProfileRow,
  type PrefsRow,
} from "./introductions.server";

export const considerIntroductions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Matchmaking requires reading other users' facets/prefs/profiles.
    // Use the service-role client for cross-user reads — it bypasses RLS
    // safely because this handler is server-only and Athena's outputs
    // never leak other users' raw data.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    // 1. Load self, including foundational-conversation completion.
    const [{ data: selfProfile }, { data: selfPrefs }, { data: selfFacets }, { data: selfIntel }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, birth_date, gender, city, is_paused")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_preferences")
          .select("user_id, seeking_genders, age_min, age_max, relationship_intent, wants_children")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("understanding_facets")
          .select("facet_key, understanding, reasoning, confidence")
          .eq("user_id", userId),
        supabase
          .from("user_intelligence")
          .select("last_interview_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    if (!selfProfile) return { ok: false, reason: "no_profile" };

    // Single authoritative eligibility rule for THIS caller (mirrors the
    // gate applied to every candidate below):
    //   1. Foundational conversation completed (last_interview_at set).
    //   2. AND enough facets refined at meaningful confidence.
    // Foundational completion is the primary gate. Facet count/confidence
    // are quality safeguards — a user who never completes the initial
    // conversation is never eligible, regardless of facet counts.
    if (!selfIntel?.last_interview_at) {
      return { ok: true, considered: 0, reason: "foundation_incomplete" };
    }

    const selfFacetRows = (selfFacets ?? []) as FacetRow[];
    if (selfFacetRows.length < MIN_FACETS_EACH || facetAverage(selfFacetRows) < EXPLORATORY_MIN_AVG) {
      return { ok: true, considered: 0, reason: "self_understanding_too_thin" };
    }

    // 2. Load candidate pool — everyone else who has completed foundation.
    const { data: eligibleIntel } = await supabase
      .from("user_intelligence")
      .select("user_id")
      .not("last_interview_at", "is", null)
      .neq("user_id", userId)
      .limit(500);
    const eligibleIds = new Set(
      (eligibleIntel ?? []).map((r) => r.user_id as string),
    );
    if (eligibleIds.size === 0) return { ok: true, considered: 0, reason: "no_pool" };

    const { data: others } = await supabase
      .from("profiles")
      .select("id, display_name, birth_date, gender, city, is_paused")
      .in("id", Array.from(eligibleIds))
      .eq("is_paused", false)
      .limit(200);

    if (!others || others.length === 0) {
      return { ok: true, considered: 0, reason: "no_pool" };
    }

    const otherIds = others.map((o) => o.id as string);
    const [{ data: otherPrefs }, { data: otherFacets }, { data: blocks }, { data: existingPairs }] =
      await Promise.all([
        supabase
          .from("user_preferences")
          .select("user_id, seeking_genders, age_min, age_max, relationship_intent, wants_children")
          .in("user_id", otherIds),
        supabase
          .from("understanding_facets")
          .select("user_id, facet_key, understanding, reasoning, confidence")
          .in("user_id", otherIds),
        supabase
          .from("blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
        supabase
          .from("pair_reasoning")
          .select("user_low, user_high, status")
          .or(`user_low.eq.${userId},user_high.eq.${userId}`),
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
    const selfBundle = {
      profile: selfProfile as ProfileRow,
      prefs: (selfPrefs as PrefsRow | null) ?? null,
      ageA: selfAge,
    };

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

    if (eligible.length === 0) return { ok: true, considered: 0, reason: "no_eligible" };

    eligible.sort(
      (x, y) => facetAverage(y.otherFacets) - facetAverage(x.otherFacets),
    );
    const toReason = eligible.slice(0, 6);

    let introduced = 0;
    for (const c of toReason) {
      if (introduced >= MAX_INTRODUCTIONS_PER_USER) break;

      const [low, high] =
        userId < c.other.id ? [userId, c.other.id] : [c.other.id, userId];
      const selfIsLow = userId === low;

      const object = await reasonPair({
        a: { name: (selfProfile.display_name as string) ?? "them", facets: selfFacetRows },
        b: { name: (c.other.display_name as string) ?? "them", facets: c.otherFacets },
      });

      const wantsIntroduction =
        object.status === "introduced" && object.confidence >= STRONG_MIN_AVG;

      const nowIso = new Date().toISOString();
      const presentedForLow = selfIsLow ? object.presentation_for_a : object.presentation_for_b;
      const presentedForHigh = selfIsLow ? object.presentation_for_b : object.presentation_for_a;

      const status: "considering" | "withheld" | "introduced" = wantsIntroduction
        ? "introduced"
        : object.status;
      const updateRow = {
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
        presented_to_a_at: wantsIntroduction && selfIsLow ? nowIso : null,
        presented_to_b_at: wantsIntroduction && !selfIsLow ? nowIso : null,
      };

      const { data: upserted, error: upErr } = await supabase
        .from("pair_reasoning")
        .upsert(updateRow, { onConflict: "user_low,user_high" })
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
          { pair_id: upserted.id, user_id: userId, response: "pending" },
          { onConflict: "pair_id,user_id" },
        );
      }
    }

    return { ok: true, considered: toReason.length, introduced };
  });

export const listMyIntroductions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: pairs } = await supabase
      .from("pair_reasoning")
      .select(
        "id, user_low, user_high, status, confidence, presentation_a, presentation_b, presented_to_a_at, presented_to_b_at, last_reasoned_at",
      )
      .or(
        `and(user_low.eq.${userId},presented_to_a_at.not.is.null),and(user_high.eq.${userId},presented_to_b_at.not.is.null)`,
      )
      .order("last_reasoned_at", { ascending: false })
      .limit(20);

    if (!pairs || pairs.length === 0) {
      return { introductions: [] as Array<{
        id: string;
        other_id: string;
        other_name: string;
        other_city: string | null;
        other_age: number | null;
        presentation: string | null;
        confidence: number;
        response: string;
        presented_at: string | null;
      }> };
    }

    const otherIds = pairs.map((p) =>
      (p.user_low as string) === userId ? (p.user_high as string) : (p.user_low as string),
    );
    const [{ data: profs }, { data: responses }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, city, birth_date")
        .in("id", otherIds),
      supabase
        .from("introduction_responses")
        .select("pair_id, response")
        .eq("user_id", userId)
        .in("pair_id", pairs.map((p) => p.id as string)),
    ]);

    const profMap = new Map<string, { display_name: string | null; city: string | null; birth_date: string | null }>();
    for (const p of profs ?? []) {
      profMap.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        city: (p.city as string | null) ?? null,
        birth_date: (p.birth_date as string | null) ?? null,
      });
    }
    const respMap = new Map<string, string>();
    for (const r of responses ?? []) respMap.set(r.pair_id as string, r.response as string);

    const shape = pairs.map((p) => {
      const isLow = p.user_low === userId;
      const otherId = isLow ? (p.user_high as string) : (p.user_low as string);
      const prof = profMap.get(otherId);
      return {
        id: p.id as string,
        other_id: otherId,
        other_name: prof?.display_name ?? "Someone",
        other_city: prof?.city ?? null,
        other_age: ageFromDob(prof?.birth_date ?? null),
        presentation: isLow ? (p.presentation_a as string | null) : (p.presentation_b as string | null),
        confidence: Number(p.confidence ?? 0),
        response: respMap.get(p.id as string) ?? "pending",
        presented_at: (isLow ? p.presented_to_a_at : p.presented_to_b_at) as string | null,
      };
    });

    return { introductions: shape };
  });

const respondInput = z.object({
  pair_id: z.string().uuid(),
  response: z.enum(["accepted", "declined", "deferred"]),
  note: z.string().max(500).optional(),
});

export const respondToIntroduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => respondInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pair } = await supabase
      .from("pair_reasoning")
      .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
      .eq("id", data.pair_id)
      .maybeSingle();

    if (!pair) throw new Error("Introduction not found");
    const isLow = pair.user_low === userId;
    const isHigh = pair.user_high === userId;
    if (!isLow && !isHigh) throw new Error("Not your introduction");
    if ((isLow && !pair.presented_to_a_at) || (isHigh && !pair.presented_to_b_at)) {
      throw new Error("Introduction has not been presented to you");
    }

    await supabase.from("introduction_responses").upsert(
      { pair_id: data.pair_id, user_id: userId, response: data.response, note: data.note ?? null },
      { onConflict: "pair_id,user_id" },
    );

    await supabase.from("introduction_feedback").insert({
      pair_id: data.pair_id,
      user_id: userId,
      kind: data.response,
      perspective: data.note ?? null,
      signals: {},
    });

    let connectionId: string | null = null;
    if (data.response === "accepted") {
      const { openConnectionIfMutual } = await import("./connections.functions");
      connectionId = await openConnectionIfMutual(supabase, data.pair_id);
    }

    return { ok: true, connection_id: connectionId };
  });
