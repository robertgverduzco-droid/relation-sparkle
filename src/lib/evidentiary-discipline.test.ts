import { describe, expect, it } from "vitest";
import {
  claimStrength,
  deriveRung,
  detectBarnum,
  detectGoldStar,
  detectManufacturedContrast,
  detectPerfectionStandard,
  detectTherapistDefault,
  detectUnearnedAttribution,
  evidenceWeight,
  evidentiaryGuidance,
  memberIntroducedPerfection,
  passesFortuneTellerTest,
  rungFromBasis,
  EVIDENTIARY_CORE,
  EVIDENTIARY_ANALYTICAL,
} from "./evidentiary-discipline";
import { runtimeDoctrine } from "./athena-doctrine.server";
import { facetSchema } from "./athena.server";
import { resolveBasis } from "./understanding.server";
import { BASIS_LABEL } from "./facets";

describe("evidence ladder", () => {
  it("keeps a self-report a self-report no matter how often it is repeated", () => {
    expect(rungFromBasis("self_report")).toBe("self_report");
    expect(
      deriveRung({ basis: "self_report", evidenceCount: 6, historyCount: 5, confidence: 0.9 }),
    ).toBe("self_report");
  });

  it("maps legacy 'stated' rows onto self-report rather than knowledge", () => {
    expect(rungFromBasis("stated")).toBe("self_report");
    expect(resolveBasis("stated")).toBe("self_report");
  });

  it("promotes observation to a pattern only once it accumulates", () => {
    expect(deriveRung({ basis: "observed", evidenceCount: 1, historyCount: 0 })).toBe("observed");
    expect(
      deriveRung({ basis: "observed", evidenceCount: 3, historyCount: 2, confidence: 0.5 }),
    ).toBe("repeated_pattern");
    expect(
      deriveRung({ basis: "observed", evidenceCount: 4, historyCount: 3, confidence: 0.8 }),
    ).toBe("established");
  });

  it("demotes anything contradicted back to a hypothesis", () => {
    expect(
      deriveRung({
        basis: "repeated_pattern",
        evidenceCount: 6,
        historyCount: 4,
        confidence: 0.9,
        contradictionCount: 1,
      }),
    ).toBe("hypothesis");
  });

  it("weights demonstrated behaviour above self-description", () => {
    expect(evidenceWeight("repeated_pattern")).toBeGreaterThan(evidenceWeight("observed"));
    expect(evidenceWeight("observed")).toBeGreaterThan(evidenceWeight("self_report"));
    expect(evidenceWeight("self_report")).toBeGreaterThan(evidenceWeight("hypothesis"));
  });

  it("matches claim strength to evidence strength", () => {
    expect(claimStrength("self_report")).toBe("tentative");
    expect(claimStrength("observed")).toBe("emerging");
    expect(claimStrength("repeated_pattern")).toBe("pattern");
    expect(claimStrength("established")).toBe("settled");
    expect(claimStrength("unestablished")).toBe("withhold");
  });

  it("exposes a member-facing label for every rung", () => {
    for (const b of ["self_report", "observed", "repeated_pattern", "inferred", "hypothesis", "unestablished"] as const) {
      expect(BASIS_LABEL[b]).toBeTruthy();
    }
  });

  it("accepts every ladder rung in the reflection schema and rejects invented ones", () => {
    const base = {
      key: "core_values" as const,
      understanding: "x",
      reasoning: "y",
      evidence: [],
      confidence: 0.4,
      contradictsPrior: null,
      clarificationNote: null,
    };
    for (const basis of ["self_report", "observed", "repeated_pattern", "inferred", "hypothesis"]) {
      expect(facetSchema.safeParse({ ...base, basis }).success).toBe(true);
    }
    expect(facetSchema.safeParse({ ...base, basis: "established" }).success).toBe(false);
    expect(facetSchema.safeParse({ ...base, basis: "stated" }).success).toBe(false);
  });
});

describe("anti-fortune-teller detectors", () => {
  it("catches manufactured contrast", () => {
    expect(
      detectManufacturedContrast("You don't need someone to mirror you perfectly."),
    ).toBe(true);
    expect(detectManufacturedContrast("You're not asking her to read your mind.")).toBe(true);
    expect(detectManufacturedContrast("That's a much healthier way to see it.")).toBe(true);
    expect(detectManufacturedContrast("What did you end up doing about the flat?")).toBe(false);
  });

  it("catches perfection introduced as a relationship standard, but not ordinary usage", () => {
    expect(detectPerfectionStandard("your perfect partner is out there")).toBe(true);
    expect(detectPerfectionStandard("someone who understands you perfectly")).toBe(true);
    expect(detectPerfectionStandard("That sounds like a perfect Sunday.")).toBe(false);
    expect(detectPerfectionStandard("The timing was perfect.")).toBe(false);
  });

  it("lets Athena engage with perfection when the member raises it", () => {
    expect(memberIntroducedPerfection(["I'm waiting for the perfect partner."])).toBe(true);
    expect(memberIntroducedPerfection(["I had a perfect weekend."])).toBe(false);
  });

  it("catches Barnum statements and unearned trait attribution", () => {
    expect(detectBarnum("You care deeply about the people close to you.")).toBe(true);
    expect(detectBarnum("You want someone who understands you.")).toBe(true);
    expect(detectUnearnedAttribution("You're so self-aware.")).toBe(true);
    expect(detectUnearnedAttribution("That shows real emotional intelligence.")).toBe(true);
    expect(detectUnearnedAttribution("You mentioned Lisbon twice now.")).toBe(false);
  });

  it("catches therapist-default and gold-star constructions", () => {
    expect(detectTherapistDefault("What I'm hearing is that it hurt.")).toBe(true);
    expect(detectTherapistDefault("Your feelings are valid.")).toBe(true);
    expect(detectGoldStar("That's really mature of you.")).toBe(true);
    expect(detectGoldStar("Good for you.")).toBe(true);
    expect(detectGoldStar("So what happened after that?")).toBe(false);
  });

  it("fails the fortune-teller test only when nothing specific supports the claim", () => {
    expect(passesFortuneTellerTest("You value honesty.", { specificEvidence: false })).toBe(false);
    expect(passesFortuneTellerTest("You value honesty.", { specificEvidence: true })).toBe(true);
    expect(
      passesFortuneTellerTest("You left that job three weeks after the promotion.", {
        specificEvidence: false,
      }),
    ).toBe(true);
  });
});

describe("doctrine wiring", () => {
  it("puts evidentiary discipline on every surface", () => {
    for (const mode of ["conversation", "reflection", "pair", "meeting"] as const) {
      expect(runtimeDoctrine(mode)).toContain(EVIDENTIARY_CORE);
    }
  });

  it("gives text and continuous voice identical evidentiary guidance", () => {
    // Voice resolves to the conversation doctrine, so parity is structural:
    // there is one string, not two that could drift apart.
    expect(evidentiaryGuidance()).toBe(EVIDENTIARY_CORE);
    expect(runtimeDoctrine("conversation")).toContain(evidentiaryGuidance());

  });

  it("holds analytical surfaces to the stricter standard, and not conversation", () => {
    expect(runtimeDoctrine("reflection")).toContain(EVIDENTIARY_ANALYTICAL);
    expect(runtimeDoctrine("pair")).toContain(EVIDENTIARY_ANALYTICAL);
    expect(runtimeDoctrine("conversation")).not.toContain(EVIDENTIARY_ANALYTICAL);
  });

  it("weights evidence quality inside compatibility reasoning", () => {
    expect(runtimeDoctrine("pair")).toContain("EVIDENCE QUALITY IN COMPATIBILITY REASONING");
  });

  it("states what the education is for, on every surface", () => {
    expect(runtimeDoctrine("conversation")).toContain("WHAT YOUR EDUCATION IS FOR");
    expect(runtimeDoctrine("pair")).toContain("WHAT YOUR EDUCATION IS FOR");
  });

  it("does not restate a banned-phrase list as the mechanism", () => {
    // The correction is a standard of evidence, not a blocklist.
    expect(EVIDENTIARY_CORE).toContain("earned by evidence");
    expect(EVIDENTIARY_CORE).toContain("competent adult");
  });
});
