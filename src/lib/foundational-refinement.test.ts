// ATHENA V1 — FOUNDATIONAL CONVERSATION / INTAKE REFINEMENT.
//
// Four contracts are protected here:
//  1. Hobbies and drinking are ordinary understanding, never desirability.
//  2. Respect for their time is a courtesy; it never overrides readiness.
//  3. Readiness never contradicts itself between turns.
//  4. A member who wants to keep talking is not dismissed again and again.
import { describe, expect, it } from "vitest";
import {
  CONTINUE_SUPPRESSION_TURNS,
  RESPECT_TIME_MINUTES,
  decidePacing,
  memberWantsToContinue,
  respectTimeGuidance,
  turnsSinceContinueRequest,
} from "./pacing";
import { resolveReadinessClaim, understandingSignature } from "./readiness-truth";
import { assessCoverage, domainsIn } from "./foundational";
import {
  DRINKING_OPTIONS,
  EMPTY_PREFERENCES,
  EMPTY_SELF,
  HOBBY_OPTIONS,
  evaluateConstraints,
  structuredContextBlock,
} from "./structured-profile";

const base = {
  reply: "That makes sense.",
  latestMemberMessage: "Yeah.",
  breadthSufficient: true,
};

describe("hobbies and drinking are understanding, never scoring", () => {
  it("carries both into what Athena reads about a person", () => {
    const block = structuredContextBlock(
      {
        ...EMPTY_SELF,
        drinking: "socially",
        hobbies: ["hiking", "cooking"],
        hobbies_note: "I restore old bicycles.",
      },
      EMPTY_PREFERENCES,
    );
    expect(block).toMatch(/drinking/i);
    expect(block).toMatch(/Hiking & the outdoors/);
    expect(block).toMatch(/restore old bicycles/);
    expect(block).toMatch(/never as things to match on/i);
    expect(block).not.toMatch(/score|rank|rating/i);
  });

  it("treats a stated drinking requirement as a genuine constraint, and silence as unknown", () => {
    const holder = {
      self: EMPTY_SELF,
      prefs: { ...EMPTY_PREFERENCES, drinking_openness: "requirement" as const, preferred_drinking: ["no"] },
    };
    const teetotal = evaluateConstraints(holder, { self: { ...EMPTY_SELF, drinking: "no" }, prefs: EMPTY_PREFERENCES });
    const drinker = evaluateConstraints(holder, {
      self: { ...EMPTY_SELF, drinking: "regularly" },
      prefs: EMPTY_PREFERENCES,
    });
    const unstated = evaluateConstraints(holder, { self: EMPTY_SELF, prefs: EMPTY_PREFERENCES });

    expect(teetotal.outcomes.find((o) => o.field === "drinking")?.state).toBe("compatible");
    expect(drinker.outcomes.find((o) => o.field === "drinking")?.state).toBe("incompatible");
    expect(unstated.outcomes.find((o) => o.field === "drinking")?.state ?? "unknown").not.toBe("incompatible");
  });

  it("offers members real options for both", () => {
    expect(DRINKING_OPTIONS.map((o) => o.value)).toContain("socially");
    expect(HOBBY_OPTIONS.length).toBeGreaterThan(10);
  });

  it("counts everyday habits as a part of a life the foundation must see", () => {
    expect(domainsIn("I don't drink at all these days")).toContain("lifestyle_habits");
    const state = assessCoverage([{ role: "user", content: "I quit smoking last year and rarely drink." }]);
    expect(state.covered).toContain("lifestyle_habits");
  });
});

describe("respect for their time never overrides readiness", () => {
  it("says nothing about the clock before the respect-time point", () => {
    expect(respectTimeGuidance({ elapsedMinutes: 9, ready: false, alreadyAcknowledged: false })).toBe("");
  });

  it("acknowledges once and never twice", () => {
    expect(respectTimeGuidance({ elapsedMinutes: 21, ready: true, alreadyAcknowledged: true })).toBe("");
  });

  it("when ready, states a foundation exists without promising anyone", () => {
    const g = respectTimeGuidance({ elapsedMinutes: RESPECT_TIME_MINUTES, ready: true, alreadyAcknowledged: false });
    expect(g).toMatch(/fifteen minutes/);
    expect(g).toMatch(/theirs to choose/);
    expect(g).toMatch(/Do not promise an introduction/);
  });

  it("when not ready, the clock does not manufacture readiness", () => {
    const g = respectTimeGuidance({ elapsedMinutes: 40, ready: false, alreadyAcknowledged: false });
    expect(g).toMatch(/WITHOUT CLAIMING READINESS/);
    expect(g).toMatch(/return whenever they like/);
    expect(g).not.toMatch(/promise a timeframe\.$/i.source ? /never-matching-sentinel/ : /x/);
  });

  it("reaching the time point does not close a conversation on its own", () => {
    expect(
      decidePacing({ ...base, elapsedMinutes: RESPECT_TIME_MINUTES, userTurns: 9, readinessMet: false }),
    ).not.toBe("offer_return");
  });
});

describe("readiness never contradicts itself", () => {
  const sig = understandingSignature({ satisfiedAreas: ["values", "lifestyle"], understoodCount: 9 });

  it("records what she held when she said she needed more", () => {
    const claim = resolveReadinessClaim({ ready: false, signature: sig, shortfallSignature: null });
    expect(claim.shortfallSignature).toBe(sig);
  });

  it("refuses to flip to ready when nothing qualifying has changed", () => {
    const claim = resolveReadinessClaim({ ready: true, signature: sig, shortfallSignature: sig });
    expect(claim.ready).toBe(false);
    expect(claim.suppressed).toBe(true);
  });

  it("allows readiness the moment real understanding is added", () => {
    const grown = understandingSignature({
      satisfiedAreas: ["values", "lifestyle", "attraction"],
      understoodCount: 11,
    });
    const claim = resolveReadinessClaim({ ready: true, signature: grown, shortfallSignature: sig });
    expect(claim.ready).toBe(true);
    expect(claim.shortfallSignature).toBeNull();
  });

  it("never invents readiness she does not hold", () => {
    expect(resolveReadinessClaim({ ready: false, signature: sig, shortfallSignature: null }).ready).toBe(false);
  });
});

describe("a member who wants to keep talking is not dismissed", () => {
  it("hears the wish to continue, and does not mistake it for leaving", () => {
    expect(memberWantsToContinue("I'd like to keep going")).toBe(true);
    expect(memberWantsToContinue("let's keep talking")).toBe(true);
    expect(memberWantsToContinue("I have to go")).toBe(false);
    expect(memberWantsToContinue("Yeah.")).toBe(false);
  });

  it("counts member turns since they asked to stay", () => {
    const msgs = [
      { role: "user", content: "I'd like to keep going" },
      { role: "assistant", content: "Gladly." },
      { role: "user", content: "My brother, mostly." },
    ];
    expect(turnsSinceContinueRequest(msgs)).toBe(1);
    expect(turnsSinceContinueRequest([{ role: "user", content: "sure" }])).toBeNull();
  });

  it("does not re-offer a close for at least four subsequent turns", () => {
    for (let since = 0; since < CONTINUE_SUPPRESSION_TURNS; since++) {
      expect(
        decidePacing({
          ...base,
          elapsedMinutes: 30,
          userTurns: 40,
          readinessMet: true,
          continueRequestedTurnsAgo: since,
        }),
      ).toBe("continue");
    }
  });

  it("still honours the member's own decision to stop, immediately", () => {
    expect(
      decidePacing({
        ...base,
        latestMemberMessage: "I have to go",
        elapsedMinutes: 30,
        userTurns: 40,
        readinessMet: true,
        continueRequestedTurnsAgo: 0,
      }),
    ).toBe("offer_return");
  });
});
