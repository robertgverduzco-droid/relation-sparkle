// Founder-only synthetic matchmaking QA — report shape and rendering.
//
// Pure: no database, no model, no server-only imports, so the founder surface
// can render a report without dragging the matching engine into the client
// bundle.

import type {
  QaExpectedGate,
  QaExpectedReasoning,
  QaScenarioFamily,
} from "./qa-personas";
import { SCENARIO_FAMILY_LABEL } from "./qa-personas";

export type QaGateOutcome = QaExpectedGate;

export type QaPairResult = {
  scenarioId: string;
  family: QaScenarioFamily;
  pairName: string;
  intent: string;
  expectedGate: QaExpectedGate;
  actualGate: QaGateOutcome;
  gatePass: boolean;
  /** Genuine stated requirements that are known to be violated. */
  blockers: string[];
  /** Genuine stated requirements that cannot yet be evaluated. */
  unknowns: string[];
  /** Soft signals Athena may weigh but which never block. */
  softSignals: string[];
  expectedReasoning: QaExpectedReasoning;
  /** Present only when the AI matrix ran for this pair. */
  reasoning?: {
    status: string;
    introduced: boolean;
    rationale: string;
    alignments: string[];
    frictions: string[];
    hardConflicts: string[];
    pass: boolean;
  };
};

export type QaCapResult = {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
};

export type QaReport = {
  generatedAt: string;
  personaCount: number;
  scenarioCount: number;
  aiPairsRun: number;
  aiSkippedReason: string | null;
  synthetic: true;
  learningEligible: false;
  pairs: QaPairResult[];
  capChecks: QaCapResult[];
  seeded: { accounts: number; note: string } | null;
  summary: { gatePassed: number; gateFailed: number; reasoningPassed: number; reasoningFailed: number };
};

export function summarize(pairs: QaPairResult[]): QaReport["summary"] {
  let gatePassed = 0;
  let gateFailed = 0;
  let reasoningPassed = 0;
  let reasoningFailed = 0;
  for (const p of pairs) {
    if (p.gatePass) gatePassed += 1;
    else gateFailed += 1;
    if (p.reasoning) {
      if (p.reasoning.pass) reasoningPassed += 1;
      else reasoningFailed += 1;
    }
  }
  return { gatePassed, gateFailed, reasoningPassed, reasoningFailed };
}

/** Did Athena's reasoning land where the scenario expected? */
export function reasoningMeetsExpectation(
  expected: QaExpectedReasoning,
  introduced: boolean,
): boolean {
  if (expected === "either") return true;
  return expected === "introduced" ? introduced : !introduced;
}

const GATE_LABEL: Record<QaGateOutcome, string> = {
  present: "may be presented",
  hold_unknown: "held — information unknown",
  blocked: "blocked — hard constraint",
};

/** A founder-readable expected-vs-actual report. Plain text, no jargon. */
export function renderReport(report: QaReport): string {
  const lines: string[] = [];
  lines.push("SYNTHETIC MATCHMAKING QA — EXPECTED VS ACTUAL");
  lines.push(`Generated ${report.generatedAt}`);
  lines.push(
    `${report.personaCount} fictional personas · ${report.scenarioCount} scripted pairs · ${report.aiPairsRun} pairs reasoned by Athena`,
  );
  lines.push("All data below is fictional, synthetic, and excluded from continuous learning.");
  if (report.aiSkippedReason) lines.push(`Reasoning matrix limited: ${report.aiSkippedReason}`);
  if (report.seeded) {
    lines.push(`Seeded onto ${report.seeded.accounts} synthetic accounts — ${report.seeded.note}`);
  }
  lines.push("");
  lines.push(
    `Gate checks: ${report.summary.gatePassed} as expected, ${report.summary.gateFailed} not as expected.`,
  );
  if (report.aiPairsRun > 0) {
    lines.push(
      `Reasoning checks: ${report.summary.reasoningPassed} as expected, ${report.summary.reasoningFailed} not as expected.`,
    );
  }

  let family: QaScenarioFamily | null = null;
  for (const p of report.pairs) {
    if (p.family !== family) {
      family = p.family;
      lines.push("");
      lines.push(`── ${SCENARIO_FAMILY_LABEL[family]} ──`);
    }
    lines.push("");
    lines.push(`${p.scenarioId}  ${p.pairName}`);
    lines.push(`  Testing:   ${p.intent}`);
    lines.push(`  Expected:  ${GATE_LABEL[p.expectedGate]}`);
    lines.push(`  Actual:    ${GATE_LABEL[p.actualGate]}  ${p.gatePass ? "✓" : "✗ MISMATCH"}`);
    lines.push(`  Blockers:  ${p.blockers.length ? p.blockers.join(" | ") : "none"}`);
    lines.push(`  Unknowns:  ${p.unknowns.length ? p.unknowns.join(" | ") : "none"}`);
    if (p.softSignals.length) lines.push(`  Nuance:    ${p.softSignals.join(" | ")}`);
    if (p.reasoning) {
      lines.push(
        `  Athena:    ${p.reasoning.introduced ? "would introduce" : `would not introduce (${p.reasoning.status})`}  ${p.reasoning.pass ? "✓" : "✗ MISMATCH"}`,
      );
      lines.push(`  Rationale: ${p.reasoning.rationale}`);
      if (p.reasoning.frictions.length) lines.push(`  Frictions: ${p.reasoning.frictions.join(" | ")}`);
      if (p.reasoning.hardConflicts.length)
        lines.push(`  Conflicts: ${p.reasoning.hardConflicts.join(" | ")}`);
    } else {
      lines.push("  Athena:    not reasoned in this run");
    }
  }

  lines.push("");
  lines.push("── Three-open-introduction cap ──");
  for (const c of report.capChecks) {
    lines.push(`  ${c.name}: expected ${c.expected}, got ${c.actual}  ${c.pass ? "✓" : "✗ MISMATCH"}`);
  }
  return lines.join("\n");
}
