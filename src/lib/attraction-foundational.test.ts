import { describe, expect, it } from "vitest";
import {
  assessAttraction,
  assessCoverage,
  attractionGuidance,
  breadthNudge,
  foundationalGuidance,
  REQUIRED_DOMAINS,
  type Turn,
} from "./foundational";
import { decidePacing } from "./pacing";

const ASK = {
  role: "assistant",
  content: "When you think about someone you've been drawn to — what is it physically that pulls you in? Say it however it comes.",
};

/** A generic broad conversation that satisfies breadth apart from attraction. */
const BROAD: Turn[] = [
  { role: "assistant", content: "What are you hoping to find?" },
  { role: "user", content: "Something long-term, a real partnership." },
  { role: "assistant", content: "What matters most to you?" },
  { role: "user", content: "Honesty and loyalty, mostly — those are my values." },
  { role: "assistant", content: "How do you handle disagreement?" },
  { role: "user", content: "I talk things through. I hate an argument that festers." },
  { role: "assistant", content: "Tell me about your people." },
  { role: "user", content: "Close to my family — my sister especially. Good friends, small circle." },
  { role: "assistant", content: "And work?" },
  { role: "user", content: "My career matters to me, I'm pretty driven." },
  { role: "assistant", content: "What do you do with your free time?" },
  { role: "user", content: "Reading, hiking, cooking. That's my weekend routine." },
  { role: "assistant", content: "What makes you feel understood?" },
  { role: "user", content: "Being heard without someone rushing to fix me." },
  { role: "assistant", content: "How do you show affection?" },
  { role: "user", content: "Physically close, lots of small touch. That's my love language." },
];

describe("attraction is a required foundational domain", () => {
  it("is declared required", () => {
    expect(REQUIRED_DOMAINS).toContain("attraction");
  });

  it("cannot be silently skipped: broad coverage without it is not sufficient", () => {
    const state = assessCoverage(BROAD);
    expect(state.covered.length).toBeGreaterThanOrEqual(8);
    expect(state.missingRequired).toEqual(["attraction"]);
    expect(state.breadthSufficient).toBe(false);
  });

  it("becomes sufficient once Athena asks and the member answers", () => {
    const state = assessCoverage([
      ...BROAD,
      ASK,
      { role: "user", content: "Honestly, kind eyes and someone who takes care of themselves." },
    ]);
    expect(state.missingRequired).toEqual([]);
    expect(state.breadthSufficient).toBe(true);
  });

  it("holds the graceful close open while attraction is unmet", () => {
    const unmet = decidePacing({
      elapsedMinutes: 21,
      userTurns: 14,
      reply: "This feels like a good place to pause.",
      latestMemberMessage: "sure",
      breadthSufficient: false,
    });
    expect(unmet).not.toBe("offer_return");
  });
});

describe("member profiles", () => {
  it("very broad attraction", () => {
    const s = assessAttraction([ASK, { role: "user", content: "I'm attracted to all sorts of people, honestly." }]);
    expect(s.satisfied).toBe(true);
    expect(s.needsClarification).toBe(false);
  });

  it("several preferences", () => {
    const s = assessAttraction([
      ASK,
      { role: "user", content: "I like dark hair, someone expressive, a bit of style in how they dress." },
    ]);
    expect(s.satisfied).toBe(true);
    expect(s.strengthSignal).toBe(false);
  });

  it("one strong physical constraint earns exactly one clarification", () => {
    const first = assessAttraction([
      ASK,
      { role: "user", content: "I have to be attracted to someone's build — it's a dealbreaker for me." },
    ]);
    expect(first.satisfied).toBe(true);
    expect(first.strengthSignal).toBe(true);
    expect(first.needsClarification).toBe(true);
    expect(attractionGuidance(first)).toMatch(/one gentle clarifying question/i);

    const after = assessAttraction([
      ASK,
      { role: "user", content: "I have to be attracted to someone's build — it's a dealbreaker for me." },
      { role: "assistant", content: "Is that something that shapes attraction strongly, or something outside of which attraction really isn't there for you?" },
      { role: "user", content: "The second one, I think." },
    ]);
    expect(after.needsClarification).toBe(false);
  });

  it("attraction that develops through emotional connection", () => {
    const s = assessAttraction([
      ASK,
      { role: "user", content: "It's never immediate for me — it grows on me once I know someone." },
    ]);
    expect(s.satisfied).toBe(true);
    expect(s.developsOverTime).toBe(true);
  });

  it("member initially unsure how to describe their type", () => {
    const s = assessAttraction([ASK, { role: "user", content: "Hmm. I've never really thought about it, hard to say." }]);
    expect(s.satisfied).toBe(true);
    expect(s.noMeaningfulPreference).toBe(true);
  });

  it("appearance barely matters — a complete answer", () => {
    const s = assessAttraction([ASK, { role: "user", content: "Appearance barely matters to me, honestly." }]);
    expect(s.satisfied).toBe(true);
    expect(assessCoverage([...BROAD, ASK, { role: "user", content: "Appearance barely matters to me, honestly." }]).breadthSufficient).toBe(true);
  });

  it("terse member — a short answer still satisfies the requirement", () => {
    const s = assessAttraction([ASK, { role: "user", content: "Not really." }]);
    expect(s.satisfied).toBe(true);
    expect(s.noMeaningfulPreference).toBe(true);
  });

  it("silence does not satisfy it", () => {
    expect(assessAttraction([ASK]).satisfied).toBe(false);
    expect(assessAttraction([ASK, { role: "user", content: "   " }]).satisfied).toBe(false);
  });
});

describe("guidance is conversational, never a specification form", () => {
  const unmet = assessAttraction([]);
  const text = attractionGuidance(unmet);

  it("forbids a physical checklist", () => {
    expect(text).toMatch(/never work through a specification list/i);
    expect(text).toMatch(/no height, weight, body type, hair, ethnicity, age/i);
  });

  it("forbids moralising, shaming or changing the preference", () => {
    expect(text).toMatch(/never moralise, shame, praise, flatter, diagnose/i);
  });

  it("never introduces scores, rankings or ratings", () => {
    expect(text.toLowerCase()).not.toMatch(/\b(score|rating|rank|percent|\d+ ?\/ ?10)\b/);
  });

  it("never introduces swipe or catalog mechanics", () => {
    expect(text.toLowerCase()).not.toMatch(/\b(swipe|browse|catalog|vote|shortlist)\b/);
  });

  it("is present in the foundational instruction block", () => {
    const block = foundationalGuidance(assessCoverage(BROAD));
    expect(block).toMatch(/PHYSICAL ATTRACTION — REQUIRED IN THIS CONVERSATION/);
    expect(block).toMatch(/you have not yet raised physical attraction/i);
  });

  it("stops pressing once the requirement is met", () => {
    const met = assessAttraction([ASK, { role: "user", content: "Not really." }]);
    expect(attractionGuidance(met)).toMatch(/do not return to it again/i);
    expect(
      breadthNudge(assessCoverage([...BROAD, ASK, { role: "user", content: "Not really." }])),
    ).toBeNull();
  });

  it("nudges spoken mode when attraction is still unmet late in the conversation", () => {
    const nudge = breadthNudge(assessCoverage(BROAD));
    expect(nudge).toMatch(/what draws them to someone physically/i);
    expect(nudge).toMatch(/without a checklist/i);
  });
});
