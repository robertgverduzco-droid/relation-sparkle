import { describe, it, expect } from "vitest";
import {
  EMPTY_PREFERENCES,
  EMPTY_SELF,
  PREFER_NOT_TO_SAY,
  evaluateStructuredConstraints,
  feetInchesToCm,
  sanitizeAdditionalNotes,
  structuredContextBlock,
  type MatchPreferences,
  type SelfDescription,
} from "./structured-profile";
import { classifyBoundary } from "./boundaries";

const party = (id: string, self: Partial<SelfDescription>, prefs: Partial<MatchPreferences> = {}) => ({
  id,
  self: { ...EMPTY_SELF, ...self },
  prefs: { ...EMPTY_PREFERENCES, ...prefs },
});

const FIVE_FIVE = feetInchesToCm(5, 5);
const FIVE_ONE = feetInchesToCm(5, 1);
const SIX_TWO = feetInchesToCm(6, 2);

describe("structured self-description", () => {
  it("carries complete structured information into Athena's context", () => {
    const block = structuredContextBlock(
      { ...EMPTY_SELF, height_cm: SIX_TWO, ethnicities: ["hispanic_latino"], religions: ["christian"] },
      { ...EMPTY_PREFERENCES, additional_notes: "I'd love someone who travels." },
    );
    expect(block).toContain("6'2\"");
    expect(block).toContain("Hispanic / Latino");
    expect(block).toContain("Christian");
    expect(block).toContain("travels");
    expect(block).toContain("Do not ask them to repeat any of this");
  });

  it("respects prefer not to say and never asks again", () => {
    const block = structuredContextBlock(
      { ...EMPTY_SELF, ethnicities: [PREFER_NOT_TO_SAY], religions: [PREFER_NOT_TO_SAY] },
      EMPTY_PREFERENCES,
    );
    expect(block).toContain("chose not to state a cultural background");
    expect(block).toContain("chose not to state a religion");
    expect(block).toContain("never infer it");
  });

  it("supports multi-ethnic and self-described identity", () => {
    const block = structuredContextBlock(
      {
        ...EMPTY_SELF,
        ethnicities: ["black_caribbean", "white_european"],
        ethnicity_self_describe: "Afro-Caribbean and Irish, raised in London",
        religions: [],
        religion_self_describe: "Quaker-raised, privately contemplative",
      },
      EMPTY_PREFERENCES,
    );
    expect(block).toContain("Black / Caribbean, White / European, Afro-Caribbean and Irish");
    expect(block).toContain("Quaker-raised");
  });

  it("says nothing when nothing was supplied", () => {
    expect(structuredContextBlock(EMPTY_SELF, EMPTY_PREFERENCES)).toBe("");
  });
});

describe("tri-state constraint evaluation", () => {
  it("no ethnicity preference never constrains anyone", () => {
    const a = party("a", {}, { ethnicity_openness: "open" });
    const b = party("b", { ethnicities: ["asian_south"] });
    const r = evaluateStructuredConstraints(a, b);
    expect(r.verdict).toBe("compatible");
    expect(r.unresolved).toHaveLength(0);
  });

  it("explicit ethnicity preference is a soft signal, never exclusion", () => {
    const a = party("a", {}, { ethnicity_openness: "preference", preferred_ethnicities: ["asian_east"] });
    const b = party("b", { ethnicities: ["white_european"] });
    const r = evaluateStructuredConstraints(a, b);
    expect(r.verdict).toBe("compatible");
    expect(r.softSignals.join(" ")).toContain("ethnicity preference is not matched");
  });

  it("a genuine religious relationship requirement can be met or unmet", () => {
    const holder = { religion_openness: "requirement" as const, preferred_religions: ["muslim"] };
    expect(evaluateStructuredConstraints(party("a", {}, holder), party("b", { religions: ["muslim"] })).verdict).toBe("compatible");
    expect(evaluateStructuredConstraints(party("a", {}, holder), party("b", { religions: ["atheist"] })).verdict).toBe("incompatible");
  });

  it("a self-described religion cannot be refuted by a fixed category", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { religion_openness: "requirement", preferred_religions: ["christian"] }),
      party("b", { religion_self_describe: "raised Orthodox, still practising quietly" }),
    );
    expect(r.verdict).toBe("unknown");
    expect(r.unresolved[0]).toEqual({ subjectId: "b", field: "religion" });
  });

  it("height constraint with a known compatible height", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { height_max_cm: FIVE_FIVE, height_strength: "requirement" }),
      party("b", { height_cm: FIVE_ONE }),
    );
    expect(r.verdict).toBe("compatible");
  });

  it("height constraint with a known incompatible height", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { height_max_cm: FIVE_FIVE, height_strength: "requirement" }),
      party("b", { height_cm: SIX_TWO }),
    );
    expect(r.verdict).toBe("incompatible");
  });

  it("height constraint with a missing counterpart height is unknown, never incompatible", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { height_max_cm: FIVE_FIVE, height_strength: "requirement" }),
      party("b", { height_cm: null }),
    );
    expect(r.verdict).toBe("unknown");
    expect(r.outcomes.some((o) => o.verdict === "incompatible")).toBe(false);
    expect(r.unresolved).toEqual([{ subjectId: "b", field: "height" }]);
  });

  it("missing data under a soft preference is neither exclusion nor assumption", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { height_max_cm: FIVE_FIVE, height_strength: "preference" }),
      party("b", { height_cm: null }),
    );
    expect(r.verdict).toBe("compatible");
    expect(r.unresolved).toHaveLength(0);
    expect(r.softSignals.join(" ")).toContain("unknown, not as a mismatch");
  });

  it("prefer-not-to-say is unknown against a genuine requirement, not a mismatch", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { ethnicity_openness: "requirement", preferred_ethnicities: ["indigenous"] }),
      party("b", { ethnicities: [PREFER_NOT_TO_SAY] }),
    );
    expect(r.verdict).toBe("unknown");
  });

  it("discuss-with-Athena records no filter at all", () => {
    const r = evaluateStructuredConstraints(
      party("a", {}, { ethnicity_openness: "discuss_with_athena", preferred_ethnicities: ["asian_east"] }),
      party("b", { ethnicities: [] }),
    );
    expect(r.verdict).toBe("compatible");
    expect(r.unresolved).toHaveLength(0);
  });

  it("produces no score of any kind", () => {
    const r = evaluateStructuredConstraints(party("a", { height_cm: SIX_TWO }), party("b", { height_cm: FIVE_ONE }));
    expect(JSON.stringify(r)).not.toMatch(/score|rating|rank/i);
  });
});

describe("free-text additional preferences", () => {
  it("keeps legitimate preferences", () => {
    const r = sanitizeAdditionalNotes("I'd like someone who wants children. Kindness matters most.", classifyBoundary);
    expect(r.text).toContain("wants children");
    expect(r.removed).toHaveLength(0);
  });

  it("removes prohibited content without erasing the legitimate preference", () => {
    const r = sanitizeAdditionalNotes(
      "I want someone spiritual. Send nudes. Family matters a lot to me.",
      classifyBoundary,
    );
    expect(r.text).toContain("spiritual");
    expect(r.text).toContain("Family matters");
    expect(r.text).not.toMatch(/nudes/i);
    expect(r.flaggedCategories.length).toBeGreaterThan(0);
  });

  it("treats an empty field as absent", () => {
    expect(sanitizeAdditionalNotes("   ", classifyBoundary).text).toBeNull();
  });
});
