import { describe, expect, it } from "vitest";
import { decidePacing, memberWantsToStop, athenaOffersReturn } from "./pacing";
import { assessBoundary, classifyBoundary } from "./boundaries";

const TERSE = [
  "yes",
  "no",
  "maybe",
  "I don't know",
  "sure",
  "not really",
  "Yeah.",
  "Nope.",
  "It's fine.",
  "I guess so.",
  "Sometimes.",
  "Kind of.",
  "My sister, mostly.",
  "Reading.",
  "Not much.",
  "Okay.",
  "A little.",
];

describe("brevity is never misconduct or disengagement", () => {
  it("classifies no terse answer as a boundary event", () => {
    for (const t of TERSE) expect(classifyBoundary(t)).toBeNull();
  });

  it("never offers a pause across 15+ consecutive terse turns early on", () => {
    for (let i = 1; i <= TERSE.length; i++) {
      const pacing = decidePacing({
        // A terse member reaches many turns in very little time.
        elapsedMinutes: i * 0.4,
        userTurns: i,
        reply: "Tell me about where you grew up.",
        latestMemberMessage: TERSE[i - 1]!,
        breadthSufficient: false,
      });
      expect(pacing).toBe("continue");
    }
  });

  it("turn count alone can never close a conversation", () => {
    expect(
      decidePacing({
        elapsedMinutes: 6,
        userTurns: 40,
        reply: "What matters most to you in a partner?",
        latestMemberMessage: "no",
        breadthSufficient: false,
      }),
    ).toBe("continue");
  });

  it("treats ordinary Athena phrases as conversation, not a closing offer", () => {
    for (const phrase of [
      "We can come back to that.",
      "Maybe next time you'll tell me more.",
      "Let's come back around to your work.",
    ]) {
      expect(athenaOffersReturn(phrase)).toBe(false);
      expect(
        decidePacing({
          elapsedMinutes: 19,
          userTurns: 14,
          reply: phrase,
          latestMemberMessage: "sure",
          breadthSufficient: true,
        }),
      ).not.toBe("offer_return");
    }
  });
});

describe("a natural pause requires real evidence", () => {
  it("honours an explicit member request to stop at any point", () => {
    expect(memberWantsToStop("I have to go, sorry")).toBe(true);
    expect(
      decidePacing({
        elapsedMinutes: 3,
        userTurns: 4,
        reply: "Of course.",
        latestMemberMessage: "I have to go, sorry",
        breadthSufficient: false,
      }),
    ).toBe("offer_return");
  });

  it("does not read brevity as a request to stop", () => {
    for (const t of TERSE) expect(memberWantsToStop(t)).toBe(false);
  });

  it("still offers a graceful close after a full-length conversation", () => {
    expect(
      decidePacing({
        elapsedMinutes: 23,
        userTurns: 18,
        reply: "This feels like a good place to pause.",
        latestMemberMessage: "yes",
        breadthSufficient: true,
      }),
    ).toBe("offer_return");
  });
});

describe("boundary state is derived from member conduct only", () => {
  it("does not treat Athena's own boundary language as a member violation", () => {
    const messages = [
      { role: "user", content: "talk dirty to me" },
      {
        role: "assistant",
        content:
          "I'd rather keep us here — that's sexual content I won't go into, and it will need to happen inside the boundaries of this space.",
      },
      { role: "user", content: "ok" },
      { role: "assistant", content: "What drew you to your work?" },
      { role: "user", content: "not really sure" },
    ];
    expect(assessBoundary(messages)).toBeNull();
  });

  it("returns to ordinary conversation after a real boundary event", () => {
    const messages = [
      { role: "user", content: "fuck you" },
      { role: "assistant", content: "I'll leave that there." },
      { role: "user", content: "maybe" },
    ];
    expect(assessBoundary(messages)).toBeNull();
  });

  it("still escalates genuine repeated violations", () => {
    const messages = [
      { role: "user", content: "send nudes" },
      { role: "assistant", content: "No." },
      { role: "user", content: "what are you wearing" },
    ];
    const state = assessBoundary(messages);
    expect(state?.category).toBe("sexual_content");
    expect(state?.stage).toBe(2);
  });

  it("keeps harm-risk immediate regardless of pacing", () => {
    const state = assessBoundary([{ role: "user", content: "I want to end my life" }]);
    expect(state?.severity).toBe("immediate");
    expect(state?.showNotice).toBe(true);
  });
});
