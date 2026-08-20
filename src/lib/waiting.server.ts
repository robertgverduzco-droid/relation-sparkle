// Server-only: derives the truthful Post-Foundational Waiting state.
//
// Single source of truth. Readiness (A/B/C + holds) still comes from
// readiness.server.ts, candidate existence from pair_reasoning, hard-constraint
// resolvability from introductions.server.ts. Nothing new is invented here and
// nothing about a counterpart ever leaves this module.
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickDeepeningArea, type WaitingState } from "./waiting";

/**
 * Below this, a "considering" pair is Athena thinking out loud, not a
 * promising candidate. Internal only; never surfaced, never a score.
 */
export const PROMISING_CANDIDATE_MIN_CONFIDENCE = 0.55;

/**
 * Early-market honesty, configuration-driven so it can be retired as regional
 * density grows. Never derived from, and never exposes, a member count.
 */
export function earlyCommunityEnabled(): boolean {
  return (process.env["ATHENA_EARLY_COMMUNITY"] ?? "true").toLowerCase() !== "false";
}

export async function evaluateWaitingState(
  supabase: SupabaseClient,
  userId: string,
): Promise<WaitingState> {
  const { evaluateReadiness, activeIntroductionCount } = await import("./readiness.server");
  const readiness = await evaluateReadiness(supabase, userId, "manual_request");
  const earlyCommunity = earlyCommunityEnabled();

  if (readiness.state !== "C") {
    return {
      phase: readiness.hold_kind ? "held" : "not_ready",
      candidate: "none",
      earlyCommunity,
      holdKind: readiness.hold_kind,
      deepen: null,
    };
  }

  const active = await activeIntroductionCount(supabase, userId);
  if (active > 0) {
    return {
      phase: "introduction_available",
      candidate: "none",
      earlyCommunity,
      holdKind: null,
      deepen: null,
    };
  }

  const [{ data: considering }, { data: facets }] = await Promise.all([
    supabase
      .from("pair_reasoning")
      .select("user_low, user_high, confidence, is_stale")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq("status", "considering")
      .order("confidence", { ascending: false })
      .limit(10),
    supabase
      .from("understanding_facets")
      .select("facet_key, understanding, confidence")
      .eq("user_id", userId),
  ]);

  const deepen = pickDeepeningArea(
    ((facets ?? []) as { facet_key: string; understanding: string | null; confidence: number | null }[]).map(
      (f) => ({
        facet_key: f.facet_key,
        understanding: f.understanding,
        confidence: Number(f.confidence ?? 0),
      }),
    ),
  );

  // A candidate sentence may only appear when a real, current, promising pair
  // exists AND something genuinely unresolved is holding it — otherwise
  // "there may be someone" would be a persuasion technique (L2 §3, §6).
  let candidate: WaitingState["candidate"] = "none";
  for (const p of (considering ?? []) as {
    user_low: string;
    user_high: string;
    confidence: number | null;
    is_stale: boolean | null;
  }[]) {
    if (p.is_stale) continue;
    if (Number(p.confidence ?? 0) < PROMISING_CANDIDATE_MIN_CONFIDENCE) continue;
    const otherId = p.user_low === userId ? p.user_high : p.user_low;
    const { constraintStateForPair } = await import("./introductions.server");
    const fresh = await constraintStateForPair(supabase, userId, otherId);
    if (fresh.verdict === "incompatible") continue;
    candidate = "unresolved_candidate";
    break;
  }

  return { phase: "looking", candidate, earlyCommunity, holdKind: null, deepen };
}
