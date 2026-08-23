/**
 * READINESS TRUTHFULNESS (V1).
 *
 * ROOT CAUSE THIS ADDRESSES
 * Readiness is decided from persisted understanding (`introduction-readiness`),
 * which is correct — but a facet written from an existing exchange, a
 * confidence nudge, or a re-read could flip the answer on a turn where the
 * member said nothing substantively new. To the member that reads as a
 * contradiction: Athena says she needs to understand more, and then, one
 * "ok" later, says she has what she needs. That damages the one thing this
 * product runs on — that Athena means what she says.
 *
 * THE RULE
 * A readiness transition must correspond to genuinely new qualifying
 * information. If Athena has told a member she needs more, she may not claim
 * readiness until the understanding she holds has actually changed since that
 * statement. This never makes her claim readiness she lacks; it only delays a
 * claim she cannot yet honestly explain.
 *
 * This is pure and stateless. The signature travels with the conversation the
 * same way the time acknowledgement does.
 */

import type { FoundationalReadiness } from "./introduction-readiness";

export type ReadinessSignatureInput = {
  /** Required areas Athena currently holds, in any order. */
  satisfiedAreas: string[];
  /** How many facets are understood well enough to count. */
  understoodCount: number;
};

/**
 * A stable fingerprint of the qualifying understanding Athena holds. Two
 * identical signatures mean nothing qualifying has been added, whatever else
 * was said in between.
 */
export function understandingSignature(input: ReadinessSignatureInput): string {
  const areas = [...new Set(input.satisfiedAreas)].sort().join(",");
  return `${input.understoodCount}|${areas}`;
}

export function signatureFromReadiness(
  r: Pick<FoundationalReadiness, "missing" | "understoodCount">,
  allAreaKeys: string[],
): string {
  const missing = new Set(r.missing.map((a) => a.key));
  return understandingSignature({
    satisfiedAreas: allAreaKeys.filter((k) => !missing.has(k)),
    understoodCount: r.understoodCount,
  });
}

export type ReadinessClaim = {
  /** What Athena may say and act on this turn. */
  ready: boolean;
  /** True when readiness is genuinely held but not yet honestly claimable. */
  suppressed: boolean;
  /**
   * The signature to carry into the next turn: the understanding she held when
   * she last told the member she needed more. Null once nothing is pending.
   */
  shortfallSignature: string | null;
};

/**
 * Decide what Athena may claim this turn.
 *
 * - Not ready: record what she holds now, so the next claim must beat it.
 * - Ready with no prior shortfall statement: claim freely.
 * - Ready but holding exactly the understanding she called insufficient:
 *   suppress the claim for this turn and keep waiting for real information.
 */
export function resolveReadinessClaim(input: {
  ready: boolean;
  signature: string;
  /** Signature carried from the turn where she last said she needed more. */
  shortfallSignature: string | null;
}): ReadinessClaim {
  if (!input.ready) {
    return { ready: false, suppressed: false, shortfallSignature: input.signature };
  }
  if (input.shortfallSignature && input.shortfallSignature === input.signature) {
    return { ready: false, suppressed: true, shortfallSignature: input.shortfallSignature };
  }
  return { ready: true, suppressed: false, shortfallSignature: null };
}

/**
 * Posture for a suppressed turn. She does not announce the suppression; she
 * simply keeps doing what she said she would do — understand more.
 */
export function readinessTruthGuidance(claim: ReadinessClaim): string {
  if (!claim.suppressed) return "";
  return [
    "CONSISTENCY: you have already told them there is more you need to understand, and nothing you have learned since then has changed that.",
    "Do not now say or imply you have what you need. Do not reverse yourself on this turn.",
    "Continue the conversation naturally and learn something real; when it genuinely changes what you understand, you may say so then.",
  ].join(" ");
}
