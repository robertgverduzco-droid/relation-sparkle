// Living Profile depth & specialist-lens model.
import { describe, expect, it } from "vitest";
import { FACET_KEYS } from "./facets";
import {
  DEPTH_GUIDANCE,
  LENS_FACETS,
  LENS_ORDER,
  depthLicence,
  depthStage,
  hasEvolvedSince,
  lensCoverage,
  lensForFacet,
  memberFacingDepth,
  mergeEvidence,
  stillLearning,
  stillLearningCopy,
} from "./profile-depth";
import { toFacetView } from "./understanding.server";

const NO_NUMBERS = /\d/;

describe("specialist lenses", () => {
  it("covers every canonical facet exactly once and invents no new domain", () => {
    const c = lensCoverage();
    expect(c.missing).toEqual([]);
    expect(c.duplicated).toEqual([]);
    expect(new Set(c.covered)).toEqual(new Set(FACET_KEYS));
    for (const lens of LENS_ORDER)
      for (const f of LENS_FACETS[lens]) expect(FACET_KEYS).toContain(f);
  });

  it("maps a facet to a stable lens", () => {
    expect(lensForFacet("conflict_style")).toBe("friction_and_boundaries");
    expect(lensForFacet("physical_attraction_preferences")).toBe("attraction");
  });
});

describe("depth progression", () => {
  it("keeps a newly onboarded member's understanding early", () => {
    expect(depthStage({ evidenceCount: 1, historyCount: 0, confidence: 0.4 })).toBe("early");
  });

  it("moves to developing once observations recur across occasions", () => {
    expect(depthStage({ evidenceCount: 3, historyCount: 1, confidence: 0.5 })).toBe("developing");
  });

  it("reaches mature only with accumulated evidence and repeated refinement", () => {
    expect(depthStage({ evidenceCount: 6, historyCount: 4, confidence: 0.7 })).toBe("mature");
    // Verbosity alone must not buy depth.
    expect(depthStage({ evidenceCount: 9, historyCount: 0, confidence: 0.9 })).toBe("early");
  });

  it("licences length without mandating it, and never leaks numbers to members", () => {
    expect(depthLicence("early")).toBe(DEPTH_GUIDANCE.early);
    expect(depthLicence("mature")).toMatch(/if, and only if, the evidence carries them/);
    for (const s of ["early", "developing", "mature"] as const)
      expect(memberFacingDepth(s)).not.toMatch(NO_NUMBERS);
  });
});

describe("what Athena is still learning", () => {
  const rows = FACET_KEYS.map((k) => ({
    facet_key: k,
    understanding: "something",
    confidence: 0.6,
    needs_clarification: false,
  }));

  it("prefers unresolved tension, then thin understanding, then untouched areas", () => {
    const r = [...rows];
    r[0] = { ...r[0], needs_clarification: true };
    r[1] = { ...r[1], confidence: 0.1 };
    const items = stillLearning(r);
    expect(items[0].why).toBe("unclear");
    expect(items[1].why).toBe("thin");
  });

  it("stays honest and short for a brand-new member without becoming a checklist", () => {
    const items = stillLearning([]);
    expect(items.length).toBe(3);
    const copy = stillLearningCopy(items)!;
    expect(copy).not.toMatch(NO_NUMBERS);
    expect(copy).toMatch(/or not at all/);
  });

  it("says nothing when there is nothing honest to say", () => {
    expect(stillLearningCopy([])).toBeNull();
  });
});

describe("evidence accumulation", () => {
  it("accumulates across conversations rather than replacing", () => {
    const merged = mergeEvidence(["older quote"], ["new quote"]);
    expect(merged).toEqual(["new quote", "older quote"]);
  });

  it("de-duplicates and caps the trail", () => {
    expect(mergeEvidence(["a"], ["A"])).toEqual(["A"]);
    expect(mergeEvidence(Array.from({ length: 30 }, (_, i) => `q${i}`), ["new"]).length).toBe(10);
  });
});

describe("evolution marker", () => {
  it("marks a section that changed since the member last read it", () => {
    expect(hasEvolvedSince("2026-08-10T00:00:00Z", "2026-08-01T00:00:00Z")).toBe(true);
    expect(hasEvolvedSince("2026-07-10T00:00:00Z", "2026-08-01T00:00:00Z")).toBe(false);
  });

  it("stays silent when it cannot know", () => {
    expect(hasEvolvedSince(null, "2026-08-01T00:00:00Z")).toBe(false);
    expect(hasEvolvedSince("2026-08-01T00:00:00Z", null)).toBe(false);
  });
});

describe("member-facing facet view", () => {
  const base = {
    facet_key: "communication_style",
    understanding: "You think before you answer.",
    confidence: 0.72,
    evidence: ["a", "b", "c", "d"],
    basis: "inferred",
    refined_at: "2026-08-10T00:00:00Z",
  };

  it("carries lens, qualitative depth and provenance without any score", () => {
    const v = toFacetView(base, new Set(), { historyCount: 4, reviewedAt: "2026-08-01T00:00:00Z" });
    expect(v.lens).toBe("how_you_connect");
    expect(v.stage).toBe("mature");
    expect(v.basis).toBe("inferred");
    expect(v.evolved).toBe(true);
    expect(v.depth).not.toMatch(NO_NUMBERS);
    expect(v.held).not.toMatch(NO_NUMBERS);
  });

  it("keeps a terse member's understanding early and honest", () => {
    const v = toFacetView(
      { ...base, evidence: ["a"], confidence: 0.2, basis: "stated" },
      new Set(),
      { historyCount: 0 },
    );
    expect(v.stage).toBe("early");
    expect(v.held).toBe("held lightly");
    expect(v.basis).toBe("self_report");
  });

  it("shows a corrected facet as revised and preserves stated provenance", () => {
    const v = toFacetView({ ...base, basis: "stated" }, new Set(["communication_style"]), {
      historyCount: 1,
    });
    expect(v.revised).toBe(true);
    expect(v.basis).toBe("self_report");
  });
});
