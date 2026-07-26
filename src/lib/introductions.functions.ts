import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject } from "ai";
import { z } from "zod";
import { FACET_KEYS } from "./facets";

// Confidence thresholds. Exploratory introductions require lower confidence
// on both sides; stronger introductions require more.
const EXPLORATORY_MIN_AVG = 0.35;
const STRONG_MIN_AVG = 0.55;
const MIN_FACETS_EACH = 4;
const MAX_INTRODUCTIONS_PER_USER = 2;

type FacetRow = {
  facet_key: string;
  understanding: string | null;
  reasoning: string | null;
  confidence: number;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  is_paused: boolean | null;
};

type PrefsRow = {
  user_id: string;
  seeking_genders: string[] | null;
  age_min: number | null;
  age_max: number | null;
  relationship_intent: string | null;
  wants_children: string | null;
};

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a;
}

function mutuallyEligible(
  a: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
  b: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
): boolean {
  if (a.profile.is_paused || b.profile.is_paused) return false;

  const checkOne = (
    self: { profile: ProfileRow; prefs: PrefsRow | null },
    other: { profile: ProfileRow; ageA: number | null },
  ) => {
    const p = self.prefs;
    if (!p) return true; // no preferences yet — do not exclude, but weak signal
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

  // Intent compatibility — if both declared, they should match.
  const ia = a.prefs?.relationship_intent ?? null;
  const ib = b.prefs?.relationship_intent ?? null;
  if (ia && ib && ia !== ib) return false;

  return true;
}

function facetAverage(rows: FacetRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / rows.length;
}

const reasoningSchema = z.object({
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

function summarizeFacets(rows: FacetRow[]): string {
  return rows
    .filter((r) => r.understanding)
    .map(
      (r) =>
        `- ${r.facet_key} [confidence ${Number(r.confidence).toFixed(2)}]: ${r.understanding}`,
    )
    .join("\n");
}

async function reasonPair(args: {
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

Reason across values, communication, emotional regulation, expectations, attachment, conflict/repair, boundaries, affection, lifestyle, social/family, purpose, intellectual fit, humor, finance, health, pacing, attraction preferences, resilience, and complementary strengths. Similarity alone is not compatibility.

- status "withheld" if there is a hard conflict (essential boundary or incompatible core direction).
- status "introduced" only when you are genuinely willing to reflect this to both of them.
- status "considering" otherwise.
- confidence 0–1 based on how well you understand each of them.
- reasoning: 2–4 sentences of your private thinking.
- presentation_for_a and presentation_for_b: written directly to that person in your voice; 3–5 sentences each; do NOT reveal the other person's private confidences or evidence quotes; do not use a percentage.

PERSON A — ${args.a.name}
${summarizeFacets(args.a.facets)}

PERSON B — ${args.b.name}
${summarizeFacets(args.b.facets)}`,
  });
  return object;
}

export const considerIntroductions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1. Load self.
    const [{ data: selfProfile }, { data: selfPrefs }, { data: selfFacets }] =
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
      ]);

    if (!selfProfile) return { ok: false, reason: "no_profile" };

    const selfFacetRows = (selfFacets ?? []) as FacetRow[];
    if (selfFacetRows.length < MIN_FACETS_EACH || facetAverage(selfFacetRows) < EXPLORATORY_MIN_AVG) {
      return { ok: true, considered: 0, reason: "self_understanding_too_thin" };
    }

    // 2. Load candidate pool — everyone else with enough understanding.
    const { data: others } = await supabase
      .from("profiles")
      .select("id, display_name, birth_date, gender, city, is_paused")
      .neq("id", userId)
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

    // 3. Filter for eligibility + minimum understanding.
    type Candidate = {
      other: ProfileRow;
      otherFacets: FacetRow[];
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
      eligible.push({ other: o, otherFacets: oFacets });
    }

    if (eligible.length === 0) return { ok: true, considered: 0, reason: "no_eligible" };

    // 4. Reason across each candidate, prefer those with highest average confidence.
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
        a: {
          name: (selfProfile.display_name as string) ?? "them",
          facets: selfFacetRows,
        },
        b: {
          name: (c.other.display_name as string) ?? "them",
          facets: c.otherFacets,
        },
      });

      const wantsIntroduction =
        object.status === "introduced" && object.confidence >= STRONG_MIN_AVG;

      // Upsert reasoning row.
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

      // Append history snapshot.
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
        // Ensure a pending response row exists for the presented user.
        await supabase.from("introduction_responses").upsert(
          { pair_id: upserted.id, user_id: userId, response: "pending" },
          { onConflict: "pair_id,user_id" },
        );
      }
    }

    return { ok: true, considered: toReason.length, introduced };
  });

// List introductions currently visible to the caller.
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

    if (!pairs || pairs.length === 0) return { introductions: [] as ReturnType<typeof shape>[] };

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

    const shape = (p: (typeof pairs)[number]) => {
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
    };

    return { introductions: pairs.map(shape) };
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

    // Verify the pair was actually presented to this user.
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

    // Feedback becomes signal to Athena — perspective, not verdict.
    await supabase.from("introduction_feedback").insert({
      pair_id: data.pair_id,
      user_id: userId,
      kind: data.response,
      perspective: data.note ?? null,
      signals: {},
    });

    // When both people accept, Athena quietly opens a shared connection.
    let connectionId: string | null = null;
    if (data.response === "accepted") {
      const { openConnectionIfMutual } = await import("./connections.functions");
      connectionId = await openConnectionIfMutual(supabase, data.pair_id);
    }

    return { ok: true, connection_id: connectionId };
  });
