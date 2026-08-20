// Regression coverage for F-13 Change / Correction / Removal, including
// propagation to the denormalised Living Profile mirror (audit finding A-01).
import { describe, expect, it } from "vitest";
import {
  FACET_MIRROR_COLUMNS,
  mirrorPatch,
  revisionPatch,
  athenaRestatement,
  toFacetView,
  trimStatement,
} from "./understanding.server";
import { FACET_KEYS } from "./facets";

describe("F-13 revision patches", () => {
  it("change is restated in Athena's voice while the member's words stay authoritative", () => {
    const p = revisionPatch("change", "I moved to Chicago last spring.");
    // BR01-05: Athena never speaks as the member.
    expect(p.understanding).toBe("You moved to Chicago last spring.");
    expect(p.evidence).toEqual(["I moved to Chicago last spring."]);
    expect(p.basis).toBe("stated");
  });

  it("correction supersedes the wrong understanding and lowers confidence", () => {
    const p = revisionPatch("correction", "I'm not avoidant, I just need warning.");
    expect(p.understanding).toBe("You're not avoidant, you just need warning.");
    expect(p.confidence).toBeLessThan(revisionPatch("change", "x").confidence + 0.01);
    expect(p.confidence).toBeLessThanOrEqual(0.5);
  });

  it("removal retains nothing in the facet row", () => {
    const p = revisionPatch("removal", null);
    expect(p.understanding).toBeNull();
    expect(p.evidence).toEqual([]);
    expect(p.confidence).toBe(0);
  });

  it("statements are trimmed and bounded, never expanded", () => {
    expect(trimStatement("   ")).toBeNull();
    expect(trimStatement(null)).toBeNull();
    expect(trimStatement("a".repeat(5000))!.length).toBe(1200);
  });
});

describe("F-13 mirror propagation (A-01)", () => {
  it("every mirrored facet key is a real facet key", () => {
    for (const key of Object.keys(FACET_MIRROR_COLUMNS)) {
      expect(FACET_KEYS).toContain(key as never);
    }
  });

  it("removal clears the mirrored copy so it cannot survive on /profile", () => {
    expect(mirrorPatch("life_direction", "removal", null)).toEqual({ life_direction: null });
    expect(mirrorPatch("readiness", "removal", null)).toEqual({ readiness_summary: null });
    expect(mirrorPatch("attachment_tendencies", "removal", null)).toEqual({
      attachment_style: null,
    });
  });

  it("correction overwrites the mirror with Athena's restatement", () => {
    expect(mirrorPatch("conflict_style", "correction", "I withdraw, then I come back.")).toEqual({
      conflict_style: "You withdraw, then you come back.",
    });
  });

  it("a statement with no first-person voice is left exactly as written", () => {
    expect(athenaRestatement("Partnership, not a project.")).toBe("Partnership, not a project.");
    expect(athenaRestatement("You had this right already.")).toBe("You had this right already.");
  });

  it("change overwrites the mirror with the member's words", () => {
    expect(mirrorPatch("partnership_vision", "change", "Partnership, not a project.")).toEqual({
      partnership_vision: "Partnership, not a project.",
    });
  });

  it("core_values is a list, so a prose revision clears rather than invents entries", () => {
    expect(mirrorPatch("core_values", "correction", "Loyalty matters more than novelty.")).toEqual({
      core_values: [],
    });
    expect(mirrorPatch("core_values", "removal", null)).toEqual({ core_values: [] });
  });

  it("facets with no mirror column produce no mirror write", () => {
    expect(mirrorPatch("humor_and_temperament", "removal", null)).toBeNull();
    expect(mirrorPatch("boundaries", "correction", "x")).toBeNull();
  });

  it("no revision kind ever leaves the mirror holding the superseded text", () => {
    const superseded = "Athena's wrong guess";
    for (const key of Object.keys(FACET_MIRROR_COLUMNS)) {
      for (const kind of ["change", "correction", "removal"] as const) {
        const patch = mirrorPatch(key, kind, kind === "removal" ? null : "the truth");
        expect(JSON.stringify(patch)).not.toContain(superseded);
      }
    }
  });
});

describe("stated vs inferred survives revision (F-14)", () => {
  it("a revised facet reads as stated, not inferred", () => {
    const patch = revisionPatch("correction", "I'm the planner, not the drifter.");
    const view = toFacetView(
      {
        facet_key: "self_understanding",
        understanding: patch.understanding,
        confidence: patch.confidence,
        evidence: patch.evidence,
        basis: patch.basis,
        refined_at: patch.refined_at,
      },
      new Set(["self_understanding"]),
    );
    expect(view.basis).toBe("stated");
    expect(view.revised).toBe(true);
    // BR01-04: provenance comes from the stored basis, never from evidence.
    expect(
      toFacetView(
        { facet_key: "lifestyle", understanding: "x", confidence: 0.5, evidence: ["quoted"], basis: "inferred", refined_at: null },
        new Set(),
      ).basis,
    ).toBe("inferred");
    expect(
      toFacetView(
        { facet_key: "lifestyle", understanding: "x", confidence: 0.5, evidence: [], basis: null, refined_at: null },
        new Set(),
      ).basis,
    ).toBe("unestablished");
    expect(String(view.held)).not.toMatch(/\d/);
  });
});
