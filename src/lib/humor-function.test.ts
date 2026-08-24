import { describe, expect, it } from "vitest";
import {
  CLOSET_DOCTRINE,
  HUMOR_FUNCTION_DOCTRINE,
  closetAvailable,
  detectClosetInvocation,
  humorGuidanceBlock,
} from "./humor-function";
import { derivePermission, type StyleEvidence } from "./conversational-aliveness";
import { conversationRuntime } from "./conversation-runtime";
import { closetMetrics, closetPhenomenonNote, type ClosetEvent } from "./closet";

const style = (o: Partial<StyleEvidence> = {}): StyleEvidence => ({
  profanityTurns: 0,
  humorTurns: 0,
  teasingTurns: 0,
  selfDeprecationTurns: 0,
  directnessTurns: 0,
  memberTurns: 0,
  ...o,
});

const playful = derivePermission(style({ humorTurns: 4, teasingTurns: 2, memberTurns: 12 }));

describe("humour function", () => {
  it("is always present in the member-facing runtime", () => {
    const plan = conversationRuntime({
      memberText: "we finally booked the trip",
      style: style(),
      isFoundational: false,
    });
    expect(plan.block).toContain("HUMOUR — FUNCTION BEFORE DELIVERY");
  });

  it("names the legitimate functions and the misuses", () => {
    expect(HUMOR_FUNCTION_DOCTRINE).toContain("tension release");
    expect(HUMOR_FUNCTION_DOCTRINE).toContain("humiliation");
    expect(HUMOR_FUNCTION_DOCTRINE).toContain("minimizing pain");
  });
});

describe("the closet", () => {
  it("stays shut with a new member", () => {
    expect(closetAvailable({ permission: derivePermission(style()), isFoundational: true })).toBe(
      false,
    );
  });

  it("stays shut in a serious moment even with deep rapport", () => {
    const p = derivePermission(style({ humorTurns: 4, teasingTurns: 2 }), true);
    expect(closetAvailable({ permission: p, isFoundational: false, memberInvoked: true })).toBe(
      false,
    );
  });

  it("opens only where rapport is genuinely established", () => {
    expect(closetAvailable({ permission: playful, isFoundational: false })).toBe(true);
    expect(humorGuidanceBlock({ permission: playful, isFoundational: false })).toContain(
      CLOSET_DOCTRINE,
    );
  });

  it("notices when a member asks about it", () => {
    expect(detectClosetInvocation("go on, open the closet")).toBe(true);
    expect(detectClosetInvocation("what did you do this weekend")).toBe(false);
  });

  it("never appears during a serious disclosure", () => {
    const plan = conversationRuntime({
      memberText: "my mother died in March and I still can't say it out loud",
      style: style({ humorTurns: 6, teasingTurns: 3, memberTurns: 30 }),
      isFoundational: false,
    });
    expect(plan.block).not.toContain("THE CLOSET");
    expect(plan.closetAvailable).toBe(false);
  });
});

describe("closet metrics", () => {
  const events: ClosetEvent[] = [
    { user_id: "a", kind: "closet_impression", surface: "conversation", had_rapport: true },
    { user_id: "a", kind: "closet_click", surface: "conversation", had_rapport: true },
    { user_id: "a", kind: "closet_click", surface: "conversation", had_rapport: true },
    { user_id: "b", kind: "closet_impression", surface: "conversation", had_rapport: false },
    { user_id: "c", kind: "closet_impression", surface: "member_asked", had_rapport: true },
  ];

  it("answers the founder's questions", () => {
    const m = closetMetrics(events);
    expect(m.impressions).toBe(3);
    expect(m.clicks).toBe(2);
    expect(m.uniqueShown).toBe(3);
    expect(m.uniqueClicked).toBe(1);
    expect(m.repeatClickRate).toBe(1);
    expect(m.rapport.withRapport.clicks).toBe(2);
    expect(m.rapport.withoutRapport.clicks).toBe(0);
    expect(m.memberInitiated.uniqueMembers).toBe(1);
  });

  it("only raises a phenomenon once several members ask unprompted", () => {
    expect(closetPhenomenonNote(closetMetrics(events))).toBeNull();
    const many: ClosetEvent[] = Array.from({ length: 6 }, (_, i) => ({
      user_id: `m${i}`,
      kind: "closet_impression" as const,
      surface: "member_asked" as const,
      had_rapport: true,
    }));
    expect(closetPhenomenonNote(closetMetrics(many))).toContain("experiment");
  });
});
