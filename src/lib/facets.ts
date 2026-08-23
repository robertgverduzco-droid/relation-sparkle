// Facet keys Athena tracks and refines through conversation.
// Extensible: add keys here; storage is a keyed table, no schema change needed.
export const FACET_KEYS = [
  "core_values",
  "life_direction",
  "self_understanding",
  "communication_style",
  "emotional_regulation",
  "conflict_style",
  "attachment_tendencies",
  "affection_and_connection",
  "boundaries",
  "lifestyle",
  "social_and_family",
  "purpose_and_ambition",
  "intellectual_fit",
  "humor_and_temperament",
  "financial_philosophy",
  "health_and_wellness",
  "relationship_pacing",
  "physical_attraction_preferences",
  "resilience_and_growth",
  "partnership_vision",
  "readiness",
] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

export const FACET_LABELS: Record<FacetKey, string> = {
  core_values: "What you care about",
  life_direction: "Where your life is going",
  self_understanding: "How you understand yourself",
  communication_style: "How you tend to communicate",
  emotional_regulation: "How you move through feelings",
  conflict_style: "How you handle conflict",
  attachment_tendencies: "How you tend to connect",
  affection_and_connection: "How you show and receive affection",
  boundaries: "Where your lines are",
  lifestyle: "The shape of your days",
  social_and_family: "Your people",
  purpose_and_ambition: "What you're building",
  intellectual_fit: "How your mind moves",
  humor_and_temperament: "Your humor and temperament",
  financial_philosophy: "How you relate to money",
  health_and_wellness: "How you tend to your body and mind",
  relationship_pacing: "The pace that feels right",
  physical_attraction_preferences: "What draws you in",
  resilience_and_growth: "How you meet hard things and change",
  partnership_vision: "What you're building toward with someone",
  readiness: "Where you are right now",
};


// F-14 provenance (BR01-04), extended to the evidence ladder by Evidentiary
// Discipline V1. Client-safe so member surfaces can render it without
// importing server-only understanding logic.
export type FacetBasis =
  | "self_report"
  | "observed"
  | "repeated_pattern"
  | "inferred"
  | "hypothesis"
  | "unestablished";

/**
 * Member-facing wording for each rung. Honest about standing without turning
 * the profile into a provenance audit: "you told me" and "I've noticed" are
 * genuinely different claims and members can see which one Athena is making.
 */
export const BASIS_LABEL: Record<FacetBasis, string> = {
  self_report: "you told me",
  observed: "I've noticed",
  repeated_pattern: "I've seen this more than once",
  inferred: "I inferred",
  hypothesis: "still checking this",
  unestablished: "from our conversations",
};

