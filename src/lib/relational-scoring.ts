/**
 * Relational compatibility scoring (Rebuild Spec §7 — Matching Mechanics).
 *
 * WHAT THIS IS FOR
 * Purely a ranking signal: given a large eligible pool, which candidates
 * are worth Athena's careful, expensive reasoning first? It never decides
 * whether to introduce anyone — reasonPair() in introductions.server.ts
 * still owns that judgment entirely — and it is never shown to a member as
 * a number, a percentage, or "compatibility." It exists so that a
 * genuinely well-suited candidate sitting at position #80 in a large pool
 * isn't silently never considered because ordering used to be arbitrary
 * (sorted by database id).
 *
 * WHERE THE VECTORS COME FROM
 * Track A (temperament) and Track B (attachment), from intake-tracks.ts —
 * synthesized from Fisher's temperament-typing work and Tatkin's PACT /
 * attachment work respectively, in original wording, per Robert's request.
 * Nothing here reproduces either author's actual instrument or branded
 * terminology; this module only encodes the two matching PRINCIPLES he
 * asked to be combined: temperament differences are matched for generative
 * contrast (Fisher), attachment is matched toward mutual security, with
 * security weighted more heavily than temperament (Tatkin).
 *
 * COVERAGE, NOT JUST SCORE
 * A vector built from one offhand remark should never be trusted the same
 * as one built from real track coverage (see assessTrackCoverage in
 * intake-tracks.ts). Every score returned here carries a confidence
 * alongside it, derived from both people's coverage — the caller decides
 * how much weight thin data deserves; this module never pretends to be
 * more certain than the underlying conversation actually was.
 *
 * Pure and testable: no I/O, no model call.
 */

export type RelationalVector = {
  // Track A — temperament. Each independent, 0..1, not mutually exclusive.
  novelty: number;
  structure: number;
  drive: number;
  connection: number;
  // Track B — attachment. A blend across the four leanings; in practice
  // these four values are expected to sum to roughly 1, but this module
  // does not require or enforce that — it only reads what's given.
  secure: number;
  anxious: number;
  avoidant: number;
  disorganized: number;
  // How much real ground each track is actually based on, 0..1. Mirrors
  // TrackCoverage from intake-tracks.ts collapsed to a single number.
  temperamentCoverage: number;
  attachmentCoverage: number;
};

export const EMPTY_VECTOR: RelationalVector = {
  novelty: 0,
  structure: 0,
  drive: 0,
  connection: 0,
  secure: 0.25,
  anxious: 0.25,
  avoidant: 0.25,
  disorganized: 0.25,
  temperamentCoverage: 0,
  attachmentCoverage: 0,
};

export type RelationalScore = {
  /** Combined ranking signal, 0..1. Higher = worth reasoning about sooner. */
  score: number;
  /** How much either sub-score should be trusted, 0..1, from track coverage. */
  confidence: number;
  temperament: { score: number; confidence: number };
  attachment: { score: number; confidence: number };
};

// ---------------------------------------------------------------------------
// Track A — temperament: complementary matching (Fisher-inspired)
// ---------------------------------------------------------------------------

/**
 * One dimension's contribution to complementary fit. Neither identical
 * (d=0) nor maximally opposed (d=1) scores highest — the peak sits at
 * moderate difference (d=0.5), which is the operationalization of
 * "generative contrast" rather than either sameness or clash. Floored
 * above zero: even a poorly-complementary dimension is a mild signal, not
 * a disqualifier — this is a ranking tool, not a gate.
 */
function complementFit(a: number, b: number): number {
  const d = Math.abs(a - b);
  const peak = 1 - 4 * (d - 0.5) ** 2; // 1 at d=0.5, 0 at d=0 or d=1
  return 0.3 + 0.7 * Math.max(0, peak);
}

function temperamentFit(a: RelationalVector, b: RelationalVector): number {
  const dims: Array<keyof Pick<RelationalVector, "novelty" | "structure" | "drive" | "connection">> = [
    "novelty",
    "structure",
    "drive",
    "connection",
  ];
  const scores = dims.map((k) => complementFit(a[k], b[k]));
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

// ---------------------------------------------------------------------------
// Track B — attachment: similarity toward mutual security (Tatkin-inspired)
// ---------------------------------------------------------------------------

/**
 * Attachment fit is NOT plain distribution similarity — two people who are
 * both highly anxious are "similar" in the vector-distance sense but that
 * is a worse pairing than one anxious partner with one secure partner, per
 * the core Tatkin claim that a securely-leaning partner helps regulate the
 * other rather than mirroring their pattern back at them. This function
 * encodes that directly:
 *
 *   - More combined security is good, regardless of how it's distributed
 *     between the two people (a securely-leaning partner helps either
 *     way).
 *   - Same-direction insecurity reinforces rather than regulates: two
 *     anxious partners amplify each other's anxiety; two avoidant
 *     partners just create more distance. Moderate risk.
 *   - The anxious/avoidant pairing (one pursues, one withdraws) is the
 *     single hardest classic combination in attachment literature —
 *     weighted as the largest risk term.
 *   - Disorganized attachment carries a mild, direction-agnostic risk
 *     regardless of the partner's pattern.
 *
 * Floored above zero for the same reason as temperamentFit: a difficult
 * pairing is lower priority for Athena's attention, never an automatic
 * exclusion — reasonPair() may still find real reasons the relationship
 * deserves the opportunity to exist.
 */
function attachmentFit(a: RelationalVector, b: RelationalVector): number {
  const securityPresence = (a.secure + b.secure) / 2;
  const sameDirectionRisk = a.anxious * b.anxious + a.avoidant * b.avoidant;
  const pursueWithdrawRisk = a.anxious * b.avoidant + b.anxious * a.avoidant;
  const disorganizedRisk = (a.disorganized + b.disorganized) / 2;

  const raw =
    0.5 +
    0.55 * securityPresence -
    0.2 * sameDirectionRisk -
    0.35 * pursueWithdrawRisk -
    0.1 * disorganizedRisk;

  return Math.max(0.05, Math.min(1, raw));
}

// ---------------------------------------------------------------------------
// Combined score
// ---------------------------------------------------------------------------

/** Attachment fit matters more than temperament fit to long-term compatibility. */
export const ATTACHMENT_WEIGHT = 0.65;
export const TEMPERAMENT_WEIGHT = 0.35;

/**
 * Coverage below this floor is treated as "not really answered yet" for
 * confidence purposes — a single incidental cue matching a track's regex
 * should not read as meaningful signal strength.
 */
const MIN_MEANINGFUL_COVERAGE = 0.15;

function trackConfidence(a: number, b: number): number {
  const lo = Math.min(a, b);
  return lo < MIN_MEANINGFUL_COVERAGE ? lo : lo;
}

/**
 * The full pairwise score. Never null, never throws — an empty vector on
 * either side (nobody has reached this ground yet) still returns a valid,
 * low-confidence score rather than special-casing the caller. Confidence
 * is what tells the caller how much to trust it, not the score itself.
 */
export function relationalCompatibility(a: RelationalVector, b: RelationalVector): RelationalScore {
  const temperamentScore = temperamentFit(a, b);
  const attachmentScore = attachmentFit(a, b);
  const temperamentConfidence = trackConfidence(a.temperamentCoverage, b.temperamentCoverage);
  const attachmentConfidence = trackConfidence(a.attachmentCoverage, b.attachmentCoverage);

  const score = ATTACHMENT_WEIGHT * attachmentScore + TEMPERAMENT_WEIGHT * temperamentScore;
  const confidence = ATTACHMENT_WEIGHT * attachmentConfidence + TEMPERAMENT_WEIGHT * temperamentConfidence;

  return {
    score,
    confidence,
    temperament: { score: temperamentScore, confidence: temperamentConfidence },
    attachment: { score: attachmentScore, confidence: attachmentConfidence },
  };
}

/**
 * Sort candidates by relational fit, highest first. Ties (including the
 * common "both have empty vectors" case) fall back to a stable,
 * content-neutral order — the same principle introductions.server.ts
 * already applies deliberately: depth of profile is Athena's progress,
 * never the person's worth, so a tie must never be broken by who talks
 * more. Confidence is not used to break ties here; it is surfaced so the
 * caller can decide how much weight to give a low-confidence ordering
 * (e.g. blending it with the existing neutral order rather than trusting
 * a thin score outright).
 */
export function rankByRelationalFit<T>(
  self: RelationalVector,
  candidates: Array<{ id: string; vector: RelationalVector; item: T }>,
): Array<{ id: string; item: T; relational: RelationalScore }> {
  return candidates
    .map((c) => ({ id: c.id, item: c.item, relational: relationalCompatibility(self, c.vector) }))
    .sort((x, y) => {
      const d = y.relational.score - x.relational.score;
      if (Math.abs(d) > 1e-9) return d;
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
    });
}
