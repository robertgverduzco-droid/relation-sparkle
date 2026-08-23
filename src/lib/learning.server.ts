// Athena — Outcome-Learning Loop (Step 4 of the approved spec: SIGNAL
// RECORDING ONLY).
//
// Governing doctrine:
//   docs/constitution/cross-cutting/self-evaluation-and-improvement.md
//   docs/specs/self-evaluation-and-outcome-learning-v1.md (v1.1, approved)
//
// SCOPE — deliberately narrow:
//   - Record anonymized, categorical outcome signals against the *pair*, so
//     that patterns can later be reviewed by humans.
//   - NO aggregation, NO pattern promotion, NO prompt injection, NO influence
//     on reasoning, matchmaking, eligibility, the 3-introduction cap, or any
//     member-facing surface. Those require separate explicit approval.
//
// Invariants enforced here:
//   - No user ids, no member-authored text, ever leaves this module into
//     `athena_outcome_signals`. Pairs are identified only by a salted HMAC
//     token used for de-duplication.
//   - Reason categories come from a closed vocabulary. Free text is dropped.
//   - Engagement is never a success proxy: message volume, latency, session
//     length, app opens, acceptance rate and match counts are not signals.
//   - A member who has opted out is excluded from cross-member recording.
//   - Primacy of the individual: nothing recorded here may ever outrank what
//     Athena understands about a specific person.
import { createHmac } from "node:crypto";

/** Bumped only when promoted patterns change. 0 = nothing promoted yet. */
export const LEARNING_VERSION = "0";

/** Global kill switch. Disables all signal recording. */
export function learningEnabled(): boolean {
  return process.env["ATHENA_LEARNING_ENABLED"] !== "false";
}

export type Valence = "positive" | "negative" | "uncertain" | "incomplete";
export type Strength =
  | "none"
  | "weak"
  | "moderate"
  | "strong"
  | "strongest"
  | "disqualifying";

export type SignalKind =
  | "introduction_accepted_both"
  | "introduction_declined"
  | "conversation_sustained_7d"
  | "meeting_confirmed"
  | "meeting_completed"
  | "reflection_submitted"
  | "mutual_interest"
  | "focus_started"
  | "focus_milestone_30d"
  | "focus_milestone_90d"
  | "focus_milestone_180d"
  | "focus_ended"
  | "connection_ended"
  | "reflection_uncertain"
  | "never_met"
  | "safety_report";

/**
 * The sanctioned outcome vocabulary. Weight classes follow the spec table;
 * they are stored, not yet used — no aggregation exists in this step.
 */
export const SIGNAL_CATALOG: Record<
  SignalKind,
  { valence: Valence; strength: Strength }
> = {
  introduction_accepted_both: { valence: "positive", strength: "weak" },
  conversation_sustained_7d: { valence: "positive", strength: "weak" },
  meeting_confirmed: { valence: "positive", strength: "moderate" },
  meeting_completed: { valence: "positive", strength: "moderate" },
  reflection_submitted: { valence: "positive", strength: "strong" },
  mutual_interest: { valence: "positive", strength: "strong" },
  focus_started: { valence: "positive", strength: "strongest" },
  focus_milestone_30d: { valence: "positive", strength: "strongest" },
  focus_milestone_90d: { valence: "positive", strength: "strongest" },
  focus_milestone_180d: { valence: "positive", strength: "strongest" },
  focus_ended: { valence: "negative", strength: "strong" },
  connection_ended: { valence: "negative", strength: "strong" },
  introduction_declined: { valence: "negative", strength: "moderate" },
  reflection_uncertain: { valence: "uncertain", strength: "none" },
  never_met: { valence: "incomplete", strength: "none" },
  safety_report: { valence: "negative", strength: "disqualifying" },
};

/**
 * Closed vocabulary for *why* something ended or was declined. Anything not
 * in this list is discarded rather than stored — member wording never lands
 * in the cross-member store.
 */
export const REASON_CATEGORIES = [
  "reflection_complete",
  "member_declined_continue",
  "focus_ended",
  "blocked",
  "expired",
  "never_met",
  "logistics",
  "distance",
  "timing",
  "pace_mismatch",
  "values_mismatch",
  "communication_mismatch",
  "no_spark",
  "unspecified",
] as const;

export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

/**
 * Prohibited as pattern dimensions by L2 Ethics. Kept here so the fairness
 * gate in a later step and any future writer share one list.
 */
export const PROHIBITED_DIMENSIONS = [
  "age",
  "birth_date",
  "gender",
  "pronouns",
  "city",
  "region",
  "country",
  "location_lat",
  "location_lng",
  "ethnicity",
  "race",
  "religion",
  "income",
  "wealth",
] as const;

export function isProhibitedDimension(key: string): boolean {
  const k = key.toLowerCase();
  return PROHIBITED_DIMENSIONS.some((p) => k === p || k.includes(p));
}

/** Coerce arbitrary input to the closed vocabulary, or null. */
export function toReasonCategory(value: string | null | undefined): ReasonCategory | null {
  if (!value) return null;
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (REASON_CATEGORIES as readonly string[]).includes(v)
    ? (v as ReasonCategory)
    : null;
}

/**
 * Salted, order-independent pair token. One-way: there is no path from a
 * stored token back to a member. Salt is per-environment.
 */
export function pairToken(userA: string, userB: string): string {
  const salt =
    process.env["ATHENA_LEARNING_SALT"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    "athena-local-salt";
  const [low, high] = [userA, userB].sort();
  return createHmac("sha256", salt).update(`${low}:${high}`).digest("hex").slice(0, 40);
}

export interface OutcomeSignalArgs {
  userA: string;
  userB: string;
  kind: SignalKind;
  /** Optional reason; coerced to the closed vocabulary or dropped. */
  reason?: string | null;
  /** One yes / one no, or reflection contradicting behavior. */
  isContradictory?: boolean;
  /** Distinguishes repeatable signals (e.g. one per meeting). Default "". */
  dedupeKey?: string;
  occurredAt?: string;
}

/**
 * Record a single outcome signal. Fire-and-forget by design: a failure here
 * must never affect a member's flow. Returns why it was skipped, for logs.
 */
export async function recordOutcomeSignal(
  args: OutcomeSignalArgs,
): Promise<{ recorded: boolean; reason?: string }> {
  if (!learningEnabled()) return { recorded: false, reason: "disabled" };
  const spec = SIGNAL_CATALOG[args.kind];
  if (!spec) return { recorded: false, reason: "unknown_kind" };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Consent: either member opting out excludes the pair entirely.
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, learning_opt_out")
      .in("id", [args.userA, args.userB]);
    const optedOut = (profiles ?? []).some(
      (p) => (p as { learning_opt_out?: boolean }).learning_opt_out === true,
    );
    if (optedOut) return { recorded: false, reason: "opted_out" };

    const { error } = await supabaseAdmin.from("athena_outcome_signals").upsert(
      {
        pair_token: pairToken(args.userA, args.userB),
        signal_kind: args.kind,
        valence: spec.valence,
        strength: spec.strength,
        reason_category: toReasonCategory(args.reason),
        is_contradictory: args.isContradictory ?? false,
        learning_version: LEARNING_VERSION,
        dedupe_key: (args.dedupeKey ?? "").slice(0, 80),
        occurred_at: args.occurredAt ?? new Date().toISOString(),
      },
      { onConflict: "pair_token,signal_kind,dedupe_key", ignoreDuplicates: true },
    );
    if (error) return { recorded: false, reason: error.message };

    // Close the loop: attach this outcome to whatever Athena predicted for
    // this pair, so divergence is measurable rather than asserted.
    try {
      const { linkOutcomeToPrediction } = await import("./intelligence.server");
      await linkOutcomeToPrediction({
        pairToken: pairToken(args.userA, args.userB),
        signalKind: args.kind,
        valence: spec.valence,
        strength: spec.strength,
        reasonCategory: toReasonCategory(args.reason),
        occurredAt: args.occurredAt ?? new Date().toISOString(),
      });
    } catch {
      // Learning linkage never affects the member path.
    }

    return { recorded: true };
  } catch (e) {
    return { recorded: false, reason: e instanceof Error ? e.message : "error" };
  }
}

/** Non-blocking helper used at every emission site. */
export function emitOutcomeSignal(args: OutcomeSignalArgs): void {
  void recordOutcomeSignal(args).catch(() => {});
}

/**
 * Focus-mode duration milestones, derived from `started_at`. Idempotent via
 * the per-milestone dedupe key.
 */
export function focusMilestones(startedAt: string, now = Date.now()): SignalKind[] {
  const days = (now - new Date(startedAt).getTime()) / 864e5;
  const out: SignalKind[] = [];
  if (days >= 30) out.push("focus_milestone_30d");
  if (days >= 90) out.push("focus_milestone_90d");
  if (days >= 180) out.push("focus_milestone_180d");
  return out;
}
