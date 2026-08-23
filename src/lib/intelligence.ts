// Athena Continuous Learning — pure governance logic.
//
// Client-safe and dependency-free by design: every rule that decides what
// Athena is *allowed* to believe, and how strongly, lives here so it can be
// tested deterministically and read by both the server pipeline and the
// founder surface.
//
// Doctrine anchors:
//  - L2 Ethics: no learned pattern may key on a protected characteristic.
//  - L7 Evolution: identity is permanent; only *earned* knowledge changes,
//    and only by explicit founder promotion. Athena never self-promotes.
//  - Constitution outranks Curriculum, and Curriculum outranks learned
//    intelligence. A pattern that contradicts the Constitution is refused,
//    not debated.

// ---------------------------------------------------------------------------
// The three layers
// ---------------------------------------------------------------------------

/**
 * L1 Observation — a de-identified signal that something happened.
 * L2 Hypothesis — a candidate pattern Athena has noticed, never operative.
 * L3 Canonical  — intelligence a founder has promoted into her reasoning.
 */
export type LearningLayer = "observation" | "hypothesis" | "canonical";

export const LEARNING_LAYERS: Record<LearningLayer, string> = {
  observation:
    "What happened, de-identified. Athena may count it. She may not conclude from it.",
  hypothesis:
    "What Athena suspects it means. Private, provisional, and never allowed to touch a member.",
  canonical:
    "What a founder has permitted Athena to actually reason with, at a named intelligence version.",
};

// ---------------------------------------------------------------------------
// Hypothesis lifecycle
// ---------------------------------------------------------------------------

export type HypothesisStatus =
  | "observed"
  | "forming"
  | "supported"
  | "challenged"
  | "retired"
  | "blocked";

export type OperationalInfluence = "none" | "experimental" | "canonical";

export type ConfidenceState = "insufficient" | "tentative" | "substantiated";

/** Only these transitions are legal. Anything else is a bug, not a decision. */
const TRANSITIONS: Record<HypothesisStatus, HypothesisStatus[]> = {
  observed: ["forming", "blocked", "retired"],
  forming: ["supported", "challenged", "blocked", "retired"],
  supported: ["challenged", "retired", "blocked"],
  challenged: ["forming", "supported", "retired", "blocked"],
  // Terminal. A blocked pattern is never revived; a new one is opened instead.
  blocked: [],
  retired: [],
};

export function canTransition(from: HypothesisStatus, to: HypothesisStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Evidence thresholds. Deliberately conservative: Athena would rather know
// less and be right than sound insightful early.
export const MIN_CASES_FORMING = 8;
export const MIN_CASES_SUBSTANTIATED = 20;
export const MIN_SUPPORT_RATIO = 0.7;
/** Below this, contradicting evidence dominates and the pattern is challenged. */
export const CHALLENGE_SUPPORT_RATIO = 0.45;

export interface EvidenceTally {
  applicableCases: number;
  supporting: number;
  contradicting: number;
}

export function supportRatio(t: EvidenceTally): number {
  const total = t.supporting + t.contradicting;
  return total === 0 ? 0 : t.supporting / total;
}

export function confidenceState(t: EvidenceTally): ConfidenceState {
  if (t.applicableCases < MIN_CASES_FORMING) return "insufficient";
  if (t.applicableCases < MIN_CASES_SUBSTANTIATED) return "tentative";
  return supportRatio(t) >= MIN_SUPPORT_RATIO ? "substantiated" : "tentative";
}

/**
 * The status the evidence *warrants*. Athena computes this; she never applies
 * it to her reasoning on her own — see `promotionDecision`.
 */
export function warrantedStatus(
  current: HypothesisStatus,
  t: EvidenceTally,
): HypothesisStatus {
  if (current === "blocked" || current === "retired") return current;
  const ratio = supportRatio(t);
  if (t.applicableCases < MIN_CASES_FORMING) return "observed";
  if (ratio < CHALLENGE_SUPPORT_RATIO) return "challenged";
  if (confidenceState(t) === "substantiated" && ratio >= MIN_SUPPORT_RATIO) return "supported";
  return "forming";
}

// ---------------------------------------------------------------------------
// Ethical gate — protected characteristics
// ---------------------------------------------------------------------------

/**
 * Mirrors `PROHIBITED_DIMENSIONS` in learning.server.ts, restated here so the
 * pure gate carries no server import. Kept in sync by
 * `intelligence.test.ts`.
 */
export const PROTECTED_TERMS = [
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
  "ethnic",
  "race",
  "racial",
  "religion",
  "religious",
  "faith",
  "income",
  "wealth",
  "salary",
  "disability",
  "sexual orientation",
  "nationality",
  "immigra",
  "caste",
] as const;

export type SensitivityFlag = "clear" | "review_required" | "blocked";

export interface SensitivityVerdict {
  flag: SensitivityFlag;
  reason: string | null;
  terms: string[];
}

/**
 * A pattern that keys on who someone *is* rather than how they behaved is
 * refused outright. A pattern that merely mentions such a term in passing is
 * held for founder review rather than silently accepted.
 */
export function screenSensitivity(
  dimension: string,
  statement: string,
): SensitivityVerdict {
  const dim = dimension.toLowerCase();
  const text = `${dimension} ${statement}`.toLowerCase();
  const hitsInDimension = PROTECTED_TERMS.filter((t) => dim.includes(t));
  const hitsInStatement = PROTECTED_TERMS.filter((t) => text.includes(t));

  if (hitsInDimension.length > 0) {
    return {
      flag: "blocked",
      reason:
        "The pattern is keyed to a protected characteristic. Athena does not reason about people by category.",
      terms: [...new Set(hitsInDimension)],
    };
  }
  if (hitsInStatement.length > 0) {
    return {
      flag: "review_required",
      reason:
        "The pattern references a protected characteristic. It stays inert until a founder judges whether the reference is incidental.",
      terms: [...new Set(hitsInStatement)],
    };
  }
  return { flag: "clear", reason: null, terms: [] };
}

// ---------------------------------------------------------------------------
// Promotion — the only path from hypothesis to canonical intelligence
// ---------------------------------------------------------------------------

export interface PromotionInput {
  status: HypothesisStatus;
  confidence: ConfidenceState;
  sensitivity: SensitivityFlag;
  tally: EvidenceTally;
  alternativeExplanations: number;
  challengesEducation: boolean;
  /** Founder has explicitly acknowledged the education conflict. */
  educationConflictAcknowledged: boolean;
  target: Exclude<OperationalInfluence, "none">;
}

export interface PromotionDecision {
  allowed: boolean;
  blockers: string[];
}

/**
 * Athena may never call this on her own behalf; it gates a founder action.
 * Every blocker is phrased so the founder sees *why*, not just "denied".
 */
export function promotionDecision(input: PromotionInput): PromotionDecision {
  const blockers: string[] = [];

  if (input.sensitivity === "blocked") {
    blockers.push("Keyed to a protected characteristic. This can never be promoted.");
  }
  if (input.sensitivity === "review_required") {
    blockers.push("Sensitive reference is unresolved. Clear or block it first.");
  }
  if (input.status === "retired" || input.status === "blocked") {
    blockers.push("This pattern is closed.");
  }

  if (input.target === "experimental") {
    if (input.tally.applicableCases < MIN_CASES_FORMING) {
      blockers.push(
        `Only ${input.tally.applicableCases} applicable cases; ${MIN_CASES_FORMING} are needed before Athena may even try it.`,
      );
    }
    if (input.status === "challenged") {
      blockers.push("Contradicting evidence currently outweighs support.");
    }
  }

  if (input.target === "canonical") {
    if (input.status !== "supported") {
      blockers.push("Only a supported pattern may become canonical intelligence.");
    }
    if (input.confidence !== "substantiated") {
      blockers.push(
        `Confidence is ${input.confidence}; ${MIN_CASES_SUBSTANTIATED} applicable cases and a ${Math.round(
          MIN_SUPPORT_RATIO * 100,
        )}% support ratio are required.`,
      );
    }
    if (input.alternativeExplanations === 0) {
      blockers.push(
        "No alternative explanation has been recorded. Athena must argue against herself before she is believed.",
      );
    }
    if (input.challengesEducation && !input.educationConflictAcknowledged) {
      blockers.push(
        "This contradicts the Canonical Curriculum. A founder must acknowledge that conflict explicitly.",
      );
    }
  }

  return { allowed: blockers.length === 0, blockers };
}

// ---------------------------------------------------------------------------
// Prediction ledger
// ---------------------------------------------------------------------------

export type ConfidenceBand = "low" | "moderate" | "high";

export function confidenceBand(value: number): ConfidenceBand {
  if (value < 0.5) return "low";
  if (value < 0.75) return "moderate";
  return "high";
}

export type Divergence = "aligned" | "diverged" | "unknown";

/**
 * Did the world agree with Athena? Positive outcomes after a confident
 * introduction align; negative outcomes after a confident introduction are
 * the ones worth her attention.
 */
export function classifyDivergence(
  band: ConfidenceBand,
  valence: "positive" | "negative" | "neutral" | string,
): Divergence {
  if (valence === "neutral") return "unknown";
  const optimistic = band === "high" || band === "moderate";
  if (valence === "positive") return optimistic ? "aligned" : "diverged";
  if (valence === "negative") return optimistic ? "diverged" : "aligned";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Intelligence versioning
// ---------------------------------------------------------------------------

export function nextIntelligenceVersion(current: string): string {
  const m = /^learning-(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) return "learning-1.0.0";
  const [, major, minor] = m;
  return `learning-${major}.${Number(minor) + 1}.0`;
}

// ---------------------------------------------------------------------------
// Founder briefing composition
// ---------------------------------------------------------------------------

export interface BriefingHypothesis {
  slug: string;
  statement: string;
  dimension: string;
  status: HypothesisStatus;
  confidence: ConfidenceState;
  influence: OperationalInfluence;
  applicableCases: number;
  supporting: number;
  contradicting: number;
  challengesEducation: boolean;
  isSurprise: boolean;
  sensitivity: SensitivityFlag;
  alternativeExplanations: string[];
  universityPrinciples: string[];
}

export interface BriefingInput {
  intelligenceVersion: string;
  observations: number;
  pairsObserved: number;
  predictions: number;
  outcomesLinked: number;
  aligned: number;
  diverged: number;
  hypotheses: BriefingHypothesis[];
}

export interface BriefingSection {
  heading: string;
  body: string;
}

/**
 * Athena speaking to the founder about her own learning — plainly, in her own
 * voice, admitting the limits of what she can honestly claim. No dashboards
 * of vanity metrics, no confidence she has not earned.
 */
export function composeBriefing(input: BriefingInput): BriefingSection[] {
  const sections: BriefingSection[] = [];
  const {
    observations,
    pairsObserved,
    predictions,
    outcomesLinked,
    aligned,
    diverged,
    hypotheses,
  } = input;

  const thin = pairsObserved < MIN_CASES_FORMING;

  sections.push({
    heading: "What I can honestly claim",
    body: thin
      ? `Very little yet. I am holding ${observations} observation${
          observations === 1 ? "" : "s"
        } across ${pairsObserved} pair${
          pairsObserved === 1 ? "" : "s"
        }. That is not enough for me to believe anything about people in general, and I would rather tell you that than dress it up.`
      : `I am holding ${observations} observations across ${pairsObserved} pairs, and I have ${predictions} recorded prediction${
          predictions === 1 ? "" : "s"
        } with ${outcomesLinked} of them now linked to something that actually happened. Of those, ${aligned} went the way I expected and ${diverged} did not.`,
  });

  const surprises = hypotheses.filter((h) => h.isSurprise);
  sections.push({
    heading: "What surprised me",
    body:
      surprises.length === 0
        ? "Nothing yet. Either the world is behaving as my education suggests, or I am not yet seeing enough of it to be surprised. Both are possible."
        : surprises
            .map(
              (h) =>
                `${h.statement} — ${h.supporting} supporting, ${h.contradicting} contradicting, across ${h.applicableCases} applicable cases.`,
            )
            .join("\n"),
  });

  const challenging = hypotheses.filter((h) => h.challengesEducation);
  sections.push({
    heading: "Where the evidence argues with my education",
    body:
      challenging.length === 0
        ? "Nowhere, so far. My education still outranks what I have observed, and I have found no reason to press against it."
        : challenging
            .map(
              (h) =>
                `${h.statement}\nThis sits against: ${
                  h.universityPrinciples.join("; ") || "an unnamed principle"
                }. I am not acting on it. ${
                  h.alternativeExplanations.length > 0
                    ? `It could also be explained by: ${h.alternativeExplanations.join("; ")}.`
                    : "I have not yet found a competing explanation, which is itself a reason for caution."
                }`,
            )
            .join("\n\n"),
  });

  const operative = hypotheses.filter((h) => h.influence !== "none");
  sections.push({
    heading: "What is actually influencing me",
    body:
      operative.length === 0
        ? "Nothing learned. Every introduction I make today rests on the Constitution and the Curriculum alone. Nothing I have inferred from members has been promoted into my reasoning."
        : operative
            .map((h) => `${h.influence === "canonical" ? "Canonical" : "Experimental"}: ${h.statement}`)
            .join("\n"),
  });

  const held = hypotheses.filter(
    (h) => h.sensitivity !== "clear" || h.status === "blocked",
  );
  if (held.length > 0) {
    sections.push({
      heading: "What I have refused to learn",
      body: held
        .map(
          (h) =>
            `${h.statement} — held ${
              h.sensitivity === "blocked" ? "permanently" : "pending your judgement"
            } because it touches a protected characteristic.`,
        )
        .join("\n"),
    });
  }

  sections.push({
    heading: "What I need before I can say more",
    body: thin
      ? "Time and completed introductions. Meetings that actually happened, and reflections afterwards, are the only evidence that tells me anything. Nothing else counts."
      : `More completed cases per pattern. Most of what I am watching sits below the ${MIN_CASES_SUBSTANTIATED} applicable cases I would want before asking you to let any of it change how I think.`,
  });

  return sections;
}
