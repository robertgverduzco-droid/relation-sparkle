import { describe, expect, it } from "vitest";
import {
  MAX_CONSECUTIVE_SAME_DOMAIN,
  MIN_FOUNDATIONAL_DOMAINS,
  assessCoverage,
  breadthNudge,
  domainsIn,
  foundationalGuidance,
  memberLedDepth,
} from "./foundational";

const a = (content: string) => ({ role: "assistant", content });
const u = (content: string) => ({ role: "user", content });

describe("domain detection", () => {
  it("recognises distinct parts of a life", () => {
    expect(domainsIn("my family raised me around my brother")).toContain("family");
    expect(domainsIn("I care a lot about my career and ambition")).toContain("work_ambition");
    expect(domainsIn("chemistry matters, I do have a type")).toContain("attraction");
  });

  it("does not claim coverage from empty or neutral text", () => {
    expect(domainsIn("")).toEqual([]);
    expect(domainsIn("Mm. Go on.")).toEqual([]);
  });
});

describe("the tunnelling pattern this remediation exists to prevent", () => {
  it("flags Athena staying inside one subject across consecutive turns", () => {
    const state = assessCoverage([
      a("What was your family like growing up?"),
      u("My parents split when I was nine."),
      a("How did your family handle that with your siblings?"),
      u("My brother took it harder."),
      a("And what did your mother do in the family after that?"),
      u("She worked constantly."),
    ]);
    expect(state.consecutiveSameDomain).toBeGreaterThanOrEqual(MAX_CONSECUTIVE_SAME_DOMAIN);
    expect(state.dwelling).toContain("family");
    expect(state.shouldBroaden).toBe(true);
    expect(foundationalGuidance(state)).toMatch(/move to a different part of their life/);
  });

  it("leaves a naturally broad conversation alone", () => {
    const state = assessCoverage([
      a("What are you hoping to find?"),
      u("Something long-term, a real partnership."),
      a("What does everyday life together look like to you?"),
      u("Ordinary days that feel easy, cooking at home."),
    ]);
    expect(state.shouldBroaden).toBe(false);
    expect(breadthNudge(state)).toBeNull();
  });
});

describe("member-led depth is protected", () => {
  it("never broadens away from a member who asked to stay", () => {
    const state = assessCoverage([
      a("What was your family like?"),
      u("Complicated."),
      a("How did your family shape you?"),
      u("Actually, I want to talk about my family more — there's more to this."),
    ]);
    expect(memberLedDepth("I want to talk about my family more")).toBe(true);
    expect(state.memberLed).toBe(true);
    expect(state.shouldBroaden).toBe(false);
    expect(foundationalGuidance(state)).toMatch(/Stay with them/);
  });
});

describe("completion is breadth, not exhaustion", () => {
  it("withholds sufficiency until enough of a life has been seen", () => {
    const state = assessCoverage([u("My family is close and my job is demanding.")]);
    expect(state.breadthSufficient).toBe(false);
    expect(state.covered.length).toBeLessThan(MIN_FOUNDATIONAL_DOMAINS);
  });

  it("recognises sufficiency once many domains are genuinely touched", () => {
    const state = assessCoverage([
      u("I'm looking for something long-term."),
      u("Honesty is the value that matters most to me."),
      u("I'd rather talk things through than let it sit."),
      u("I get overwhelmed and need to process it."),
      u("Conflict makes me want to apologise too fast."),
      u("My family is close."),
      u("Work is a big part of my life, I'm ambitious."),
      u("Weekends I hike and read."),
      u("Chemistry matters to me, I'm drawn to warmth."),
    ]);
    expect(state.breadthSufficient).toBe(true);
    expect(foundationalGuidance(state)).toMatch(/close well/);
  });
});

describe("guidance never leaks to the member", () => {
  it("keeps the map internal and supplies no stock transition copy", () => {
    const text = foundationalGuidance(assessCoverage([u("My family is close.")]));
    expect(text).toMatch(/never read aloud/);
    expect(text).toMatch(/Your transition language is yours/);
    expect(text).not.toMatch(/say to them:|use this phrase/i);
  });

  it("nudges live mode without inviting an announced subject change", () => {
    const nudge = breadthNudge(
      assessCoverage([
        a("Tell me about your family."),
        u("Big family."),
        a("And your parents?"),
        u("Close."),
        a("What about your siblings and family holidays?"),
      ]),
    );
    expect(nudge).toBeTruthy();
    expect(nudge).toMatch(/not to be spoken/);
    expect(nudge).toMatch(/Do not mention this guidance/);
  });
});
