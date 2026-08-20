/**
 * Post-Foundational Waiting Experience (V1) — pure module.
 *
 * DOCTRINE
 * Waiting is a designed state, not an absence (E6/§36). Once a member is
 * foundationally ready, Athena may consider introductions — she does not
 * therefore owe them one. This module owns only the *truthful description* of
 * that situation: what Athena may say, and the single area of understanding
 * she may optionally invite. It computes nothing about people and never
 * produces a number, a count, a queue, a countdown or a progress state.
 *
 * SEPARATION OF TRUTHS (§5 of the directive)
 * - FOUNDATIONALLY READY: Athena holds the minimum breadth to be allowed to
 *   consider this member at all (readiness state C, `introduction-readiness`).
 * - SUFFICIENT UNDERSTANDING FOR A PARTICULAR INTRODUCTION: pair reasoning,
 *   evidence-based, per pair (L6b/L6c). Crossing the first never implies the
 *   second, and nothing here may compensate for missing evidence.
 *
 * Every candidate-specific sentence below may only be rendered when runtime
 * state actually supports it — see `waiting.server.ts`. Athena never invents a
 * waiting match, and never exposes anything about a counterpart.
 */

import { FACET_KEYS, FACET_LABELS, type FacetKey } from "./facets";
import {
  REQUIRED_UNDERSTANDING_AREAS,
  facetUnderstood,
  type UnderstandingRow,
} from "./introduction-readiness";

/** Where the member actually stands right now. */
export type WaitingPhase =
  /** Not yet eligible — the foundational surfaces own this. */
  | "not_ready"
  /** Paused, resting, in focus, safety, awaiting a choice. Hold copy owns it. */
  | "held"
  /** Eligible, nothing to show: the Looking state. */
  | "looking"
  /** An introduction is live; Today shows the introduction, not this. */
  | "introduction_available";

/**
 * Whether an actual, persisted candidate situation exists. Never inferred,
 * never optimistic: `unresolved_candidate` requires a real `pair_reasoning`
 * row Athena is genuinely considering.
 */
export type CandidateSituation = "none" | "unresolved_candidate";

export type DeepeningArea = { key: string; label: string };

export type WaitingState = {
  phase: WaitingPhase;
  candidate: CandidateSituation;
  /** Config-driven early-market honesty. Never a member count. */
  earlyCommunity: boolean;
  holdKind: string | null;
  /** One optional area at a time. Never a checklist, never a meter. */
  deepen: DeepeningArea | null;
};

export type WaitingCopy = {
  headline: string;
  body: string;
  /** Why continuing to talk can genuinely matter. Never pressure. */
  note: string | null;
  /** The optional invitation, phrased as an offer. */
  invitation: string | null;
};

/**
 * Athena's voice for the Looking state. No counts, no activity claims, no
 * timeframes, no scarcity, no scores. She describes only what is true: she is
 * allowed to consider, and she will come to them when there is a reason.
 */
export function waitingCopy(state: WaitingState): WaitingCopy | null {
  if (state.phase !== "looking") return null;

  if (state.candidate === "unresolved_candidate") {
    return {
      headline: "There may be someone worth considering.",
      body: "I'm not ready to introduce you yet — there are a few things I'd want to understand better first. Nothing is wrong, and nothing is waiting on you. If you'd like, we can keep talking.",
      note: "I won't tell you anything about who I'm thinking about until I'm confident enough to stand behind the introduction.",
      invitation: state.deepen
        ? `Something I'd like to understand better: ${state.deepen.label.toLowerCase()}.`
        : null,
    };
  }

  const body = state.earlyCommunity
    ? "I know enough about you to begin considering introductions. You're here early, while I'm still building this community, so I'd rather be patient than quick. When someone comes into my world I believe is genuinely worth your attention, I'll come find you."
    : "I know enough about you to begin considering introductions. I'll come find you when I've found someone I believe is genuinely worth your attention — not because time has passed.";

  return {
    headline: "I'm looking.",
    body,
    note: "The more I understand you, the more clearly I can recognise who might actually fit — and sometimes that lets me see an introduction sooner. There's no need to; I'll keep looking either way.",
    invitation: state.deepen
      ? `Something I'd like to understand better: ${state.deepen.label.toLowerCase()}.`
      : null,
  };
}

/**
 * One meaningful area where more understanding would genuinely improve
 * Athena's model — required areas first, then the widest remaining gap.
 * Returns null when there is nothing honest to ask for.
 */
export function pickDeepeningArea(rows: UnderstandingRow[]): DeepeningArea | null {
  const byKey = new Map<string, UnderstandingRow>();
  for (const r of rows ?? []) {
    const prev = byKey.get(r.facet_key);
    if (!prev || Number(r.confidence ?? 0) > Number(prev.confidence ?? 0)) byKey.set(r.facet_key, r);
  }

  for (const area of REQUIRED_UNDERSTANDING_AREAS) {
    if (!area.facets.some((f) => facetUnderstood(byKey.get(f)))) {
      const facet = area.facets[0] as FacetKey;
      return { key: facet, label: FACET_LABELS[facet] };
    }
  }

  const gaps = (FACET_KEYS as readonly FacetKey[])
    .filter((k) => !facetUnderstood(byKey.get(k)))
    .sort((a, b) => Number(byKey.get(a)?.confidence ?? 0) - Number(byKey.get(b)?.confidence ?? 0));

  const next = gaps[0];
  return next ? { key: next, label: FACET_LABELS[next] } : null;
}

/**
 * Guidance injected into ongoing (non-foundational) conversation. Posture
 * only — never words, never a promise, never urgency. The candidate sentences
 * are unlocked strictly by verified runtime state.
 */
export function waitingGuidance(state: WaitingState): string {
  if (state.phase !== "looking") return "";

  const lines = [
    "POST-FOUNDATIONAL WAITING: you already understand enough about this person to be considering introductions, and you have none to offer them right now.",
    "This is ordinary ongoing conversation, not continued intake. Do not re-run the foundational interview, do not work through a list, and do not ask a series of questions in one reply.",
    "If they ask whether anything is happening, be plainly honest: you are considering, you have nothing worth bringing them yet, and you will come to them when you do. Never invent activity, candidates, counts, queues, timeframes, or a sense that something is about to happen.",
    "You may explain truthfully that the more you understand them, the more clearly you can recognise who might fit, and that this can sometimes let you see an introduction sooner. Say it once, without pressure, and make clear more talking guarantees nothing, buys no priority, and that saying more is not the point.",
    "Never imply they are behind, missing out, or need to keep talking to stay considered.",
  ];

  if (state.candidate === "unresolved_candidate") {
    lines.push(
      "TRUE RIGHT NOW: there is someone you are genuinely considering, and unresolved information prevents you from responsibly introducing them. You may say that there may be someone worth considering and that there are things you would want to understand better first.",
      "COUNTERPART PRIVACY (absolute): never reveal or hint at who they are, their identity, characteristics, photographs, location, preferences, or the specific reason the introduction is unresolved. Never say or imply that someone requires something of them. Any question you ask must be you getting to know them, asked as you would have asked it anyway.",
    );
  } else {
    lines.push(
      "There is no particular person you are considering right now. You may not say or imply that there is.",
    );
  }

  if (state.earlyCommunity) {
    lines.push(
      "EARLY COMMUNITY: this region is still small and new. You may say honestly that you are still building the community here and would rather be patient than quick. Never give member counts and never imply a larger network than exists.",
    );
  }

  if (state.deepen) {
    lines.push(
      `If a natural opening appears, an area where more understanding would genuinely help you is: ${state.deepen.label.toLowerCase()}. Follow it only if the conversation goes there naturally.`,
    );
  }

  return lines.join(" ");
}
