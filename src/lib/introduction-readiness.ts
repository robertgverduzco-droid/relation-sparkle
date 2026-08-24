/**
 * Foundational readiness for INTRODUCTIONS (V1).
 *
 * ROOT CAUSE THIS ADDRESSES
 * Two readiness ideas were conflated. `foundational.ts` measures breadth of a
 * live conversation (was an area *touched*), and readiness state A/B/C
 * measured only facet count and average confidence. Neither asked the
 * matchmaking question: does Athena understand the specific things she needs
 * in order to introduce this person to a stranger? A member could therefore
 * answer four or five short questions, have a handful of thin facets written,
 * and Athena — reasoning only from her persona — could say matching may begin.
 *
 * This module supplies the missing determination. It is pure and derives
 * entirely from Athena's persisted understanding (the Living Profile), so it
 * works identically for a member mid-first-conversation and for a member who
 * returns a year later: historical understanding counts, and gaps reappear as
 * gaps. It is never a score, never a checklist shown to the member, and never
 * a question quota.
 */

import type { FacetKey } from "./facets";

export type UnderstandingRow = {
  facet_key: string;
  understanding: string | null;
  confidence: number | null;
  basis?: string | null;
};

export type RequiredArea = {
  key: string;
  /** Athena's own words for the area. Used only to shape her curiosity. */
  label: string;
  /** Any one of these facets, understood well enough, satisfies the area. */
  facets: FacetKey[];
};

/**
 * The understanding Athena must hold before she may consider introducing
 * someone. Deliberately semantic, not scripted: several different facets can
 * satisfy the same area, because members reach these truths by different
 * conversational routes.
 */
export const REQUIRED_UNDERSTANDING_AREAS: RequiredArea[] = [
  {
    key: "relationship_intent",
    label: "what they are actually looking for in a relationship",
    facets: ["partnership_vision", "life_direction", "readiness"],
  },
  {
    key: "values",
    label: "what they most value and how they orient their life",
    facets: ["core_values", "self_understanding", "purpose_and_ambition"],
  },
  {
    key: "communication",
    label: "how they communicate and connect",
    facets: ["communication_style", "emotional_regulation", "affection_and_connection"],
  },
  {
    key: "lifestyle",
    label: "the shape of their everyday life",
    facets: ["lifestyle", "health_and_wellness", "social_and_family"],
  },
  {
    key: "relational_patterns",
    label: "what they expect of a relationship and how they tend to be inside one",
    facets: ["attachment_tendencies", "conflict_style", "relationship_pacing"],
  },
  {
    key: "boundaries",
    label: "the boundaries and dealbreakers that genuinely matter to them",
    facets: ["boundaries"],
  },
  {
    key: "attraction",
    label: "what draws them to someone physically",
    facets: ["physical_attraction_preferences"],
  },
  // Rebuild Spec §3/§4 — the two intake tracks feed readiness directly.
  {
    key: "temperament",
    label: "what actually drives them — novelty, structure, drive or connection",
    facets: ["temperament_mode", "humor_and_temperament"],
  },
  {
    key: "nervous_system",
    label: "how they behave under closeness, conflict and inconsistency",
    facets: ["nervous_system_pattern", "attachment_tendencies"],
  },
];


/**
 * Additional breadth beyond the required areas. `foundational.ts` uses ≥8
 * touched domains to decide when a *conversation* may close gracefully.
 * Matchmaking eligibility is a higher bar than conversational completion, so
 * Athena wants understanding actually written down across at least this many
 * facets before she reasons about a stranger.
 */
// Raised from 9 with the Rebuild Spec: temperament and nervous-system pattern
// are now required areas of their own, so the breadth bar must stay above the
// count of required areas or "every area touched once" would pass as depth.
export const MIN_UNDERSTOOD_FACETS = 11;


/** Below this, Athena has an impression rather than an understanding. */
export const MIN_AREA_CONFIDENCE = 0.35;

/**
 * Minimum substance of a written understanding. This measures ATHENA's prose,
 * not the member's answer length: a terse member's "not really, appearance
 * barely matters" produces a perfectly substantial understanding. Terseness is
 * never penalised; emptiness is.
 */
const MIN_UNDERSTANDING_CHARS = 24;

export function facetUnderstood(row: UnderstandingRow | undefined): boolean {
  if (!row) return false;
  const text = (row.understanding ?? "").trim();
  if (text.length < MIN_UNDERSTANDING_CHARS) return false;
  if (/^(unknown|not (yet )?(known|discussed|explored)|none|n\/a)\b/i.test(text)) return false;
  return Number(row.confidence ?? 0) >= MIN_AREA_CONFIDENCE;
}

export type FoundationalReadiness = {
  ready: boolean;
  /** Areas Athena still needs. Internal only — never rendered as a checklist. */
  missing: RequiredArea[];
  /** True when the required areas are held but overall breadth is still thin. */
  breadthShort: boolean;
  understoodCount: number;
};

/**
 * Does Athena understand enough about this person to responsibly introduce
 * them? Derived from persisted understanding only, so client state, member
 * impatience, and conversational pressure cannot move it.
 */
export function assessFoundationalReadiness(rows: UnderstandingRow[]): FoundationalReadiness {
  const byKey = new Map<string, UnderstandingRow>();
  for (const r of rows ?? []) {
    const prev = byKey.get(r.facet_key);
    if (!prev || Number(r.confidence ?? 0) > Number(prev.confidence ?? 0)) byKey.set(r.facet_key, r);
  }

  const understoodCount = Array.from(byKey.values()).filter((r) => facetUnderstood(r)).length;

  const missing = REQUIRED_UNDERSTANDING_AREAS.filter(
    (area) => !area.facets.some((f) => facetUnderstood(byKey.get(f))),
  );

  const breadthShort = understoodCount < MIN_UNDERSTOOD_FACETS;
  return {
    ready: missing.length === 0 && !breadthShort,
    missing,
    breadthShort,
    understoodCount,
  };
}

/**
 * Guidance injected into Athena's conversation context. Sets posture and
 * curiosity only — never words, never counts, never a progress report.
 */
export function introductionReadinessGuidance(r: FoundationalReadiness): string {
  if (r.ready) {
    return [
      "INTRODUCTION READINESS: you now understand enough about this person to begin considering who might genuinely be worth meeting.",
      "You may say so plainly if they ask, while making clear that considering carefully is not the same as someone appearing soon.",
    ].join(" ");
  }

  const areas = r.missing.map((a) => a.label);
  if (r.breadthShort && areas.length === 0) areas.push("more of the ordinary texture of their life");

  return [
    "INTRODUCTION READINESS — HOLD THE THRESHOLD.",
    "You do NOT yet understand enough about this person to introduce them to anyone, and you may not say or imply that you could begin matching now, soon, immediately, or if they insist.",
    `Understanding you still need: ${areas.join("; ")}.`,
    "If they ask how many questions are required, do not invent a number — there is no number. Say naturally that it is not about a count; there are a few parts of their life and of what they want that you need to understand before you would feel good introducing them to someone.",
    "If they press you to start matching now, stay warm and hold the line in your own words — something in the spirit of: you are getting there, you already know some things about them, and there are still parts of the picture you need first. Never apologise for the standard, never bargain, never offer a lesser introduction, and never promise a timeframe.",
    "Impatience, terseness, sarcasm or mild rudeness change nothing about the standard and are not held against them. Simply continue the conversation, asking simpler or differently framed questions if that helps.",
    "Do not name categories, list requirements, count anything, or describe progress. Never mention percentages, scores, or how much is left.",
  ].join(" ");
}

/** The member is asking about the requirement itself. */
export function asksAboutRequirement(text: string): boolean {
  return /\b(how many (more )?(questions|things)|how long (until|before)|how much longer|when (can|will) (you|we) (start|begin) (matching|introduc)|are we done|is that enough|enough (questions|answers)|what do you still need)\b/i.test(
    text ?? "",
  );
}

/** The member is asking Athena to begin matching now. */
export function asksToBeginMatching(text: string): boolean {
  return /\b((just )?start matching|match me( now| already)?|begin matching|introduce me( to someone| now| already)?|find me someone|set me up|skip (the|this) (rest|questions)|can we (just )?(get|move) (to|on to) (the )?match)/i.test(
    text ?? "",
  );
}
