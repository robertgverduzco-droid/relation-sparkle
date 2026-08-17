// Experience regression suite — Relationship Journey holds.
//
// Binding decisions X-01 / F-30: a chosen pause never expires the member back
// into matchmaking. Only a deliberate resume releases the hold. These tests
// exist so that behaviour cannot silently revert.
//
//   bunx vitest run
import { describe, it, expect } from "vitest";
import {
  matchmakingHold,
  restPeriodElapsed,
  REST_ELAPSED_INVITATION,
} from "./relationship.server";

type Row = {
  id: string;
  connection_id: string | null;
  choice: "rest" | "resume" | "talk" | null;
  hold_until: string | null;
  created_at: string;
};

/** Minimal supabase stub: no focus rows, one optional open transition. */
function stubClient(transition: Row | null) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const chain = new Proxy(builder, {
        get(_t, prop) {
          if (prop === "maybeSingle") {
            return async () => ({ data: table === "member_transitions" ? transition : null });
          }
          if (prop === "limit") return async () => ({ data: [] });
          if (prop === "then") return undefined;
          return () => chain;
        },
      });
      return chain;
    },
  } as never;
}

const iso = (deltaDays: number) => new Date(Date.now() + deltaDays * 864e5).toISOString();

const restRow = (holdUntil: string | null): Row => ({
  id: "t1",
  connection_id: "c1",
  choice: "rest",
  hold_until: holdUntil,
  created_at: iso(-40),
});

describe("rest / pause never silently expires (X-01, F-30)", () => {
  it("holds matchmaking while the chosen rest period is still running", async () => {
    const hold = await matchmakingHold(stubClient(restRow(iso(10))), "u1");
    expect(hold.held).toBe(true);
    expect(hold.reason).toBe("resting");
  });

  it("STILL holds matchmaking after the rest period has elapsed", async () => {
    const hold = await matchmakingHold(stubClient(restRow(iso(-1))), "u1");
    expect(hold.held).toBe(true);
    expect(hold.reason).toBe("rest_elapsed_awaiting_choice");
  });

  it("only a deliberate resume releases the hold", async () => {
    const hold = await matchmakingHold(
      stubClient({ ...restRow(null), choice: "resume" }),
      "u1",
    );
    expect(hold.held).toBe(false);
  });

  it("holds while the member has made no choice, or asked to talk first", async () => {
    expect((await matchmakingHold(stubClient({ ...restRow(null), choice: null }), "u1")).held).toBe(
      true,
    );
    expect(
      (await matchmakingHold(stubClient({ ...restRow(null), choice: "talk" }), "u1")).held,
    ).toBe(true);
  });

  it("does not hold when there is no open transition at all", async () => {
    expect((await matchmakingHold(stubClient(null), "u1")).held).toBe(false);
  });

  it("marks an elapsed rest period without releasing it", () => {
    expect(restPeriodElapsed({ choice: "rest", hold_until: iso(-1) })).toBe(true);
    expect(restPeriodElapsed({ choice: "rest", hold_until: iso(1) })).toBe(false);
    expect(restPeriodElapsed({ choice: "resume", hold_until: iso(-1) })).toBe(false);
  });

  it("invites without pressure, urgency, or engagement language", () => {
    const copy = REST_ELAPSED_INVITATION.toLowerCase();
    for (const word of [
      "don't miss",
      "in a hurry",
      "act now",
      "limited",
      "waiting for you",
      "come back",
      "!",
    ]) {
      expect(copy).not.toContain(word);
    }
    expect(copy).toContain("no hurry");
  });
});
