import { describe, expect, it } from "vitest";

import { summariseDecisions, type DecisionRow } from "./turn-decisions.server";

const row = (over: Partial<DecisionRow> = {}): DecisionRow => ({
  event: "ordinary",
  humor_level: "reserved",
  serious_moment: false,
  notice_deferred: false,
  atlas_ids: [],
  ...over,
});

describe("runtime observability", () => {
  it("handles an empty ledger", () => {
    const s = summariseDecisions([]);
    expect(s.turns).toBe(0);
    expect(s.seriousShare).toBe(0);
    expect(s.events).toEqual([]);
  });

  it("ranks the events she is actually recognising", () => {
    const s = summariseDecisions([
      row({ event: "joke" }),
      row({ event: "joke" }),
      row({ event: "ordinary" }),
    ]);
    expect(s.events[0]).toEqual({ event: "joke", count: 2, share: 0.667 });
  });

  it("counts serious moments and deferred notices", () => {
    const s = summariseDecisions([
      row({ serious_moment: true, notice_deferred: true }),
      row(),
      row({ notice_deferred: true }),
      row(),
    ]);
    expect(s.seriousShare).toBe(0.25);
    expect(s.noticesDeferred).toBe(2);
  });

  it("surfaces the human territory members are actually in", () => {
    const s = summariseDecisions([
      row({ atlas_ids: ["loneliness", "money-debt"] }),
      row({ atlas_ids: ["loneliness"] }),
      row({ atlas_ids: null }),
    ]);
    expect(s.atlasTopics[0]).toEqual({ id: "loneliness", count: 2 });
  });

  it("summarises registers", () => {
    const s = summariseDecisions([row({ humor_level: "playful" }), row({ humor_level: "playful" })]);
    expect(s.registers[0]).toEqual({ level: "playful", count: 2, share: 1 });
  });
});
