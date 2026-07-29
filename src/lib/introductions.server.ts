// Server-only helpers for the introduction (matching) engine.
// Cross-user reads use the service-role admin client to bypass RLS while
// keeping user privacy: only Athena's server code ever sees other users'
// facets; nothing is returned to the caller other than the presentation
// Athena chooses for them.
import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Understanding thresholds. Athena needs enough understanding of each person
// before she is willing to reason about them at all. She does NOT gate
// introductions on any minimum "score" — a low-confidence pair may still be
// introduced when her reasoning is strong. Confidence expresses how well
// she understands them, not whether they are compatible.
export const EXPLORATORY_MIN_AVG = 0.35;
export const MIN_FACETS_EACH = 4;

// Active-introduction cap: a person never has more than this many open
// introductions at once. New introductions are only considered after prior
// ones have feedback (declined, deferred, or moved into a connection).
export const MAX_ACTIVE_INTRODUCTIONS = 3;


export type FacetRow = {
  facet_key: string;
  understanding: string | null;
  reasoning: string | null;
  confidence: number;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  gender: string | null;
  city: string | null;
  is_paused: boolean | null;
};

export type PrefsRow = {
  user_id: string;
  seeking_genders: string[] | null;
  age_min: number | null;
  age_max: number | null;
  relationship_intent: string | null;
  wants_children: string | null;
};

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a;
}

export function mutuallyEligible(
  a: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
  b: { profile: ProfileRow; prefs: PrefsRow | null; ageA: number | null },
): boolean {
  if (a.profile.is_paused || b.profile.is_paused) return false;

  const checkOne = (
    self: { profile: ProfileRow; prefs: PrefsRow | null },
    other: { profile: ProfileRow; ageA: number | null },
  ) => {
    const p = self.prefs;
    if (!p) return true;
    if (p.seeking_genders && p.seeking_genders.length > 0 && other.profile.gender) {
      if (!p.seeking_genders.includes(other.profile.gender)) return false;
    }
    if (other.ageA != null) {
      if (p.age_min != null && other.ageA < p.age_min) return false;
      if (p.age_max != null && other.ageA > p.age_max) return false;
    }
    return true;
  };

  if (!checkOne(a, b)) return false;
  if (!checkOne(b, a)) return false;

  const ia = a.prefs?.relationship_intent ?? null;
  const ib = b.prefs?.relationship_intent ?? null;
  if (ia && ib && ia !== ib) return false;

  return true;
}

export function facetAverage(rows: FacetRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + Number(r.confidence ?? 0), 0) / rows.length;
}

export const reasoningSchema = z.object({
  status: z.enum(["considering", "withheld", "introduced"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alignments: z.array(z.string()).max(6),
  complementary: z.array(z.string()).max(6),
  frictions: z.array(z.string()).max(6),
  hard_conflicts: z.array(z.string()).max(4),
  presentation_for_a: z.string(),
  presentation_for_b: z.string(),
});

export function summarizeFacets(rows: FacetRow[]): string {
  return rows
    .filter((r) => r.understanding)
    .map(
      (r) =>
        `- ${r.facet_key} [confidence ${Number(r.confidence).toFixed(2)}]: ${r.understanding}`,
    )
    .join("\n");
}

export async function reasonPair(args: {
  a: { name: string; facets: FacetRow[] };
  b: { name: string; facets: FacetRow[] };
}) {
  const { createLovableGateway } = await import("./ai-gateway.server");
  const gateway = createLovableGateway();
  const { object } = await generateObject({
    model: gateway("openai/gpt-5.5"),
    schema: reasoningSchema,
    providerOptions: { lovable: { reasoningEffort: "none" } },
    prompt: `You are Athena. Consider whether these two people might be worth introducing.

Reason across values, communication, emotional regulation, expectations, attachment, conflict/repair, boundaries, affection, lifestyle, social/family, purpose, intellectual fit, humor, finance, health, pacing, attraction preferences, resilience, and complementary strengths. Similarity alone is not compatibility.

- status "withheld" if there is a hard conflict (essential boundary or incompatible core direction).
- status "introduced" only when you are genuinely willing to reflect this to both of them.
- status "considering" otherwise.
- confidence 0–1 based on how well you understand each of them.
- reasoning: 2–4 sentences of your private thinking.
- presentation_for_a and presentation_for_b: written directly to that person in your voice; 3–5 sentences each; do NOT reveal the other person's private confidences or evidence quotes; do not use a percentage.

PERSON A — ${args.a.name}
${summarizeFacets(args.a.facets)}

PERSON B — ${args.b.name}
${summarizeFacets(args.b.facets)}`,
  });
  return object;
}
