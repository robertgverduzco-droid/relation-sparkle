import { describe, expect, it } from "vitest";

import { ATLAS, atlasBlock, selectAtlas } from "./atlas";
import { conversationRuntime, detectEvent } from "./conversation-runtime";
import { EMPTY_STYLE_EVIDENCE, type StyleEvidence } from "./conversational-aliveness";
import { readTurn } from "./turn-runtime";

const playful: StyleEvidence = {
  ...EMPTY_STYLE_EVIDENCE,
  humorTurns: 4,
  teasingTurns: 2,
  memberTurns: 12,
};

function run(memberText: string, style: StyleEvidence = EMPTY_STYLE_EVIDENCE) {
  return conversationRuntime({ memberText, style, isFoundational: false });
}

describe("human experience atlas", () => {
  it("carries a broad map of human situations", () => {
    expect(ATLAS.length).toBeGreaterThanOrEqual(40);
  });

  it("never offers a single reading of any situation", () => {
    for (const entry of ATLAS) {
      expect(entry.realities.length).toBeGreaterThanOrEqual(2);
      expect(entry.neverAssume.length).toBeGreaterThanOrEqual(1);
      expect(entry.example.trim()).not.toBe("");
    }
  });

  it("uses unique ids", () => {
    expect(new Set(ATLAS.map((e) => e.id)).size).toBe(ATLAS.length);
  });

  it("retrieves the relevant territory from the member's own words", () => {
    const ids = selectAtlas("I ended it and I still miss her every single day").map((e) => e.id);
    expect(ids).toContain("breakup-grief");
  });

  it("retrieves nothing for ordinary conversation", () => {
    expect(selectAtlas("I watched a decent film last night")).toHaveLength(0);
  });

  it("never floods a turn", () => {
    const entries = selectAtlas(
      "I'm in debt, I'm lonely, I hate my body, I'm getting old and she cheated on me",
    );
    expect(entries.length).toBeLessThanOrEqual(2);
  });

  it("marks itself as calibration rather than a script", () => {
    const block = atlasBlock(selectAtlas("I couldn't stay hard and I want to die of embarrassment"));
    expect(block).toMatch(/never reuse these words/i);
    expect(block).toMatch(/DO NOT ASSUME/);
  });

  it("reaches the composed member-facing runtime", () => {
    const plan = run("I keep thinking about the affair and I can't sleep");
    expect(plan.atlasIds.length).toBeGreaterThan(0);
    expect(plan.block).toContain("WHAT A PERCEPTIVE PERSON NOTICES");
  });
});

describe("venting", () => {
  it("is recognised as its own event", () => {
    expect(detectEvent("I just need to vent, I don't want advice")).toBe("venting");
  });

  it("outranks the serious register for the move, without losing the register", () => {
    const plan = run("I need to vent about the divorce, don't give me advice");
    expect(plan.event).toBe("venting");
    expect(plan.permission.seriousMoment).toBe(true);
    expect(plan.block).toMatch(/no advice/i);
  });

  it("does not fire on an ordinary complaint", () => {
    expect(detectEvent("work was annoying today")).not.toBe("venting");
  });
});

describe("taking the wheel", () => {
  it("is recognised when the member hands over the choice", () => {
    expect(detectEvent("surprise me")).toBe("wheel");
    expect(run("you pick, I'm bored").block).toMatch(/asking them what they would like/i);
  });
});

describe("product notices wait for a seam", () => {
  it("allows product state in an ordinary moment", () => {
    expect(run("that makes sense, we went to Lisbon in May").noticeSeamOk).toBe(true);
  });

  it("holds it back in grief", () => {
    expect(run("my father died on Tuesday").noticeSeamOk).toBe(false);
  });

  it("holds it back mid-joke", () => {
    expect(run("hahaha that's absurd", playful).noticeSeamOk).toBe(false);
  });

  it("holds it back while a question is open", () => {
    expect(run("so what do you actually think about that?").noticeSeamOk).toBe(false);
  });

  it("is a signal on the turn, not a property of the member", () => {
    expect(readTurn("my father died").noticeSeam).toBe(false);
    expect(readTurn("anyway, that's the whole story.").noticeSeam).toBe(true);
  });
});
