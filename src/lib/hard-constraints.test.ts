// ATHENA V1 — HARD CONSTRAINT / UNKNOWN DATA RESOLUTION.
//
// Binding rule under test: when a member has declared a genuine non-negotiable,
// the counterpart's value for that characteristic must be KNOWN and satisfied
// before the pair can be presented. Missing data is UNKNOWN — never silently
// compatible, never silently incompatible.
import { describe, it, expect } from "vitest";
import {
  EMPTY_PREFERENCES,
  EMPTY_SELF,
  constraintsPermitIntroduction,
  evaluateStructuredConstraints,
  feetInchesToCm,
  type MatchPreferences,
  type SelfDescription,
} from "./structured-profile";

const party = (id: string, self: Partial<SelfDescription>, prefs: Partial<MatchPreferences> = {}) => ({
  id,
  self: { ...EMPTY_SELF, ...self },
  prefs: { ...EMPTY_PREFERENCES, ...prefs },
});

const MAX_5_5 = feetInchesToCm(5, 5);

// Member A: "I will not date someone taller than 5'5"." — a genuine constraint.
const constrainedA = (extra: Partial<MatchPreferences> = {}) =>
  party("a", { height_cm: feetInchesToCm(5, 4) }, { height_max_cm: MAX_5_5, height_strength: "requirement", ...extra });

describe("hard constraint — height", () => {
  it("known compatible value → compatible, may be presented", () => {
    const r = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: feetInchesToCm(5, 3) }));
    expect(r.verdict).toBe("compatible");
    expect(constraintsPermitIntroduction(r)).toBe(true);
  });

  it("known incompatible value → incompatible, never presented", () => {
    const r = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: feetInchesToCm(6, 1) }));
    expect(r.verdict).toBe("incompatible");
    expect(constraintsPermitIntroduction(r)).toBe(false);
  });

  it("missing value → UNKNOWN: candidate retained, introduction withheld, data requested from the right member", () => {
    const r = evaluateStructuredConstraints(constrainedA(), party("b", {}));
    expect(r.verdict).toBe("unknown");
    expect(constraintsPermitIntroduction(r)).toBe(false);
    // The person missing the datum is B — never A, who holds the constraint.
    expect(r.unresolved).toEqual([{ subjectId: "b", field: "height" }]);
  });

  it("member later supplies the missing value → resolves either way", () => {
    const supplied = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: feetInchesToCm(5, 2) }));
    expect(constraintsPermitIntroduction(supplied)).toBe(true);
    const failing = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: feetInchesToCm(5, 11) }));
    expect(failing.verdict).toBe("incompatible");
  });

  it("member declines to provide → stays unresolved forever, never becomes compatible", () => {
    for (let i = 0; i < 3; i++) {
      const r = evaluateStructuredConstraints(constrainedA(), party("b", {}));
      expect(r.verdict).toBe("unknown");
      expect(constraintsPermitIntroduction(r)).toBe(false);
    }
  });

  it("removal of previously supplied information reverts compatible → unknown", () => {
    const before = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: feetInchesToCm(5, 1) }));
    expect(before.verdict).toBe("compatible");
    const after = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: null }));
    expect(after.verdict).toBe("unknown");
    expect(constraintsPermitIntroduction(after)).toBe(false);
  });
});

describe("preference vs strong preference vs hard constraint", () => {
  it("ordinary preference with missing value never blocks and never asks", () => {
    const a = party("a", {}, { height_max_cm: MAX_5_5, height_strength: "preference" });
    const r = evaluateStructuredConstraints(a, party("b", {}));
    expect(r.verdict).toBe("compatible");
    expect(r.unresolved).toHaveLength(0);
    expect(r.softSignals.length).toBeGreaterThan(0); // weighed in reasoning instead
  });

  it("preference with a known non-matching value is nuance, not exclusion", () => {
    const a = party("a", {}, { height_max_cm: MAX_5_5, height_strength: "preference" });
    const r = evaluateStructuredConstraints(a, party("b", { height_cm: feetInchesToCm(6, 3) }));
    expect(r.verdict).toBe("compatible");
    expect(constraintsPermitIntroduction(r)).toBe(true);
  });

  it("only a genuine constraint invokes mandatory missing-data resolution", () => {
    const soft = evaluateStructuredConstraints(
      party("a", {}, { religion_openness: "preference", preferred_religions: ["jewish"] }),
      party("b", {}),
    );
    expect(soft.unresolved).toHaveLength(0);
    const hard = evaluateStructuredConstraints(
      party("a", {}, { religion_openness: "requirement", preferred_religions: ["jewish"] }),
      party("b", {}),
    );
    expect(hard.unresolved).toEqual([{ subjectId: "b", field: "religion" }]);
  });
});

describe("scope — age, children, smoking, religion, ethnicity", () => {
  it("age: unknown birth date under a non-negotiable range is unresolved, not excluded", () => {
    const a = party("a", {}, { age_min: 30, age_max: 40, age_strength: "requirement" });
    expect(evaluateStructuredConstraints(a, party("b", { age: 34 })).verdict).toBe("compatible");
    expect(evaluateStructuredConstraints(a, party("b", { age: 52 })).verdict).toBe("incompatible");
    const unknown = evaluateStructuredConstraints(a, party("b", { age: null }));
    expect(unknown.verdict).toBe("unknown");
    expect(unknown.unresolved).toEqual([{ subjectId: "b", field: "age" }]);
  });

  it("age: an ordinary stated range never demands resolution", () => {
    const a = party("a", {}, { age_min: 30, age_max: 40, age_strength: "preference" });
    expect(evaluateStructuredConstraints(a, party("b", { age: null })).unresolved).toHaveLength(0);
  });

  it("children: a declared non-negotiable requires the counterpart's stated position", () => {
    const a = party("a", {}, { wants_children: "yes", children_strength: "requirement" });
    expect(evaluateStructuredConstraints(a, party("b", { wants_children: "yes" })).verdict).toBe("compatible");
    expect(evaluateStructuredConstraints(a, party("b", { wants_children: "no" })).verdict).toBe("incompatible");
    expect(evaluateStructuredConstraints(a, party("b", {})).verdict).toBe("unknown");
  });

  it("smoking: unstated smoking under a non-negotiable is unresolved", () => {
    const a = party("a", {}, { smoking_openness: "requirement", preferred_smoking: ["no"] });
    expect(evaluateStructuredConstraints(a, party("b", { smoking: "no" })).verdict).toBe("compatible");
    expect(evaluateStructuredConstraints(a, party("b", { smoking: "yes" })).verdict).toBe("incompatible");
    expect(evaluateStructuredConstraints(a, party("b", { smoking: null })).verdict).toBe("unknown");
  });
});

describe("multiple constraints", () => {
  it("one unresolved constraint blocks the introduction even when others are satisfied", () => {
    const a = constrainedA({ religion_openness: "requirement", preferred_religions: ["jewish"] });
    const b = party("b", { height_cm: feetInchesToCm(5, 2) }); // height fine, religion unstated
    const r = evaluateStructuredConstraints(a, b);
    expect(r.outcomes.some((o) => o.field === "height" && o.verdict === "compatible")).toBe(true);
    expect(r.verdict).toBe("unknown");
    expect(constraintsPermitIntroduction(r)).toBe(false);
  });

  it("a clear violation outranks an unresolved one", () => {
    const a = constrainedA({ religion_openness: "requirement", preferred_religions: ["jewish"] });
    const r = evaluateStructuredConstraints(a, party("b", { height_cm: feetInchesToCm(6, 4) }));
    expect(r.verdict).toBe("incompatible");
  });

  it("constraints held by either member gate the pair, in both directions", () => {
    const a = party("a", { height_cm: feetInchesToCm(6, 2) });
    const b = party("b", {}, { height_max_cm: MAX_5_5, height_strength: "requirement" });
    const r = evaluateStructuredConstraints(a, b);
    expect(r.verdict).toBe("incompatible");
    const bUnknown = evaluateStructuredConstraints(party("a", {}), b);
    expect(bUnknown.unresolved).toEqual([{ subjectId: "a", field: "height" }]);
  });
});

describe("privacy and non-inference", () => {
  it("the unresolved record names only the member missing data — never the constraint holder or the reason", () => {
    const r = evaluateStructuredConstraints(constrainedA(), party("b", {}));
    for (const item of r.unresolved) {
      expect(Object.keys(item).sort()).toEqual(["field", "subjectId"]);
      expect(item.subjectId).toBe("b");
    }
  });

  it("a self-described identity a fixed category cannot settle stays unknown, never a rejection", () => {
    const a = party("a", {}, { religion_openness: "requirement", preferred_religions: ["jewish"] });
    const b = party("b", { religion_self_describe: "raised between two traditions" });
    const r = evaluateStructuredConstraints(a, b);
    expect(r.verdict).toBe("unknown");
    expect(r.unresolved).toEqual([{ subjectId: "b", field: "religion" }]);
  });

  it("evaluation emits no score, ranking or desirability value of any kind", () => {
    const r = evaluateStructuredConstraints(constrainedA(), party("b", { height_cm: 160 }));
    const serialized = JSON.stringify(r);
    expect(serialized).not.toMatch(/score|rank|rating|percent/i);
  });
});
