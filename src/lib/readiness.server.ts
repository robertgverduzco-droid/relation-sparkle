// Server-only: the member readiness gate (A/B/C).
//
// Doctrine: readiness decides whether Athena MAY consider introductions for a
// member. It never decides whether a particular introduction deserves to exist
// (that is pair reasoning, L6b/L6c). Readiness is never a member-facing score,
// never time-driven, never a quota, and never rewards disclosure volume.
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXPLORATORY_MIN_AVG, MIN_FACETS_EACH, MAX_ACTIVE_INTRODUCTIONS, facetAverage } from "./introductions.server";

export type ReadinessState = "A" | "B" | "C";

export type ReadinessEvaluation = {
  state: ReadinessState;
  reason_code: string;
  /** Plain language, Athena's voice. Safe to surface to the member. */
  reason_text: string;
  hold_kind: string | null;
  hold_until: string | null;
};

export type ReadinessTrigger =
  | "foundational_conversation_complete"
  | "living_profile_update"
  | "member_correction"
  | "pause_change"
  | "relationship_ending"
  | "ending_path_chosen"
  | "focus_change"
  | "safety_change"
  | "account_change"
  | "introduction_response"
  | "reflection_submitted"
  | "manual_request";

/** Confidence above which Athena considers foundational understanding settled. */
export const READY_MIN_AVG = 0.5;
/** How many understood facets Athena wants before she is willing to consider. */
export const READY_MIN_FACETS = 6;

const COPY = {
  A_foundation:
    "We haven't spent enough time together yet for me to introduce you to anyone. I'd rather keep listening than guess.",
  A_foundation_gaps:
    "There are still a few parts of your life, and of what you're looking for, that I don't understand well enough yet. I'd rather keep talking than introduce you to someone on a guess.",
  A_paused:
    "You've paused introductions. Nothing changes until you tell me otherwise.",
  A_photo_needed:
    "Before I introduce you to anyone, I'd like at least one photograph of you on your profile. Attraction is real, and it's fairer to both people if it's part of the picture from the start.",
  A_photo_pending:
    "Your photograph is still being reviewed. Nothing is wrong — I'll begin looking as soon as it's cleared.",
  A_safety:
    "There's something on your account I need to resolve before I bring anyone to you.",
  A_hold_rest:
    "You asked for some time, so I'm not looking for anyone right now. I'll check back in a while.",
  A_rest_elapsed:
    "The time you asked for has passed. I'm still not looking for anyone — that stays true until you tell me you'd like to begin again.",

  A_hold_choice:
    "Something ended recently, and you haven't told me what you'd like next. Whenever you're ready, we can decide together.",
  A_focus:
    "You're in Relationship Focus. I'm not looking for anyone else — I'm here for the two of you.",
  A_reflection:
    "There's a conversation about your last meeting I'm still waiting on. Once we've had it, I'll know more.",
  B_uncertainty:
    "I understand a good deal about you, and there's still enough I'm unsure of that I'd rather keep listening before I introduce anyone.",
  B_contradiction:
    "There are a couple of things I've understood two different ways. I'd like to clear those up with you first.",
  C_ready:
    "I know you well enough to start considering who might genuinely be worth meeting. That doesn't mean anyone will appear soon — only that I'm looking carefully.",
  C_at_capacity:
    "You already have as many introductions open as I'll ever give at once. Let's see how those go first.",
};

/**
 * Evaluate a member's readiness from current evidence. Pure read + a single
 * upsert of the resulting state. Called on meaningful transitions, not
 * continuously.
 */
export async function evaluateReadiness(
  supabase: SupabaseClient,
  userId: string,
  trigger: ReadinessTrigger,
): Promise<ReadinessEvaluation> {
  const [{ data: profile }, { data: intel }, { data: facets }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, is_paused, suspended_by_moderator")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_intelligence").select("last_interview_at").eq("user_id", userId).maybeSingle(),
    supabase.from("understanding_facets").select("facet_key, confidence, understanding, needs_clarification").eq("user_id", userId),
  ]);

  if (!profile) {
    return {
      state: "A",
      reason_code: "no_profile",
      reason_text: COPY.A_foundation,
      hold_kind: null,
      hold_until: null,
    };
  }

  const persist = async (e: ReadinessEvaluation) => {
    // ACL contract: `member_readiness` is SELECT-only for `authenticated`.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as unknown as SupabaseClient).from("member_readiness").upsert(
      {
        user_id: userId,
        state: e.state,
        reason_code: e.reason_code,
        reason_text: e.reason_text,
        hold_kind: e.hold_kind,
        hold_until: e.hold_until,
        last_evaluated_at: new Date().toISOString(),
        last_trigger: trigger,
      },
      { onConflict: "user_id" },
    );
    return e;
  };

  // --- Blocking conditions (state A) ------------------------------------
  if (profile.is_paused) {
    // A moderator-imposed hold reads as a safety matter, never as the
    // casual "you paused, resume anytime" copy — that would misrepresent
    // what actually happened and imply a member can undo it themselves.
    if (profile.suspended_by_moderator) {
      return persist({
        state: "A",
        reason_code: "suspended",
        reason_text: COPY.A_safety,
        hold_kind: "safety",
        hold_until: null,
      });
    }
    return persist({ state: "A", reason_code: "paused", reason_text: COPY.A_paused, hold_kind: "paused", hold_until: null });
  }

  {
    const { data: bans } = await supabase
      .from("reports")
      .select("id")
      .eq("reported_id", userId)
      .in("severity", ["high", "critical"])
      .eq("status", "open")
      .limit(1);
    if ((bans ?? []).length > 0) {
      return persist({ state: "A", reason_code: "safety_hold", reason_text: COPY.A_safety, hold_kind: "safety", hold_until: null });
    }
  }

  {
    const { matchmakingHold } = await import("./relationship.server");
    const hold = await matchmakingHold(supabase, userId);
    if (hold.held) {
      const reason = hold.reason ?? "hold";
      const text =
        reason === "relationship_focus"
          ? COPY.A_focus
          : reason === "resting"
            ? COPY.A_hold_rest
            : reason === "rest_elapsed_awaiting_choice"
              ? COPY.A_rest_elapsed
              : COPY.A_hold_choice;

      return persist({
        state: "A",
        reason_code: reason,
        reason_text: text,
        hold_kind: reason,
        hold_until: (hold as { holdUntil?: string | null }).holdUntil ?? null,
      });
    }
  }

  if (!intel?.last_interview_at) {
    return persist({
      state: "A",
      reason_code: "foundation_incomplete",
      reason_text: COPY.A_foundation,
      hold_kind: null,
      hold_until: null,
    });
  }

  // At least one approved photograph is required before anyone is introduced.
  // The hold is truthful and free of pressure: it distinguishes "none yet"
  // from "still in review", and never implies the member did something wrong.
  {
    const { data: photos } = await supabase
      .from("user_photos")
      .select("moderation")
      .eq("user_id", userId);
    const rows = photos ?? [];
    const approved = rows.some((p) => p.moderation === "approved");
    if (!approved) {
      const pending = rows.some((p) => p.moderation === "pending");
      return persist({
        state: "A",
        reason_code: pending ? "photo_pending" : "photo_required",
        reason_text: pending ? COPY.A_photo_pending : COPY.A_photo_needed,
        hold_kind: pending ? "photo_review" : "photo",
        hold_until: null,
      });
    }
  }

  {
    const { REQUIRED_REFLECTION_GRACE_DAYS } = await import("./connections.server");
    const graceCutoff = new Date(Date.now() - REQUIRED_REFLECTION_GRACE_DAYS * 864e5).toISOString();
    const { data: outstanding } = await supabase
      .from("post_meeting_reflections")
      .select("id")
      .eq("user_id", userId)
      .eq("reflection_required", true)
      .is("submitted_at", null)
      .gt("required_since", graceCutoff)
      .limit(1);
    if ((outstanding ?? []).length > 0) {
      return persist({
        state: "A",
        reason_code: "reflection_outstanding",
        reason_text: COPY.A_reflection,
        hold_kind: "reflection",
        hold_until: null,
      });
    }
  }

  // --- Understanding-based states ---------------------------------------
  const rows = (facets ?? []) as {
    facet_key: string;
    confidence: number;
    understanding: string | null;
    needs_clarification: boolean | null;
  }[];
  const understood = rows.filter((r) => r.understanding);
  const avg = facetAverage(understood.map((r) => ({ facet_key: "", understanding: r.understanding, reasoning: null, confidence: Number(r.confidence ?? 0) })));
  const unresolved = rows.filter((r) => r.needs_clarification).length;

  // Foundational readiness for MATCHMAKING. Higher bar than conversational
  // completion: Athena must actually understand intent, values, communication,
  // everyday life, relational patterns, boundaries and physical attraction
  // before anyone may be considered. Member impatience cannot move this.
  {
    const { assessFoundationalReadiness } = await import("./introduction-readiness");
    const foundational = assessFoundationalReadiness(rows);
    if (!foundational.ready) {
      return persist({
        state: "A",
        reason_code: foundational.missing.length > 0 ? "foundational_gaps" : "foundational_breadth",
        reason_text: COPY.A_foundation_gaps,
        hold_kind: null,
        hold_until: null,
      });
    }
  }

  if (understood.length < MIN_FACETS_EACH || avg < EXPLORATORY_MIN_AVG) {
    return persist({
      state: "A",
      reason_code: "understanding_thin",
      reason_text: COPY.A_foundation,
      hold_kind: null,
      hold_until: null,
    });
  }

  if (unresolved > 0) {
    return persist({
      state: "B",
      reason_code: "unresolved_contradictions",
      reason_text: COPY.B_contradiction,
      hold_kind: null,
      hold_until: null,
    });
  }

  if (understood.length < READY_MIN_FACETS || avg < READY_MIN_AVG) {
    return persist({
      state: "B",
      reason_code: "material_uncertainty",
      reason_text: COPY.B_uncertainty,
      hold_kind: null,
      hold_until: null,
    });
  }

  // Ready. Capacity is reported, never as failure: C means Athena may
  // consider, never that she must produce anything.
  const active = await activeIntroductionCount(supabase, userId);
  return persist({
    state: "C",
    reason_code: active >= MAX_ACTIVE_INTRODUCTIONS ? "at_capacity" : "ready",
    reason_text: active >= MAX_ACTIVE_INTRODUCTIONS ? COPY.C_at_capacity : COPY.C_ready,
    hold_kind: null,
    hold_until: null,
  });
}

/** How many introductions are currently open and awaiting this member. */
export async function activeIntroductionCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: pairs } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq("status", "introduced");
  const presented = (pairs ?? [])
    .filter((p) => (p.user_low === userId ? p.presented_to_a_at : p.presented_to_b_at))
    .map((p) => p.id as string);
  if (presented.length === 0) return 0;
  const { data: resp } = await supabase
    .from("introduction_responses")
    .select("pair_id, response")
    .eq("user_id", userId)
    .in("pair_id", presented);
  const byPair = new Map<string, string>();
  for (const r of resp ?? []) byPair.set(r.pair_id as string, r.response as string);
  return presented.filter((pid) => {
    const r = byPair.get(pid) ?? "pending";
    return r === "pending" || r === "deferred" || r === "accepted";
  }).length;
}

/**
 * Authoritative server-side gate. Never trust the UI for this.
 * Returns whether Athena may consider introductions for this member right now.
 */
export async function introductionGate(
  supabase: SupabaseClient,
  userId: string,
  trigger: ReadinessTrigger = "manual_request",
): Promise<{ allowed: boolean; state: ReadinessState; reason: string; reason_text: string }> {
  const e = await evaluateReadiness(supabase, userId, trigger);
  const atCapacity = e.reason_code === "at_capacity";
  return {
    allowed: e.state === "C" && !atCapacity,
    state: e.state,
    reason: e.reason_code,
    reason_text: e.reason_text,
  };
}

/** Read the persisted state without re-evaluating. */
export async function readReadiness(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("member_readiness")
    .select("state, reason_code, reason_text, hold_kind, hold_until, last_evaluated_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}
