// ATHENA V1 — FOUNDATIONAL COMPLETION AT MINIMUM READINESS.
//
// The foundational conversation reaches a threshold; it does not collect
// everything obtainable. Once the server-side minimum is genuinely held, the
// conversation closes warmly and briefly, and everything further is learned in
// ordinary ongoing conversation.
import { describe, it, expect } from "vitest";
import { decidePacing, MIN_MINUTES_BEFORE_CLOSE } from "./pacing";

const base = {
  reply: "That makes sense.",
  latestMemberMessage: "Yeah.",
  breadthSufficient: true,
};

describe("completion at minimum readiness", () => {
  it("closes as soon as the minimum is met, without serving out the clock", () => {
    expect(decidePacing({ ...base, elapsedMinutes: 17, userTurns: 14, readinessMet: true })).toBe("offer_return");
  });

  it("does not keep gathering merely because more understanding is available", () => {
    const stillIntaking = decidePacing({ ...base, elapsedMinutes: 30, userTurns: 40, readinessMet: true });
    expect(stillIntaking).toBe("offer_return");
  });

  it("never closes on readiness that has not actually been reached", () => {
    expect(decidePacing({ ...base, elapsedMinutes: 8, userTurns: 6, readinessMet: false })).toBe("continue");
    expect(decidePacing({ ...base, elapsedMinutes: 8, userTurns: 6 })).toBe("continue");
  });

  it("the time floor still protects an unready member from being rushed", () => {
    expect(
      decidePacing({ ...base, elapsedMinutes: MIN_MINUTES_BEFORE_CLOSE - 1, userTurns: 30, readinessMet: false }),
    ).not.toBe("offer_return");
  });

  it("readiness never overrides breadth for a member who is not yet ready", () => {
    const r = decidePacing({
      ...base,
      breadthSufficient: false,
      elapsedMinutes: 21,
      userTurns: 20,
      readinessMet: false,
    });
    expect(r).toBe("wind_down");
  });

  it("a member who asks to stop is honoured whether ready or not", () => {
    for (const readinessMet of [true, false]) {
      expect(
        decidePacing({
          ...base,
          latestMemberMessage: "I have to go",
          elapsedMinutes: 3,
          userTurns: 2,
          readinessMet,
        }),
      ).toBe("offer_return");
    }
  });
});
