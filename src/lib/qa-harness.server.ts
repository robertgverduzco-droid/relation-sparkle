// Founder-only synthetic matchmaking QA — execution.
//
// Exercises the REAL matchmaking contract against scripted fictional personas:
//   * candidate discovery / mutual eligibility (tri-state)
//   * structured hard constraints (compatible / incompatible / unknown)
//   * the presentation decision (only fully-resolved compatible pairs present)
//   * the three-open-introduction cap
//   * optionally, Athena's own pair reasoning on a representative matrix
//
// Isolation is absolute. Nothing here reads a real member. Seeding writes only
// to accounts already marked `profiles.is_synthetic`, and every seeded account
// is marked `learning_opt_out` so no outcome from this harness can ever reach
// continuous learning or real-member matchmaking.

import {
  MAX_ACTIVE_INTRODUCTIONS,
  ageFromDob,
  capPermitsNewIntroduction,
  countActiveIntroductions,
  mutualEligibilityState,
  structuredParty,
  type PrefsRow,
  type ProfileRow,
} from "./introductions.server";
import { combineTri } from "./match-semantics";
import { evaluateStructuredConstraints } from "./structured-profile";
import {
  QA_PERSONAS,
  QA_SCENARIOS,
  personaByKey,
  type QaPersona,
  type QaScenario,
} from "./qa-personas";
import {
  reasoningMeetsExpectation,
  summarize,
  type QaCapResult,
  type QaPairResult,
  type QaReport,
} from "./qa-harness";

/** Deterministic, stable pseudo-id per persona. Never a real account id. */
export function personaId(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-0000${hex}`;
}

function birthDateFor(age: number | null): string | null {
  if (age == null) return null;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - age, 0, 15)).toISOString().slice(0, 10);
}

export function toProfileRow(p: QaPersona): ProfileRow {
  return {
    id: personaId(p.key),
    display_name: p.name,
    birth_date: birthDateFor(p.age),
    gender: p.gender,
    city: p.city,
    region: p.region,
    country: p.country,
    location_lat: p.lat,
    location_lng: p.lng,
    is_paused: false,
    height_cm: p.heightCm,
    ethnicities: [],
    ethnicity_self_describe: null,
    religions: p.religions,
    religion_self_describe: null,
    smoking: p.smoking,
    drinking: p.drinking,
    hobbies: p.hobbies,
    hobbies_note: null,
  };
}

export function toPrefsRow(p: QaPersona): PrefsRow {
  return {
    user_id: personaId(p.key),
    seeking_genders: p.seeking,
    age_min: p.ageMin,
    age_max: p.ageMax,
    max_distance_km: p.maxDistanceKm,
    relationship_intent: p.intent,
    wants_children: p.wantsChildren,
    ethnicity_openness: "open",
    preferred_ethnicities: [],
    religion_openness: p.religionOpenness,
    preferred_religions: p.preferredReligions,
    height_min_cm: p.heightMinCm,
    height_max_cm: p.heightMaxCm,
    height_strength: p.heightStrength,
    additional_notes: null,
    age_strength: "preference",
    children_strength: p.childrenStrength,
    smoking_openness: "open",
    preferred_smoking: [],
    drinking_openness: "open",
    preferred_drinking: [],
  } as PrefsRow;
}

export type QaGateEvaluation = {
  gate: QaPairResult["actualGate"];
  blockers: string[];
  unknowns: string[];
  softSignals: string[];
};

/**
 * The deterministic half of the decision, run through the same functions the
 * live engine uses — never a reimplementation of them.
 */
export function evaluateGate(a: QaPersona, b: QaPersona): QaGateEvaluation {
  const aBundle = { profile: toProfileRow(a), prefs: toPrefsRow(a), ageA: ageFromDob(birthDateFor(a.age)) };
  const bBundle = { profile: toProfileRow(b), prefs: toPrefsRow(b), ageA: ageFromDob(birthDateFor(b.age)) };

  const eligibility = mutualEligibilityState(aBundle, bBundle);
  const structured = evaluateStructuredConstraints(
    structuredParty(aBundle.profile, aBundle.prefs),
    structuredParty(bBundle.profile, bBundle.prefs),
  );

  const blockers: string[] = [];
  const unknowns: string[] = [];
  if (eligibility === "incompatible") {
    blockers.push("Mutual eligibility (age range, who they are seeking, distance, or relationship direction) is not satisfied.");
  } else if (eligibility === "unknown") {
    unknowns.push("Mutual eligibility cannot be settled — something stated as a requirement has no counterpart information.");
  }
  for (const o of structured.outcomes) {
    if (o.verdict === "incompatible") blockers.push(`${o.field}: ${o.note}`);
    if (o.verdict === "unknown") unknowns.push(`${o.field}: ${o.note}`);
  }

  const verdict = combineTri([eligibility, structured.verdict]);
  const gate = verdict === "compatible" ? "present" : verdict === "unknown" ? "hold_unknown" : "blocked";
  return { gate, blockers, unknowns, softSignals: structured.softSignals };
}

// ---------------------------------------------------------------------------
// Three-open-introduction cap
// ---------------------------------------------------------------------------

export function runCapChecks(): QaCapResult[] {
  const pairs = ["p1", "p2", "p3", "p4"];
  const check = (
    name: string,
    responses: Array<{ pair_id: string; response: string | null }>,
    presented: string[],
    expectedActive: number,
    expectedAllows: boolean,
  ): QaCapResult => {
    const active = countActiveIntroductions(presented, responses);
    const allows = capPermitsNewIntroduction(active);
    const actual = `${active} open, ${allows ? "a new introduction is allowed" : "no new introduction"}`;
    const expected = `${expectedActive} open, ${expectedAllows ? "a new introduction is allowed" : "no new introduction"}`;
    return { name, expected, actual, pass: actual === expected };
  };

  return [
    check("No introductions yet", [], [], 0, true),
    check(
      "Two pending, one declined",
      [
        { pair_id: "p1", response: "pending" },
        { pair_id: "p2", response: "pending" },
        { pair_id: "p3", response: "declined" },
      ],
      pairs.slice(0, 3),
      2,
      true,
    ),
    check(
      "Three open (pending, deferred, accepted)",
      [
        { pair_id: "p1", response: "pending" },
        { pair_id: "p2", response: "deferred" },
        { pair_id: "p3", response: "accepted" },
      ],
      pairs.slice(0, 3),
      3,
      false,
    ),
    check(
      "Three presented, all declined",
      [
        { pair_id: "p1", response: "declined" },
        { pair_id: "p2", response: "declined" },
        { pair_id: "p3", response: "declined" },
      ],
      pairs.slice(0, 3),
      0,
      true,
    ),
    check(
      "Presented with no response row yet counts as open",
      [],
      pairs.slice(0, 3),
      3,
      false,
    ),
    check(
      "A fourth open introduction can never be reached",
      [
        { pair_id: "p1", response: "pending" },
        { pair_id: "p2", response: "pending" },
        { pair_id: "p3", response: "pending" },
        { pair_id: "p4", response: "pending" },
      ],
      pairs,
      4,
      false,
    ),
  ];
}

// ---------------------------------------------------------------------------
// Full run
// ---------------------------------------------------------------------------

export type QaRunOptions = {
  /** "none" | "representative" (one pair per scenario family) | "all". */
  aiMatrix?: "none" | "representative" | "all";
  /** Seed the personas onto existing synthetic accounts for browser testing. */
  seed?: boolean;
};

function scenariosForAi(mode: NonNullable<QaRunOptions["aiMatrix"]>): QaScenario[] {
  if (mode === "none") return [];
  if (mode === "all") return QA_SCENARIOS;
  return QA_SCENARIOS.filter((s) => s.aiRepresentative);
}

export async function runQaHarness(opts: QaRunOptions = {}): Promise<QaReport> {
  const aiMode = opts.aiMatrix ?? "representative";
  const aiScenarios = new Set(scenariosForAi(aiMode).map((s) => s.id));

  const pairs: QaPairResult[] = [];
  let aiPairsRun = 0;

  for (const scenario of QA_SCENARIOS) {
    const a = personaByKey(scenario.a);
    const b = personaByKey(scenario.b);
    if (!a || !b) continue;

    const gate = evaluateGate(a, b);
    const result: QaPairResult = {
      scenarioId: scenario.id,
      family: scenario.family,
      pairName: `${a.name} × ${b.name}`,
      intent: scenario.intent,
      expectedGate: scenario.expectedGate,
      actualGate: gate.gate,
      gatePass: gate.gate === scenario.expectedGate,
      blockers: gate.blockers,
      unknowns: gate.unknowns,
      softSignals: gate.softSignals,
      expectedReasoning: scenario.expectedReasoning,
    };

    // Athena only reasons about a pair the gate has not already blocked —
    // exactly as in the live engine, where a blocked pair never reaches her.
    if (aiScenarios.has(scenario.id) && gate.gate !== "blocked") {
      try {
        const { reasonPair } = await import("./introductions.server");
        const object = await reasonPair({
          a: { name: a.name, facets: toFacetRows(a) },
          b: { name: b.name, facets: toFacetRows(b) },
        });
        // A held pair may never be presented no matter what she concludes.
        const introduced = object.status === "introduced" && gate.gate === "present";
        result.reasoning = {
          status: object.status,
          introduced,
          rationale: object.reasoning,
          alignments: object.alignments,
          frictions: object.frictions,
          hardConflicts: object.hard_conflicts,
          pass: reasoningMeetsExpectation(scenario.expectedReasoning, introduced),
        };
        aiPairsRun += 1;
      } catch (err) {
        result.reasoning = {
          status: "error",
          introduced: false,
          rationale: `Reasoning could not be completed: ${(err as Error).message}`,
          alignments: [],
          frictions: [],
          hardConflicts: [],
          pass: false,
        };
      }
    }

    pairs.push(result);
  }

  const seeded = opts.seed ? await seedPersonas() : null;

  return {
    generatedAt: new Date().toISOString(),
    personaCount: QA_PERSONAS.length,
    scenarioCount: QA_SCENARIOS.length,
    aiPairsRun,
    aiSkippedReason:
      aiMode === "representative"
        ? "one representative pair per scenario family was reasoned; the remaining pairs were checked deterministically"
        : aiMode === "none"
          ? "reasoning was not run in this pass"
          : null,
    synthetic: true,
    learningEligible: false,
    pairs,
    capChecks: runCapChecks(),
    seeded,
    summary: summarize(pairs),
  };
}

function toFacetRows(p: QaPersona) {
  return p.facets.map((x) => ({
    facet_key: x.key,
    understanding: x.understanding,
    reasoning: null,
    confidence: x.confidence,
    basis: x.basis,
    evidence: [],
    contradiction_count: x.contradictions ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Seeding (synthetic accounts only)
// ---------------------------------------------------------------------------

/**
 * Write the scripted personas onto existing synthetic accounts so the same
 * scenarios can also be walked in the browser. Refuses to touch any account
 * that is not already `is_synthetic`, and marks every account it touches
 * `learning_opt_out` so nothing it produces can be learned from.
 */
export async function seedPersonas(): Promise<{ accounts: number; note: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any;
  };

  const { data: accounts } = await db
    .from("profiles")
    .select("id")
    .eq("is_synthetic", true)
    .order("created_at", { ascending: true })
    .limit(QA_PERSONAS.length);

  const ids = ((accounts ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) {
    return { accounts: 0, note: "no synthetic accounts exist yet — create a batch first" };
  }

  let seeded = 0;
  for (let i = 0; i < ids.length && i < QA_PERSONAS.length; i += 1) {
    const id = ids[i]!;
    const p = QA_PERSONAS[i]!;

    // Belt and braces: never write to an account that is not synthetic.
    const { data: guard } = await db
      .from("profiles")
      .select("id, is_synthetic")
      .eq("id", id)
      .maybeSingle();
    if (!guard || guard.is_synthetic !== true) continue;

    await db
      .from("profiles")
      .update({
        display_name: p.name,
        birth_date: birthDateFor(p.age),
        gender: p.gender,
        city: p.city,
        region: p.region,
        country: p.country,
        location_lat: p.lat,
        location_lng: p.lng,
        height_cm: p.heightCm,
        religions: p.religions,
        smoking: p.smoking,
        drinking: p.drinking,
        hobbies: p.hobbies,
        is_paused: false,
        is_synthetic: true,
        learning_opt_out: true,
        onboarding_stage: "complete",
      })
      .eq("id", id);

    await db.from("user_preferences").upsert(
      {
        user_id: id,
        seeking_genders: p.seeking,
        age_min: p.ageMin,
        age_max: p.ageMax,
        max_distance_km: p.maxDistanceKm,
        relationship_intent: p.intent,
        wants_children: p.wantsChildren,
        children_strength: p.childrenStrength,
        religion_openness: p.religionOpenness,
        preferred_religions: p.preferredReligions,
        height_min_cm: p.heightMinCm,
        height_max_cm: p.heightMaxCm,
        height_strength: p.heightStrength,
      },
      { onConflict: "user_id" },
    );

    for (const facet of p.facets) {
      await db.from("understanding_facets").upsert(
        {
          user_id: id,
          facet_key: facet.key,
          understanding: facet.understanding,
          confidence: facet.confidence,
          basis: facet.basis,
          contradiction_count: facet.contradictions ?? 0,
          evidence: [],
        },
        { onConflict: "user_id,facet_key" },
      );
    }

    seeded += 1;
  }

  return {
    accounts: seeded,
    note: "synthetic accounts only, every one marked learning-ineligible",
  };
}

export { MAX_ACTIVE_INTRODUCTIONS };
