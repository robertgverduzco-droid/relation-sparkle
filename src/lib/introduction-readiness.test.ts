import { describe, it, expect } from "vitest";
import {
  assessFoundationalReadiness,
  introductionReadinessGuidance,
  asksAboutRequirement,
  asksToBeginMatching,
  REQUIRED_UNDERSTANDING_AREAS,
  MIN_UNDERSTOOD_FACETS,
  type UnderstandingRow,
} from "./introduction-readiness";

const prose = (s: string) => `${s} — she has enough here to reason from responsibly.`;

function facet(key: string, confidence = 0.6, understanding = prose(key)): UnderstandingRow {
  return { facet_key: key, understanding, confidence };
}

/** A member Athena genuinely understands: every required area plus breadth. */
function readyRows(): UnderstandingRow[] {
  return [
    "partnership_vision",
    "core_values",
    "communication_style",
    "lifestyle",
    "attachment_tendencies",
    "boundaries",
    "physical_attraction_preferences",
    "conflict_style",
    "social_and_family",
    "life_direction",
    // Rebuild Spec Tracks A and B.
    "temperament_mode",
    "nervous_system_pattern",
  ].map((k) => facet(k));

}

describe("foundational readiness for introductions", () => {
  it("a member three to five short answers in is not ready", () => {
    const r = assessFoundationalReadiness([facet("core_values"), facet("lifestyle")]);
    expect(r.ready).toBe(false);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("a genuinely understood member is ready", () => {
    expect(assessFoundationalReadiness(readyRows()).ready).toBe(true);
  });

  it("terse answers still satisfy an area when Athena wrote a real understanding", () => {
    const rows = readyRows().map((r) =>
      r.facet_key === "physical_attraction_preferences"
        ? facet(
            "physical_attraction_preferences",
            0.5,
            "Appearance barely matters to them; attraction grows out of how someone speaks to them.",
          )
        : r,
    );
    expect(assessFoundationalReadiness(rows).ready).toBe(true);
  });

  it("a verbose member covering few areas is not ready", () => {
    const rows = [
      facet("purpose_and_ambition", 0.9, prose("an enormous amount about their career")),
      facet("core_values", 0.9),
      facet("self_understanding", 0.9),
    ];
    const r = assessFoundationalReadiness(rows);
    expect(r.ready).toBe(false);
    expect(r.missing.map((m) => m.key)).toContain("attraction");
  });

  it("breadth without attraction understanding is not ready", () => {
    const rows = readyRows().filter((r) => r.facet_key !== "physical_attraction_preferences");
    rows.push(facet("humor_and_temperament"), facet("relationship_pacing"));
    const r = assessFoundationalReadiness(rows);
    expect(r.ready).toBe(false);
    expect(r.missing.map((m) => m.key)).toEqual(["attraction"]);
  });

  it("attraction alone, without broader understanding, is not ready", () => {
    const r = assessFoundationalReadiness([facet("physical_attraction_preferences")]);
    expect(r.ready).toBe(false);
    expect(r.missing.length).toBeGreaterThan(1);
  });

  it("required areas held but breadth still thin is not ready", () => {
    const rows = REQUIRED_UNDERSTANDING_AREAS.map((a) => facet(a.facets[0]!));
    expect(rows.length).toBeLessThan(MIN_UNDERSTOOD_FACETS);
    const r = assessFoundationalReadiness(rows);
    expect(r.missing).toHaveLength(0);
    expect(r.breadthShort).toBe(true);
    expect(r.ready).toBe(false);
  });

  it("empty, placeholder or low-confidence understanding does not count", () => {
    const rows = readyRows().map((r) =>
      r.facet_key === "boundaries" ? facet("boundaries", 0.1) : r,
    );
    expect(assessFoundationalReadiness(rows).missing.map((m) => m.key)).toContain("boundaries");

    const placeholder = readyRows().map((r) =>
      r.facet_key === "boundaries" ? facet("boundaries", 0.8, "Unknown") : r,
    );
    expect(assessFoundationalReadiness(placeholder).ready).toBe(false);
  });

  it("a returning member's historical understanding satisfies the requirement", () => {
    // Same rows, no live conversation state at all.
    expect(assessFoundationalReadiness(readyRows()).ready).toBe(true);
  });

  it("a returning member with material gaps is held again", () => {
    const rows = readyRows().filter(
      (r) => r.facet_key !== "boundaries" && r.facet_key !== "physical_attraction_preferences",
    );
    const r = assessFoundationalReadiness(rows);
    expect(r.ready).toBe(false);
    expect(r.missing.map((m) => m.key).sort()).toEqual(["attraction", "boundaries"]);
  });

  it("alternative facets satisfy the same area (no scripted questions)", () => {
    const rows = readyRows().map((r) =>
      r.facet_key === "communication_style" ? facet("emotional_regulation") : r,
    );
    expect(assessFoundationalReadiness(rows).ready).toBe(true);
  });
});

describe("Athena's posture under pressure", () => {
  const notReady = assessFoundationalReadiness([facet("core_values")]);

  it("forbids promising immediate matching and inventing a number", () => {
    const g = introductionReadinessGuidance(notReady);
    expect(g).toMatch(/HOLD THE THRESHOLD/);
    expect(g).toMatch(/do not invent a number/i);
    expect(g).toMatch(/may not say or imply that you could begin matching now/i);
  });

  it("never exposes counts, scores or progress", () => {
    const g = introductionReadinessGuidance(notReady);
    expect(g).toMatch(/never mention percentages, scores/i);
    expect(g).not.toMatch(/\b\d+ of \d+\b/);
    expect(g).not.toMatch(/progress bar/i);
  });

  it("does not lower the standard for impatient or terse members", () => {
    expect(introductionReadinessGuidance(notReady)).toMatch(
      /impatience, terseness, sarcasm or mild rudeness change nothing/i,
    );
  });

  it("permits saying so once she is ready, without promising anyone soon", () => {
    const g = introductionReadinessGuidance(assessFoundationalReadiness(readyRows()));
    expect(g).toMatch(/you may say so plainly/i);
    expect(g).toMatch(/not the same as someone appearing soon/i);
  });

  it("recognises the member asking about the requirement", () => {
    expect(asksAboutRequirement("how many questions do I have to answer?")).toBe(true);
    expect(asksAboutRequirement("Is that enough?")).toBe(true);
    expect(asksAboutRequirement("I like hiking")).toBe(false);
  });

  it("recognises the member asking to begin matching now", () => {
    expect(asksToBeginMatching("can you just start matching me now")).toBe(true);
    expect(asksToBeginMatching("introduce me to someone")).toBe(true);
    expect(asksToBeginMatching("my sister introduced me to hiking")).toBe(false);
  });
});
