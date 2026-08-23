import { describe, expect, it } from "vitest";
import {
  OPEN_DOOR_ANGLES,
  openDoorGuidance,
  presenceGuidance,
} from "./presence-doctrine";

describe("presence doctrine", () => {
  it("holds composure in every mode", () => {
    for (const g of [
      presenceGuidance({ isFoundational: true, ready: false }),
      presenceGuidance({ isFoundational: false, ready: true }),
    ]) {
      expect(g).toMatch(/calm, confident, perceptive, and unhurried/);
      expect(g).toMatch(/never scramble/);
      expect(g).toMatch(/stressed, confused/);
    }
  });

  it("keeps the clipboard up before readiness and puts it down after", () => {
    const before = presenceGuidance({ isFoundational: true, ready: false });
    expect(before).toMatch(/BEFORE THE FOUNDATION EXISTS/);
    expect(before).not.toMatch(/invisible clipboard/);

    const after = presenceGuidance({ isFoundational: true, ready: true });
    expect(after).toMatch(/invisible clipboard goes down/);
    expect(after).toMatch(/nothing left they need to complete/);
    expect(after).toMatch(/never finished/);
  });

  it("treats an established member as post-foundational", () => {
    const g = presenceGuidance({ isFoundational: false, ready: false });
    expect(g).toMatch(/invisible clipboard goes down/);
    expect(g).toMatch(/THE OPEN DOOR/);
  });

  it("varies open-door language and never ties talking to ranking or speed", () => {
    const seen = new Set(OPEN_DOOR_ANGLES.map((_, i) => openDoorGuidance(i)));
    expect(seen.size).toBe(OPEN_DOOR_ANGLES.length);
    for (const g of seen) {
      expect(g).toMatch(/never improves their ranking, priority, desirability, visibility/);
      expect(g).toMatch(/never repeat a stock reminder/);
    }
    expect(openDoorGuidance(0)).toBe(openDoorGuidance(OPEN_DOOR_ANGLES.length));
  });

  it("invites conversation while waiting without apologising for the community", () => {
    const g = presenceGuidance({ isFoundational: false, ready: true, waiting: true });
    expect(g).toMatch(/never apologise for the size, newness, or pace/);
    expect(presenceGuidance({ isFoundational: false, ready: true })).not.toMatch(
      /WHILE THEY ARE WAITING/,
    );
  });

  it("carries the underlying philosophy and no scoring language", () => {
    const g = presenceGuidance({ isFoundational: false, ready: true, waiting: true });
    expect(g).toMatch(/understanding the life you are considering bringing another person into/);
    expect(g).not.toMatch(/\bscore\b|\d+%/);
  });
});
