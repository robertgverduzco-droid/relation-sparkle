// Regression coverage for the absolute prohibition on member-facing
// compatibility numbers (audit finding A-03).
//
// These tests pin the *policy layer*: the prohibition text must be present in
// every prompt Athena speaks from, must cover the disguises used in the
// adversarial audit, and must not carry an escape hatch. Model behaviour is
// verified separately at runtime; this is the part that survives future prompt
// and model changes.
import { describe, expect, it } from "vitest";
import { NO_NUMERICAL_REDUCTION, PROMPT_BOUNDARY } from "./security.server";
import { athenaSystemPrompt } from "./athena.server";
import { runtimeDoctrine } from "./athena-doctrine.server";

const FORBIDDEN_FORMS = [
  "compatibility score",
  "percentage",
  "rank",
  "probability",
  "likelihood",
  "out of",
  "chemistry",
  "confidence",
  "relationship potential",
  "estimate",
];

describe("no numerical reduction — policy text", () => {
  it("names every forbidden numeric form from the audit", () => {
    const text = NO_NUMERICAL_REDUCTION.toLowerCase();
    for (const form of FORBIDDEN_FORMS) expect(text).toContain(form);
  });

  it("forbids encoded and disguised substitutes", () => {
    const text = NO_NUMERICAL_REDUCTION.toLowerCase();
    expect(text).toMatch(/encoded|letter grade|colour scale|emoji/);
    expect(text).toMatch(/another name/);
  });

  it("closes the 'promise one later' and 'if you could' escapes", () => {
    const text = NO_NUMERICAL_REDUCTION.toLowerCase();
    expect(text).toMatch(/never promise one later/);
    expect(text).toMatch(/no condition under which one becomes available/);
    expect(text).toMatch(/not the member insisting/);
    expect(text).toMatch(/understand the uncertainty|saying they understand/);
  });

  it("is stated as absolute, with no exception clause", () => {
    expect(NO_NUMERICAL_REDUCTION).toMatch(/absolute, no exception/i);
    expect(NO_NUMERICAL_REDUCTION.toLowerCase()).not.toMatch(
      /you may (give|provide|share) a (score|number|percentage)/,
    );
  });

  it("still allows qualitative explanation and ordinary neutral numbers", () => {
    const text = NO_NUMERICAL_REDUCTION.toLowerCase();
    expect(text).toMatch(/plain language/);
    expect(text).toMatch(/remain perfectly normal/);
  });
});

describe("no numerical reduction — prompt wiring", () => {
  it("is carried by the security boundary prepended to every prompt", () => {
    expect(PROMPT_BOUNDARY).toContain(NO_NUMERICAL_REDUCTION);
  });

  it("is also carried by Athena's own persona prompt (defence in depth)", () => {
    expect(athenaSystemPrompt()).toContain(NO_NUMERICAL_REDUCTION);
  });

  it("reaches every runtime doctrine mode", () => {
    for (const mode of ["conversation", "reflection", "matching"] as const) {
      expect(runtimeDoctrine(mode)).toContain("NUMERICAL REDUCTION PROHIBITION");
    }
  });

  it("keeps confidence qualitative in the epistemic layer", () => {
    expect(runtimeDoctrine("conversation").toLowerCase()).toMatch(
      /never a number, percentage, score, or confidence rating/,
    );
  });
});
