// Athena Continuous Learning — server pipeline.
//
// Server-only. Nothing here is reachable from a member surface: the learning
// tables carry no policies and no grants beyond `service_role`.
//
// Responsibilities:
//  1. Freeze what Athena expected at the moment she made an introduction.
//  2. Attach what actually happened, later, and judge divergence.
//  3. Aggregate de-identified evidence into hypotheses she may NOT act on.
//  4. Give a founder — and only a founder — the ability to promote, hold,
//     block, retire, or roll back any of it, with a full audit trail.

import {
  classifyDivergence,
  confidenceBand,
  confidenceState,
  canTransition,
  composeBriefing,
  nextIntelligenceVersion,
  promotionDecision,
  screenSensitivity,
  supportRatio,
  warrantedStatus,
  type BriefingHypothesis,
  type BriefingSection,
  type ConfidenceState,
  type EvidenceTally,
  type HypothesisStatus,
  type OperationalInfluence,
  type SensitivityFlag,
} from "./intelligence";

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Untyped handle: the learning tables are outside the member-facing types. */
function loose(db: Admin) {
  return db as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
}

// ---------------------------------------------------------------------------
// Intelligence version
// ---------------------------------------------------------------------------

export const BASELINE_INTELLIGENCE_VERSION = "learning-1.0.0";

export async function currentIntelligenceVersion(): Promise<string> {
  try {
    const db = await admin();
    const { data } = await loose(db)
      .from("athena_intelligence_versions")
      .select("version")
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.version as string) ?? BASELINE_INTELLIGENCE_VERSION;
  } catch {
    return BASELINE_INTELLIGENCE_VERSION;
  }
}

async function openIntelligenceVersion(
  actorId: string,
  notes: string,
  promoted: string[],
): Promise<string> {
  const db = await admin();
  const current = await currentIntelligenceVersion();
  const version = nextIntelligenceVersion(current);
  await loose(db).from("athena_intelligence_versions").insert({
    version,
    previous_version: current,
    notes,
    promoted,
    activated_by: actorId,
  });
  return version;
}

// ---------------------------------------------------------------------------
// 1. Prediction ledger
// ---------------------------------------------------------------------------

export interface PredictionInput {
  userA: string;
  userB: string;
  status: string;
  confidence: number;
  /** Categorical factor keys only — never member text. */
  factors: string[];
  knownUnknowns: string[];
  expectation?: string | null;
  isSynthetic?: boolean;
}

/**
 * Written at the moment of introduction and never edited. Without this,
 * "Athena learned from the outcome" is unfalsifiable — there is nothing to
 * compare the outcome against.
 */
export async function recordPrediction(
  input: PredictionInput,
): Promise<{ recorded: boolean; reason?: string }> {
  try {
    const { learningEnabled, pairToken } = await import("./learning.server");
    if (!learningEnabled()) return { recorded: false, reason: "disabled" };

    const db = await admin();
    const { data: profiles } = await db
      .from("profiles")
      .select("id, learning_opt_out, is_synthetic")
      .in("id", [input.userA, input.userB]);
    const rows = (profiles ?? []) as {
      learning_opt_out?: boolean;
      is_synthetic?: boolean;
    }[];
    if (rows.some((p) => p.learning_opt_out === true)) {
      return { recorded: false, reason: "opted_out" };
    }
    const synthetic = input.isSynthetic ?? rows.some((p) => p.is_synthetic === true);

    await loose(db).from("athena_predictions").insert({
      pair_token: pairToken(input.userA, input.userB),
      intelligence_version: await currentIntelligenceVersion(),
      predicted_status: input.status,
      confidence_band: confidenceBand(input.confidence),
      confidence_numeric: input.confidence,
      important_factors: input.factors.slice(0, 12),
      known_unknowns: input.knownUnknowns.slice(0, 12),
      expectation: input.expectation ?? null,
      // Synthetic pairs are recorded for engineering visibility but never
      // counted as evidence about real people.
      learning_eligible: !synthetic,
      is_synthetic: synthetic,
    });
    return { recorded: true };
  } catch (e) {
    return { recorded: false, reason: e instanceof Error ? e.message : "error" };
  }
}

/** Fire-and-forget: matchmaking must never fail because learning failed. */
export function emitPrediction(input: PredictionInput): void {
  void recordPrediction(input).catch(() => {});
}

// ---------------------------------------------------------------------------
// 2. Outcome linkage
// ---------------------------------------------------------------------------

/**
 * Attach a de-identified outcome signal to the most recent prediction for the
 * same pair. Called from the single outcome funnel in learning.server.ts.
 */
export async function linkOutcomeToPrediction(args: {
  pairToken: string;
  signalKind: string;
  valence: string;
  strength: string;
  reasonCategory: string | null;
  occurredAt: string;
}): Promise<{ linked: boolean }> {
  try {
    const db = await admin();
    const { data: pred } = await loose(db)
      .from("athena_predictions")
      .select("id, confidence_band, learning_eligible")
      .eq("pair_token", args.pairToken)
      .order("predicted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pred) return { linked: false };

    await loose(db).from("athena_prediction_outcomes").insert({
      prediction_id: pred.id,
      pair_token: args.pairToken,
      signal_kind: args.signalKind,
      valence: args.valence,
      strength: args.strength,
      reason_category: args.reasonCategory,
      divergence: classifyDivergence(pred.confidence_band, args.valence),
      occurred_at: args.occurredAt,
    });
    return { linked: true };
  } catch {
    return { linked: false };
  }
}

// ---------------------------------------------------------------------------
// 3. Hypothesis formation
// ---------------------------------------------------------------------------

export interface HypothesisSeed {
  slug: string;
  statement: string;
  dimension: string;
  universityPrinciples?: string[];
  alternativeExplanations?: string[];
  challengesEducation?: boolean;
  isSurprise?: boolean;
}

/**
 * Create or refresh a hypothesis. The ethical screen runs here, before any
 * evidence can accumulate, so a forbidden pattern is inert from birth rather
 * than caught at promotion time.
 */
export async function ensureHypothesis(seed: HypothesisSeed): Promise<string | null> {
  try {
    const db = await admin();
    const verdict = screenSensitivity(seed.dimension, seed.statement);
    const { data: existing } = await loose(db)
      .from("athena_hypotheses")
      .select("id, status")
      .eq("slug", seed.slug)
      .maybeSingle();
    if (existing) return existing.id as string;

    const { data } = await loose(db)
      .from("athena_hypotheses")
      .insert({
        slug: seed.slug,
        statement: seed.statement,
        dimension: seed.dimension,
        status: verdict.flag === "blocked" ? "blocked" : "observed",
        sensitivity_flag: verdict.flag,
        sensitivity_reason: verdict.reason,
        university_principles: seed.universityPrinciples ?? [],
        alternative_explanations: seed.alternativeExplanations ?? [],
        challenges_education: seed.challengesEducation ?? false,
        is_surprise: seed.isSurprise ?? false,
        intelligence_version: await currentIntelligenceVersion(),
      })
      .select("id")
      .maybeSingle();
    return (data?.id as string) ?? null;
  } catch {
    return null;
  }
}

export type EvidenceKind =
  | "supporting"
  | "contradicting"
  | "alternative_explanation"
  | "confounder";

export async function recordHypothesisEvidence(args: {
  hypothesisId: string;
  kind: EvidenceKind;
  pairToken: string;
  summary: string;
  occurredAt?: string;
}): Promise<void> {
  try {
    const db = await admin();
    await loose(db).from("athena_hypothesis_evidence").upsert(
      {
        hypothesis_id: args.hypothesisId,
        kind: args.kind,
        pair_token: args.pairToken,
        summary: args.summary.slice(0, 240),
        occurred_at: args.occurredAt ?? new Date().toISOString(),
      },
      { onConflict: "hypothesis_id,kind,pair_token", ignoreDuplicates: true },
    );
  } catch {
    // Evidence loss is preferable to any failure reaching a member path.
  }
}

/**
 * Recount evidence and move the hypothesis to the status the evidence
 * warrants — but never into operational influence. Status is Athena's own
 * bookkeeping; influence is a founder decision only.
 */
export async function reevaluateHypothesis(hypothesisId: string): Promise<{
  status: HypothesisStatus;
  confidence: ConfidenceState;
  tally: EvidenceTally;
} | null> {
  try {
    const db = await admin();
    const { data: h } = await loose(db)
      .from("athena_hypotheses")
      .select("id, status, sensitivity_flag")
      .eq("id", hypothesisId)
      .maybeSingle();
    if (!h) return null;

    const { data: rows } = await loose(db)
      .from("athena_hypothesis_evidence")
      .select("kind, pair_token")
      .eq("hypothesis_id", hypothesisId);
    const evidence = (rows ?? []) as { kind: EvidenceKind; pair_token: string }[];

    const supporting = evidence.filter((e) => e.kind === "supporting").length;
    const contradicting = evidence.filter((e) => e.kind === "contradicting").length;
    const applicableCases = new Set(
      evidence
        .filter((e) => e.kind === "supporting" || e.kind === "contradicting")
        .map((e) => e.pair_token),
    ).size;
    const tally: EvidenceTally = { applicableCases, supporting, contradicting };

    const current = h.status as HypothesisStatus;
    const warranted = warrantedStatus(current, tally);
    const next = canTransition(current, warranted) ? warranted : current;
    const confidence = confidenceState(tally);

    await loose(db)
      .from("athena_hypotheses")
      .update({
        status: next,
        applicable_cases: applicableCases,
        supporting_count: supporting,
        contradicting_count: contradicting,
        confidence_state: confidence,
        last_evaluated_at: new Date().toISOString(),
      })
      .eq("id", hypothesisId);

    return { status: next, confidence, tally };
  } catch {
    return null;
  }
}

/**
 * Aggregate pass over de-identified outcomes. Turns recurring reason
 * categories into candidate patterns. Deliberately dumb: Athena is allowed to
 * notice, not to theorise about people.
 */
export async function runLearningPass(): Promise<{
  hypotheses: number;
  evidence: number;
}> {
  const db = await admin();
  const { data: outcomes } = await loose(db)
    .from("athena_prediction_outcomes")
    .select("pair_token, reason_category, divergence, valence, occurred_at")
    .limit(5000);
  const rows = (outcomes ?? []) as {
    pair_token: string;
    reason_category: string | null;
    divergence: string;
    valence: string;
    occurred_at: string;
  }[];

  let hypotheses = 0;
  let evidence = 0;
  const byReason = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.reason_category) continue;
    const list = byReason.get(r.reason_category) ?? [];
    list.push(r);
    byReason.set(r.reason_category, list);
  }

  for (const [reason, list] of byReason) {
    const slug = `divergence:${reason}`;
    const id = await ensureHypothesis({
      slug,
      statement: `When an introduction I felt confident about does not continue, "${reason.replace(/_/g, " ")}" is the reason more often than my prior expectation.`,
      dimension: `outcome_reason:${reason}`,
      alternativeExplanations: [
        "Members may reach for the most socially comfortable reason rather than the true one",
        "The reason vocabulary itself may be shaping what they report",
      ],
    });
    if (!id) continue;
    hypotheses += 1;
    for (const r of list) {
      await recordHypothesisEvidence({
        hypothesisId: id,
        kind: r.divergence === "diverged" ? "supporting" : "contradicting",
        pairToken: r.pair_token,
        summary: `${r.divergence} · ${r.valence}`,
        occurredAt: r.occurred_at,
      });
      evidence += 1;
    }
    await reevaluateHypothesis(id);
  }

  return { hypotheses, evidence };
}

// ---------------------------------------------------------------------------
// 4. Canonical intelligence available to runtime reasoning
// ---------------------------------------------------------------------------

/**
 * The ONLY learned material permitted to touch live reasoning. Empty until a
 * founder has promoted something, which is the correct state today.
 */
export async function canonicalIntelligenceBlock(): Promise<string> {
  try {
    const db = await admin();
    const { data } = await loose(db)
      .from("athena_hypotheses")
      .select("statement, operational_influence, applicable_cases")
      .in("operational_influence", ["canonical", "experimental"])
      .eq("sensitivity_flag", "clear");
    const rows = (data ?? []) as {
      statement: string;
      operational_influence: string;
      applicable_cases: number;
    }[];
    if (rows.length === 0) return "";
    const lines = rows.map(
      (r) =>
        `- ${r.statement} (${r.operational_influence}, ${r.applicable_cases} observed cases; hold it lightly)`,
    );
    return `WHAT YOU HAVE LEARNED FROM EXPERIENCE (subordinate to the Constitution and the Curriculum; never cited to a member, never stated as certainty)\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 5. Founder governance
// ---------------------------------------------------------------------------

export type FounderAction =
  | "promote_experimental"
  | "promote_canonical"
  | "demote"
  | "block"
  | "retire"
  | "acknowledge_education_conflict"
  | "clear_sensitivity";

async function auditReview(args: {
  hypothesisId: string;
  actorId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  fromInfluence?: string;
  toInfluence?: string;
  note?: string | null;
  snapshot: Record<string, unknown>;
  version: string;
}) {
  const db = await admin();
  await loose(db).from("athena_hypothesis_reviews").insert({
    hypothesis_id: args.hypothesisId,
    actor_id: args.actorId,
    action: args.action,
    from_status: args.fromStatus ?? null,
    to_status: args.toStatus ?? null,
    from_influence: args.fromInfluence ?? null,
    to_influence: args.toInfluence ?? null,
    note: args.note ?? null,
    evidence_snapshot: args.snapshot,
    intelligence_version: args.version,
  });
  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.actorId,
    actorRole: "founder",
    action: `learning.${args.action}`,
    purpose: "Founder governance of learned intelligence",
    metadata: { hypothesis: args.hypothesisId, version: args.version },
  });
}

export async function applyFounderAction(args: {
  actorId: string;
  hypothesisId: string;
  action: FounderAction;
  note?: string | null;
}): Promise<{ ok: boolean; blockers?: string[]; version?: string }> {
  const db = await admin();
  const { data: h } = await loose(db)
    .from("athena_hypotheses")
    .select("*")
    .eq("id", args.hypothesisId)
    .maybeSingle();
  if (!h) return { ok: false, blockers: ["No such pattern."] };

  const version = await currentIntelligenceVersion();
  const tally: EvidenceTally = {
    applicableCases: h.applicable_cases as number,
    supporting: h.supporting_count as number,
    contradicting: h.contradicting_count as number,
  };
  const snapshot = {
    ...tally,
    support_ratio: Number(supportRatio(tally).toFixed(3)),
    confidence_state: h.confidence_state,
  };

  const patch: Record<string, unknown> = {};
  let toStatus: HypothesisStatus | undefined;
  let toInfluence: OperationalInfluence | undefined;

  if (args.action === "promote_experimental" || args.action === "promote_canonical") {
    const target: Exclude<OperationalInfluence, "none"> =
      args.action === "promote_canonical" ? "canonical" : "experimental";
    const decision = promotionDecision({
      status: h.status as HypothesisStatus,
      confidence: h.confidence_state as ConfidenceState,
      sensitivity: h.sensitivity_flag as SensitivityFlag,
      tally,
      alternativeExplanations: ((h.alternative_explanations as unknown[]) ?? []).length,
      challengesEducation: Boolean(h.challenges_education),
      educationConflictAcknowledged: await conflictAcknowledged(args.hypothesisId),
      target,
    });
    if (!decision.allowed) return { ok: false, blockers: decision.blockers };
    toInfluence = target;
    patch["operational_influence"] = target;
  } else if (args.action === "demote") {
    toInfluence = "none";
    patch["operational_influence"] = "none";
  } else if (args.action === "block") {
    toStatus = "blocked";
    patch["status"] = "blocked";
    patch["operational_influence"] = "none";
    patch["sensitivity_flag"] = "blocked";
    patch["sensitivity_reason"] = args.note ?? "Blocked by founder.";
  } else if (args.action === "retire") {
    toStatus = "retired";
    patch["status"] = "retired";
    patch["operational_influence"] = "none";
  } else if (args.action === "clear_sensitivity") {
    if (h.sensitivity_flag === "blocked") {
      return { ok: false, blockers: ["A blocked pattern cannot be cleared."] };
    }
    patch["sensitivity_flag"] = "clear";
    patch["sensitivity_reason"] = null;
  }
  // acknowledge_education_conflict writes only a review row.

  if (Object.keys(patch).length > 0) {
    await loose(db).from("athena_hypotheses").update(patch).eq("id", args.hypothesisId);
  }

  let newVersion = version;
  if (toInfluence === "canonical" || toInfluence === "experimental") {
    newVersion = await openIntelligenceVersion(
      args.actorId,
      args.note ?? `Promoted ${h.slug} to ${toInfluence}.`,
      [h.slug as string],
    );
    await loose(db)
      .from("athena_hypotheses")
      .update({ intelligence_version: newVersion })
      .eq("id", args.hypothesisId);
  }

  await auditReview({
    hypothesisId: args.hypothesisId,
    actorId: args.actorId,
    action: args.action,
    fromStatus: h.status as string,
    toStatus: toStatus ?? (h.status as string),
    fromInfluence: h.operational_influence as string,
    toInfluence: toInfluence ?? (h.operational_influence as string),
    note: args.note ?? null,
    snapshot,
    version: newVersion,
  });

  if (toInfluence && toInfluence !== "none") {
    await loose(db).from("athena_experiments").insert({
      hypothesis_id: args.hypothesisId,
      status: "active",
      surface: "pair_reasoning",
      expected_effect: h.statement,
      baseline: snapshot,
      intelligence_version: newVersion,
      started_by: args.actorId,
    });
  } else if (args.action === "demote" || args.action === "block" || args.action === "retire") {
    await loose(db)
      .from("athena_experiments")
      .update({
        status: "rolled_back",
        ended_at: new Date().toISOString(),
        ended_by: args.actorId,
        adverse_effects: args.note ?? null,
      })
      .eq("hypothesis_id", args.hypothesisId)
      .eq("status", "active");
  }

  return { ok: true, version: newVersion };
}

async function conflictAcknowledged(hypothesisId: string): Promise<boolean> {
  try {
    const db = await admin();
    const { data } = await loose(db)
      .from("athena_hypothesis_reviews")
      .select("id")
      .eq("hypothesis_id", hypothesisId)
      .eq("action", "acknowledge_education_conflict")
      .limit(1);
    return ((data ?? []) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 6. Founder briefing
// ---------------------------------------------------------------------------

export interface FounderIntelligence {
  intelligenceVersion: string;
  briefing: BriefingSection[];
  hypotheses: (BriefingHypothesis & { id: string; reviewCount: number })[];
  totals: {
    observations: number;
    pairsObserved: number;
    predictions: number;
    outcomesLinked: number;
    aligned: number;
    diverged: number;
  };
}

export async function founderIntelligence(): Promise<FounderIntelligence> {
  const db = await admin();
  const version = await currentIntelligenceVersion();

  const [{ data: signals }, { data: preds }, { data: outs }, { data: hyps }, { data: reviews }] =
    await Promise.all([
      loose(db).from("athena_outcome_signals").select("pair_token").limit(10000),
      loose(db).from("athena_predictions").select("id").eq("learning_eligible", true),
      loose(db).from("athena_prediction_outcomes").select("divergence"),
      loose(db).from("athena_hypotheses").select("*").order("last_evaluated_at", { ascending: false }),
      loose(db).from("athena_hypothesis_reviews").select("hypothesis_id"),
    ]);

  const signalRows = (signals ?? []) as { pair_token: string }[];
  const outRows = (outs ?? []) as { divergence: string }[];
  const hypRows = (hyps ?? []) as Record<string, unknown>[];
  const reviewRows = (reviews ?? []) as { hypothesis_id: string }[];

  const mapped = hypRows.map((h) => ({
    id: h["id"] as string,
    slug: h["slug"] as string,
    statement: h["statement"] as string,
    dimension: h["dimension"] as string,
    status: h["status"] as HypothesisStatus,
    confidence: h["confidence_state"] as ConfidenceState,
    influence: h["operational_influence"] as OperationalInfluence,
    applicableCases: (h["applicable_cases"] as number) ?? 0,
    supporting: (h["supporting_count"] as number) ?? 0,
    contradicting: (h["contradicting_count"] as number) ?? 0,
    challengesEducation: Boolean(h["challenges_education"]),
    isSurprise: Boolean(h["is_surprise"]),
    sensitivity: h["sensitivity_flag"] as SensitivityFlag,
    alternativeExplanations: ((h["alternative_explanations"] as string[]) ?? []),
    universityPrinciples: ((h["university_principles"] as string[]) ?? []),
    reviewCount: reviewRows.filter((r) => r.hypothesis_id === h["id"]).length,
  }));

  const totals = {
    observations: signalRows.length,
    pairsObserved: new Set(signalRows.map((s) => s.pair_token)).size,
    predictions: ((preds ?? []) as unknown[]).length,
    outcomesLinked: outRows.length,
    aligned: outRows.filter((o) => o.divergence === "aligned").length,
    diverged: outRows.filter((o) => o.divergence === "diverged").length,
  };

  return {
    intelligenceVersion: version,
    briefing: composeBriefing({ intelligenceVersion: version, ...totals, hypotheses: mapped }),
    hypotheses: mapped,
    totals,
  };
}
