// Living Profile depth & specialist-lens model.
//
// This file EXTENDS the existing facet architecture (src/lib/facets.ts). It
// creates no second profile system and no new domains: every lens is a
// grouping of canonical facet keys, so storage, provenance (F-14), revision
// rights (F-13) and matchmaking all continue to read the same rows.
//
// Doctrine:
//   L4 — depth follows evidence. Stages are internal and qualitative; they are
//        never shown to members as scores, levels, percentages or badges.
//   L5 — understanding accumulates and stays revisable.
//   Quality over length: a stage raises the *ceiling* on synthesis, never
//        obliges Athena to write more than she honestly understands.
import { FACET_KEYS, FACET_LABELS, type FacetKey } from "./facets";

// ---------------------------------------------------------------------------
// Specialist lenses
// ---------------------------------------------------------------------------

export type LensKey =
  | "what_matters"
  | "how_you_connect"
  | "friction_and_boundaries"
  | "attraction"
  | "everyday_life"
  | "mind_and_humor"
  | "where_you_are_going"
  | "how_you_have_grown";

export const LENS_ORDER: LensKey[] = [
  "what_matters",
  "how_you_connect",
  "friction_and_boundaries",
  "attraction",
  "everyday_life",
  "mind_and_humor",
  "where_you_are_going",
  "how_you_have_grown",
];

export const LENS_LABELS: Record<LensKey, string> = {
  what_matters: "What matters to you",
  how_you_connect: "How you connect",
  friction_and_boundaries: "Friction and boundaries",
  attraction: "Attraction",
  everyday_life: "Everyday life",
  mind_and_humor: "Your mind and your humour",
  where_you_are_going: "Where you're going",
  how_you_have_grown: "How you've grown",
};

/** Every canonical facet belongs to exactly one lens. No facet is orphaned. */
export const LENS_FACETS: Record<LensKey, FacetKey[]> = {
  what_matters: ["core_values", "purpose_and_ambition"],
  how_you_connect: [
    "communication_style",
    "affection_and_connection",
    "attachment_tendencies",
    // Rebuild Spec Track B — how they are under closeness and inconsistency.
    "nervous_system_pattern",
  ],
  friction_and_boundaries: ["conflict_style", "boundaries", "emotional_regulation"],
  attraction: ["physical_attraction_preferences"],
  everyday_life: ["lifestyle", "health_and_wellness", "financial_philosophy", "social_and_family"],
  mind_and_humor: [
    "intellectual_fit",
    "humor_and_temperament",
    // Rebuild Spec Track A — what drives them.
    "temperament_mode",
  ],
  where_you_are_going: ["life_direction", "partnership_vision", "relationship_pacing"],
  how_you_have_grown: ["self_understanding", "resilience_and_growth", "readiness"],
};

const FACET_TO_LENS = (() => {
  const m = new Map<string, LensKey>();
  for (const lens of LENS_ORDER) for (const f of LENS_FACETS[lens]) m.set(f, lens);
  return m;
})();

export function lensForFacet(facetKey: string): LensKey {
  return FACET_TO_LENS.get(facetKey) ?? "how_you_have_grown";
}

/** Guard: the lens map must cover the canonical facet set exactly once. */
export function lensCoverage(): { covered: string[]; missing: string[]; duplicated: string[] } {
  const seen = new Map<string, number>();
  for (const lens of LENS_ORDER)
    for (const f of LENS_FACETS[lens]) seen.set(f, (seen.get(f) ?? 0) + 1);
  return {
    covered: [...seen.keys()],
    missing: FACET_KEYS.filter((k) => !seen.has(k)),
    duplicated: [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k),
  };
}

// ---------------------------------------------------------------------------
// Depth progression
// ---------------------------------------------------------------------------

export type DepthStage = "early" | "developing" | "mature";

export type DepthInputs = {
  /** Distinct pieces of evidence currently held for the facet. */
  evidenceCount: number;
  /** How many times this understanding has already been superseded/refined. */
  historyCount: number;
  confidence: number;
};

/**
 * Depth is earned, not timed. A facet only reaches a richer stage when Athena
 * holds several pieces of evidence AND has revised the understanding across
 * more than one occasion — i.e. she has actually seen the person more than
 * once in this area.
 */
export function depthStage(i: DepthInputs): DepthStage {
  const evidence = Math.max(0, i.evidenceCount);
  const history = Math.max(0, i.historyCount);
  const c = i.confidence ?? 0;
  if (history >= 3 && evidence >= 4 && c >= 0.55) return "mature";
  if (history >= 1 && evidence >= 2) return "developing";
  return "early";
}

/**
 * The synthesis licence handed to the reflection model per facet. It sets a
 * ceiling and an obligation of precision — never a quota.
 */
export const DEPTH_GUIDANCE: Record<DepthStage, string> = {
  early:
    "early — 1–2 sentences. A single careful observation. Do not extrapolate a personality from one exchange.",
  developing:
    "developing — up to 4 sentences. Connect the observations you now hold into a pattern, and name the contexts where it does and doesn't apply.",
  mature:
    "mature — up to 8 sentences if, and only if, the evidence carries them. Synthesise across time: what has held, what has shifted, what is context-dependent, and where an internal tension sits unresolved.",
};

export function depthLicence(stage: DepthStage): string {
  return DEPTH_GUIDANCE[stage];
}

/** Member-facing depth is qualitative prose only — never a level or a score. */
export function memberFacingDepth(stage: DepthStage): string {
  return stage === "mature"
    ? "understood across many conversations"
    : stage === "developing"
      ? "taking shape"
      : "early understanding";
}

// ---------------------------------------------------------------------------
// "What I'm still learning"
// ---------------------------------------------------------------------------

export type StillLearningItem = { key: string; label: string; why: "thin" | "unclear" | "unknown" };

type StillLearningRow = {
  facet_key: string;
  understanding?: string | null;
  confidence?: number | null;
  needs_clarification?: boolean | null;
};

/**
 * Epistemic honesty, not a checklist. Returns at most three areas, ordered by
 * how load-bearing the gap is. No counts, no completeness, no obligation.
 */
export function stillLearning(rows: StillLearningRow[], limit = 3): StillLearningItem[] {
  const byKey = new Map(rows.map((r) => [r.facet_key, r]));
  const items: StillLearningItem[] = [];

  for (const r of rows) {
    if (r.needs_clarification)
      items.push({ key: r.facet_key, label: labelFor(r.facet_key), why: "unclear" });
  }
  for (const r of rows) {
    const text = (r.understanding ?? "").trim();
    if (!r.needs_clarification && text.length > 0 && (r.confidence ?? 0) < 0.3)
      items.push({ key: r.facet_key, label: labelFor(r.facet_key), why: "thin" });
  }
  for (const k of FACET_KEYS) {
    const r = byKey.get(k);
    if (!r || (r.understanding ?? "").trim().length === 0)
      items.push({ key: k, label: labelFor(k), why: "unknown" });
  }

  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true))).slice(0, limit);
}

function labelFor(key: string): string {
  return FACET_LABELS[key as FacetKey] ?? key;
}

/** Athena's own words for the gap. Never a task, never a meter. */
export function stillLearningCopy(items: StillLearningItem[]): string | null {
  if (items.length === 0) return null;
  const names = items.map((i) => i.label.toLowerCase());
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `There are still things I don't understand clearly yet — ${list}. We can get to them whenever you feel like it, or not at all.`;
}

// ---------------------------------------------------------------------------
// Evolution since the member last read their profile
// ---------------------------------------------------------------------------

/** Subtle, binary, and silent when unknown. No counts, no badges, no streaks. */
export function hasEvolvedSince(
  refinedAt: string | null | undefined,
  reviewedAt: string | null | undefined,
): boolean {
  if (!refinedAt || !reviewedAt) return false;
  const r = Date.parse(refinedAt);
  const v = Date.parse(reviewedAt);
  if (!Number.isFinite(r) || !Number.isFinite(v)) return false;
  return r > v;
}

// ---------------------------------------------------------------------------
// Evidence accumulation
// ---------------------------------------------------------------------------

/**
 * Evidence used to be replaced wholesale on every reflection pass, so a facet
 * never held more than one conversation's worth of grounding and could never
 * mature. Evidence now accumulates: newest first, de-duplicated, and capped so
 * the stored trail stays proportionate (data minimisation still applies).
 */
export const MAX_EVIDENCE = 10;

export function mergeEvidence(prior: unknown, incoming: string[], cap = MAX_EVIDENCE): string[] {
  const priorList = Array.isArray(prior) ? prior.filter((x): x is string => typeof x === "string") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of [...incoming, ...priorList]) {
    const t = q.trim();
    if (!t) continue;
    const norm = t.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}
