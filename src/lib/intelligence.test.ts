import { describe, expect, it } from "vitest";
import {
  CHALLENGE_SUPPORT_RATIO,
  MIN_CASES_FORMING,
  MIN_CASES_SUBSTANTIATED,
  PROTECTED_TERMS,
  canTransition,
  classifyDivergence,
  composeBriefing,
  confidenceBand,
  confidenceState,
  nextIntelligenceVersion,
  promotionDecision,
  screenSensitivity,
  supportRatio,
  warrantedStatus,
  type BriefingHypothesis,
} from "./intelligence";
import { PROHIBITED_DIMENSIONS } from "./learning.server";

const tally = (applicableCases: number, supporting: number, contradicting: number) => ({
  applicableCases,
  supporting,
  contradicting,
});

describe("evidence thresholds", () => {
  it("claims nothing below the forming floor", () => {
    expect(confidenceState(tally(MIN_CASES_FORMING - 1, 7, 0))).toBe("insufficient");
  });

  it("is only tentative between the two floors", () => {
    expect(confidenceState(tally(MIN_CASES_FORMING, 8, 0))).toBe("tentative");
    expect(confidenceState(tally(MIN_CASES_SUBSTANTIATED - 1, 19, 0))).toBe("tentative");
  });

  it("substantiates only with volume AND a strong support ratio", () => {
    expect(confidenceState(tally(MIN_CASES_SUBSTANTIATED, 20, 0))).toBe("substantiated");
    expect(confidenceState(tally(40, 20, 20))).toBe("tentative");
  });

  it("computes an honest support ratio with no evidence", () => {
    expect(supportRatio(tally(0, 0, 0))).toBe(0);
  });
});

describe("hypothesis lifecycle", () => {
  it("permits only legal transitions", () => {
    expect(canTransition("observed", "forming")).toBe(true);
    expect(canTransition("observed", "supported")).toBe(false);
    expect(canTransition("forming", "supported")).toBe(true);
  });

  it("never revives a blocked or retired pattern", () => {
    expect(canTransition("blocked", "forming")).toBe(false);
    expect(canTransition("retired", "supported")).toBe(false);
    expect(warrantedStatus("blocked", tally(100, 100, 0))).toBe("blocked");
  });

  it("challenges a pattern when contradicting evidence dominates", () => {
    const t = tally(30, 10, 20);
    expect(supportRatio(t)).toBeLessThan(CHALLENGE_SUPPORT_RATIO);
    expect(warrantedStatus("forming", t)).toBe("challenged");
  });

  it("supports only what volume and ratio both warrant", () => {
    expect(warrantedStatus("forming", tally(30, 28, 2))).toBe("supported");
    expect(warrantedStatus("forming", tally(10, 9, 1))).toBe("forming");
    expect(warrantedStatus("observed", tally(3, 3, 0))).toBe("observed");
  });
});

describe("protected characteristics", () => {
  it("mirrors every prohibited dimension from the learning layer", () => {
    for (const d of PROHIBITED_DIMENSIONS) {
      expect(PROTECTED_TERMS.some((t) => d.includes(t) || t.includes(d))).toBe(true);
    }
  });

  it("blocks a pattern keyed to a protected characteristic", () => {
    const v = screenSensitivity("ethnicity_match", "Members of the same ethnicity continue more often.");
    expect(v.flag).toBe("blocked");
    expect(v.terms.length).toBeGreaterThan(0);
  });

  it("holds an incidental reference for founder review rather than accepting it", () => {
    const v = screenSensitivity(
      "communication_repair",
      "Pairs who repair after conflict continue, regardless of religion.",
    );
    expect(v.flag).toBe("review_required");
  });

  it("clears a purely behavioural pattern", () => {
    expect(
      screenSensitivity("repair_speed", "Pairs who repair quickly after friction continue longer.").flag,
    ).toBe("clear");
  });
});

describe("promotion", () => {
  const base = {
    status: "supported" as const,
    confidence: "substantiated" as const,
    sensitivity: "clear" as const,
    tally: tally(30, 27, 3),
    alternativeExplanations: 2,
    challengesEducation: false,
    educationConflictAcknowledged: false,
    target: "canonical" as const,
  };

  it("allows a fully evidenced, ethically clear promotion", () => {
    expect(promotionDecision(base).allowed).toBe(true);
  });

  it("never promotes a blocked pattern", () => {
    const d = promotionDecision({ ...base, sensitivity: "blocked" });
    expect(d.allowed).toBe(false);
    expect(d.blockers.join(" ")).toContain("never");
  });

  it("refuses canonical status without an alternative explanation", () => {
    expect(promotionDecision({ ...base, alternativeExplanations: 0 }).allowed).toBe(false);
  });

  it("refuses to overrule the Curriculum without explicit acknowledgement", () => {
    expect(promotionDecision({ ...base, challengesEducation: true }).allowed).toBe(false);
    expect(
      promotionDecision({
        ...base,
        challengesEducation: true,
        educationConflictAcknowledged: true,
      }).allowed,
    ).toBe(true);
  });

  it("refuses canonical status on tentative confidence", () => {
    expect(promotionDecision({ ...base, confidence: "tentative" }).allowed).toBe(false);
  });

  it("allows an experiment earlier than canonical, but not on thin evidence", () => {
    expect(
      promotionDecision({
        ...base,
        target: "experimental",
        status: "forming",
        confidence: "tentative",
        tally: tally(12, 9, 3),
      }).allowed,
    ).toBe(true);
    expect(
      promotionDecision({
        ...base,
        target: "experimental",
        status: "forming",
        confidence: "insufficient",
        tally: tally(2, 2, 0),
      }).allowed,
    ).toBe(false);
  });
});

describe("prediction ledger", () => {
  it("bands confidence", () => {
    expect(confidenceBand(0.2)).toBe("low");
    expect(confidenceBand(0.6)).toBe("moderate");
    expect(confidenceBand(0.9)).toBe("high");
  });

  it("counts a bad outcome after a confident introduction as divergence", () => {
    expect(classifyDivergence("high", "negative")).toBe("diverged");
    expect(classifyDivergence("high", "positive")).toBe("aligned");
    expect(classifyDivergence("low", "positive")).toBe("diverged");
    expect(classifyDivergence("high", "neutral")).toBe("unknown");
  });
});

describe("intelligence versioning", () => {
  it("advances the minor version", () => {
    expect(nextIntelligenceVersion("learning-1.0.0")).toBe("learning-1.1.0");
    expect(nextIntelligenceVersion("nonsense")).toBe("learning-1.0.0");
  });
});

describe("founder briefing", () => {
  const hyp = (over: Partial<BriefingHypothesis> = {}): BriefingHypothesis => ({
    slug: "s",
    statement: "A pattern.",
    dimension: "repair",
    status: "forming",
    confidence: "tentative",
    influence: "none",
    applicableCases: 10,
    supporting: 8,
    contradicting: 2,
    challengesEducation: false,
    isSurprise: false,
    sensitivity: "clear",
    alternativeExplanations: [],
    universityPrinciples: [],
    ...over,
  });

  const input = {
    intelligenceVersion: "learning-1.0.0",
    observations: 0,
    pairsObserved: 0,
    predictions: 0,
    outcomesLinked: 0,
    aligned: 0,
    diverged: 0,
    hypotheses: [] as BriefingHypothesis[],
  };

  it("admits thin evidence instead of manufacturing insight", () => {
    const body = composeBriefing(input)[0]!.body;
    expect(body).toContain("Very little yet");
  });

  it("states plainly when nothing learned is influencing her", () => {
    const s = composeBriefing(input).find((x) => x.heading === "What is actually influencing me");
    expect(s?.body).toContain("Nothing learned");
  });

  it("surfaces what argues with her education without acting on it", () => {
    const s = composeBriefing({
      ...input,
      pairsObserved: 40,
      hypotheses: [hyp({ challengesEducation: true, universityPrinciples: ["Attachment repair"] })],
    }).find((x) => x.heading === "Where the evidence argues with my education");
    expect(s?.body).toContain("Attachment repair");
    expect(s?.body).toContain("not acting on it");
  });

  it("reports refused learning when a pattern touches a protected characteristic", () => {
    const s = composeBriefing({
      ...input,
      hypotheses: [hyp({ sensitivity: "blocked", status: "blocked" })],
    }).find((x) => x.heading === "What I have refused to learn");
    expect(s).toBeTruthy();
    expect(s?.body).toContain("permanently");
  });

  it("never reports a member-facing score anywhere in the briefing", () => {
    const text = composeBriefing({
      ...input,
      pairsObserved: 30,
      observations: 90,
      predictions: 20,
      outcomesLinked: 12,
      aligned: 8,
      diverged: 4,
      hypotheses: [hyp()],
    })
      .map((s) => s.body)
      .join(" ");
    expect(text).not.toMatch(/\d+%\s*(match|compatib)/i);
  });
});
