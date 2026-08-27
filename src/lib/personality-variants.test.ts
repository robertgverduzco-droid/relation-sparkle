import { describe, expect, it } from "vitest";
import { isPersonalityVariant, PERSONALITY_VARIANTS } from "./personality-variants";

describe("personality variants", () => {
  it("standard is the real Athena with no tone override", () => {
    expect(PERSONALITY_VARIANTS.standard.toneGuidance).toBe("");
  });

  it("warm_experimental adds tone guidance that does not loosen safety", () => {
    const g = PERSONALITY_VARIANTS.warm_experimental.toneGuidance;
    expect(g.length).toBeGreaterThan(0);
    expect(g).toMatch(/does not loosen anything about safety/i);
    expect(g).toMatch(/no-scoring rule/i);
  });

  it("validator accepts only known variants", () => {
    expect(isPersonalityVariant("standard")).toBe(true);
    expect(isPersonalityVariant("warm_experimental")).toBe(true);
    expect(isPersonalityVariant("chaotic_evil")).toBe(false);
    expect(isPersonalityVariant(null)).toBe(false);
    expect(isPersonalityVariant(undefined)).toBe(false);
  });
});
