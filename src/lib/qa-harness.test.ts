// Tests for the founder-only synthetic matchmaking QA harness itself.
//
// The harness is only useful if it (a) exercises the real engine rather than a
// copy of it, (b) is structurally unable to touch real members or continuous
// learning, and (c) reports expected-vs-actual honestly.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  QA_PERSONAS,
  QA_SCENARIOS,
  SCENARIO_FAMILY_LABEL,
  personaByKey,
  type QaScenarioFamily,
} from "./qa-personas";
import { evaluateGate, runCapChecks, personaId, toPrefsRow } from "./qa-harness.server";
import { renderReport, reasoningMeetsExpectation, summarize, type QaReport } from "./qa-harness";
import { MAX_ACTIVE_INTRODUCTIONS } from "./introductions.server";

const harnessSource = readFileSync("src/lib/qa-harness.server.ts", "utf8");
const fnSource = readFileSync("src/lib/qa-harness.functions.ts", "utf8");
const uiSource = readFileSync("src/routes/_authenticated/qa-matchmaking.tsx", "utf8");

describe("persona catalogue", () => {
  it("covers enough personas for a deterministic sweep", () => {
    expect(QA_PERSONAS.length).toBeGreaterThanOrEqual(20);
    expect(QA_PERSONAS.length).toBeLessThanOrEqual(40);
  });

  it("gives every persona a unique key and a stable synthetic id", () => {
    const keys = new Set(QA_PERSONAS.map((p) => p.key));
    expect(keys.size).toBe(QA_PERSONAS.length);
    const ids = new Set(QA_PERSONAS.map((p) => personaId(p.key)));
    expect(ids.size).toBe(QA_PERSONAS.length);
    expect(personaId("sf_a1")).toBe(personaId("sf_a1"));
  });

  it("gives every persona enough understanding to be considered at all", () => {
    for (const p of QA_PERSONAS) {
      expect(p.facets.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("includes every required scenario family", () => {
    const families: QaScenarioFamily[] = [
      "strong_fit",
      "hard_constraint_conflict",
      "similar_poor_fit",
      "different_strong_fit",
      "communication_mismatch",
      "critical_unknown",
      "stated_vs_observed",
    ];
    for (const f of families) {
      expect(QA_SCENARIOS.some((s) => s.family === f)).toBe(true);
      expect(SCENARIO_FAMILY_LABEL[f]).toBeTruthy();
      // Each family has a representative pair for the smaller AI matrix.
      expect(QA_SCENARIOS.some((s) => s.family === f && s.aiRepresentative)).toBe(true);
    }
  });

  it("references only personas that exist", () => {
    for (const s of QA_SCENARIOS) {
      expect(personaByKey(s.a)).toBeTruthy();
      expect(personaByKey(s.b)).toBeTruthy();
    }
  });
});

describe("deterministic gate", () => {
  const gateFor = (id: string) => {
    const s = QA_SCENARIOS.find((x) => x.id === id)!;
    return evaluateGate(personaByKey(s.a)!, personaByKey(s.b)!);
  };

  it("matches the scripted expectation for every scenario", () => {
    const mismatches = QA_SCENARIOS.filter((s) => {
      const g = evaluateGate(personaByKey(s.a)!, personaByKey(s.b)!);
      return g.gate !== s.expectedGate;
    }).map((s) => s.id);
    expect(mismatches).toEqual([]);
  });

  it("blocks a genuine children conflict with a named blocker", () => {
    const g = gateFor("HC-1");
    expect(g.gate).toBe("blocked");
    expect(g.blockers.join(" ")).toMatch(/children/i);
  });

  it("blocks a stated religious requirement that is known to be unmet", () => {
    const g = gateFor("HC-3");
    expect(g.gate).toBe("blocked");
    expect(g.blockers.join(" ")).toMatch(/religion/i);
  });

  it("holds — never rejects — when a gender is simply unstated", () => {
    const g = gateFor("CU-1");
    expect(g.gate).toBe("hold_unknown");
    expect(g.blockers).toEqual([]);
    expect(g.unknowns.length).toBeGreaterThan(0);
  });

  it("holds when a genuine height requirement cannot be evaluated", () => {
    const g = gateFor("CU-2");
    expect(g.gate).toBe("hold_unknown");
    expect(g.blockers).toEqual([]);
    expect(g.unknowns.join(" ")).toMatch(/height/i);
  });

  it("lets relational-fit scenarios reach reasoning rather than filtering them out", () => {
    for (const id of ["SP-1", "SP-2", "DF-1", "DF-2", "CM-1", "CM-2", "SV-1", "SV-2"]) {
      expect(gateFor(id).gate).toBe("present");
    }
  });
});

describe("three-open-introduction cap", () => {
  it("passes every cap scenario", () => {
    const checks = runCapChecks();
    expect(checks.length).toBeGreaterThanOrEqual(5);
    expect(checks.filter((c) => !c.pass)).toEqual([]);
  });

  it("is measured against the real cap constant", () => {
    expect(MAX_ACTIVE_INTRODUCTIONS).toBe(3);
    expect(harnessSource).toMatch(/countActiveIntroductions/);
    expect(harnessSource).toMatch(/capPermitsNewIntroduction/);
  });
});

describe("uses the real engine, not a copy of it", () => {
  it("imports discovery, eligibility and constraint logic from the live modules", () => {
    expect(harnessSource).toMatch(/from "\.\/introductions\.server"/);
    expect(harnessSource).toMatch(/mutualEligibilityState/);
    expect(harnessSource).toMatch(/structuredParty/);
    expect(harnessSource).toMatch(/evaluateStructuredConstraints/);
    expect(harnessSource).toMatch(/reasonPair/);
  });

  it("never reimplements the tri-state combination", () => {
    expect(harnessSource).toMatch(/combineTri/);
  });

  it("carries preference strength through to the constraint evaluation", () => {
    const p = personaByKey("cu_a2")!;
    const prefs = toPrefsRow(p);
    expect(prefs.height_strength).toBe("requirement");
    expect(prefs.height_min_cm).toBe(178);
  });
});

describe("isolation from real members and from learning", () => {
  it("only ever seeds accounts that are already synthetic", () => {
    expect(harnessSource).toMatch(/\.eq\("is_synthetic", true\)/);
    expect(harnessSource).toMatch(/guard\.is_synthetic !== true/);
  });

  it("marks every seeded account learning-ineligible", () => {
    expect(harnessSource).toMatch(/learning_opt_out: true/);
  });

  it("never writes to the learning ledger or prediction tables", () => {
    expect(harnessSource).not.toMatch(/athena_predictions|recordPrediction|emitPrediction/);
    expect(harnessSource).not.toMatch(/athena_hypotheses|athena_outcome_signals/);
  });

  it("never runs live matchmaking or presents an introduction", () => {
    expect(harnessSource).not.toMatch(/runMatchmakingForUser|pair_reasoning|introduction_responses/);
  });

  it("marks the report itself synthetic and learning-ineligible", () => {
    expect(harnessSource).toMatch(/synthetic: true/);
    expect(harnessSource).toMatch(/learningEligible: false/);
  });

  it("is founder-only, with authority re-derived server-side", () => {
    expect(fnSource).toMatch(/requireSupabaseAuth/);
    expect(fnSource).toMatch(/assertFounder\(context\.userId\)/);
    expect(fnSource).not.toMatch(/founderId:\s*data\./);
    expect(uiSource).toMatch(/getQaHarnessAccess/);
    expect(uiSource).toMatch(/Not found\./);
  });
});

describe("founder-readable report", () => {
  const report: QaReport = {
    generatedAt: "2026-08-30T00:00:00.000Z",
    personaCount: QA_PERSONAS.length,
    scenarioCount: QA_SCENARIOS.length,
    aiPairsRun: 1,
    aiSkippedReason: "representative sample only",
    synthetic: true,
    learningEligible: false,
    pairs: [
      {
        scenarioId: "SF-1",
        family: "strong_fit",
        pairName: "Marguerite Vale × Idris Hallow",
        intent: "Two well-understood people.",
        expectedGate: "present",
        actualGate: "present",
        gatePass: true,
        blockers: [],
        unknowns: [],
        softSignals: [],
        expectedReasoning: "introduced",
        reasoning: {
          status: "introduced",
          introduced: true,
          rationale: "They repair the same way.",
          alignments: ["honesty"],
          frictions: [],
          hardConflicts: [],
          pass: true,
        },
      },
      {
        scenarioId: "HC-1",
        family: "hard_constraint_conflict",
        pairName: "Ottoline Beck × Silas Renn",
        intent: "Opposite non-negotiables on children.",
        expectedGate: "blocked",
        actualGate: "blocked",
        gatePass: true,
        blockers: ["children: a genuine stated position on children is not shared"],
        unknowns: [],
        softSignals: [],
        expectedReasoning: "not_introduced",
      },
    ],
    capChecks: runCapChecks(),
    seeded: null,
    summary: { gatePassed: 2, gateFailed: 0, reasoningPassed: 1, reasoningFailed: 0 },
  };

  it("names each pair with expected, actual, blockers, unknowns and rationale", () => {
    const text = renderReport(report);
    expect(text).toContain("Marguerite Vale × Idris Hallow");
    expect(text).toContain("Expected:");
    expect(text).toContain("Actual:");
    expect(text).toContain("Blockers:");
    expect(text).toContain("Unknowns:");
    expect(text).toContain("They repair the same way.");
    expect(text).toContain("Three-open-introduction cap");
    expect(text).toContain("excluded from continuous learning");
  });

  it("flags a mismatch rather than hiding it", () => {
    const failing: QaReport = {
      ...report,
      pairs: [{ ...report.pairs[0]!, actualGate: "blocked", gatePass: false }],
    };
    expect(renderReport(failing)).toContain("MISMATCH");
    expect(summarize(failing.pairs).gateFailed).toBe(1);
  });

  it("scores reasoning expectations honestly", () => {
    expect(reasoningMeetsExpectation("introduced", true)).toBe(true);
    expect(reasoningMeetsExpectation("introduced", false)).toBe(false);
    expect(reasoningMeetsExpectation("not_introduced", true)).toBe(false);
    expect(reasoningMeetsExpectation("either", true)).toBe(true);
    expect(reasoningMeetsExpectation("either", false)).toBe(true);
  });
});
