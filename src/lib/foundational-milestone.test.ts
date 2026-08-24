// ATHENA V1 — RETURNING CONVERSATION / CLOSING-SHEET REGRESSION
//
// Foundational readiness is a MILESTONE, not a recurring conversation gate.
// A returning member saying "Hey I'm back, how are you?" must land in an
// ordinary continuing conversation — never in a pause/finish sheet.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isFoundationalSession,
  isLegacyCrossedFoundation,
  mayOfferFoundationalClose,
  MILESTONE_ARCHITECTURE_AT,
} from "./foundational-milestone";
import { decidePacing } from "./pacing";
import { assessFoundationalReadiness } from "./introduction-readiness";

const route = readFileSync("src/routes/_authenticated/athena.tsx", "utf8");
const server = readFileSync("src/lib/athena.functions.ts", "utf8");

/** A member who has genuinely reached foundational readiness. */
const readyFacets = [
  "partnership_vision",
  "core_values",
  "communication_style",
  "lifestyle",
  "attachment_tendencies",
  "boundaries",
  "physical_attraction_preferences",
  "purpose_and_ambition",
  "conflict_style",
  "social_and_family",
  "life_direction",
  "temperament_mode",
  "nervous_system_pattern",
].map((facet_key) => ({
  facet_key,
  understanding: "A substantive paragraph of Athena's own understanding of them.",
  confidence: 0.7,
}));

describe("A. the once-ever pause belongs to the first foundational conversation", () => {
  it("is a foundational session while nothing has been completed or delivered", () => {
    expect(isFoundationalSession({ completedAt: null, milestoneAt: null })).toBe(true);
  });

  it("may offer the close exactly when readiness lands inside that session", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: true,
        readinessMet: true,
        offeredThisConversation: false,
      }),
    ).toBe(true);
  });
});

describe("B. 'Keep talking' suppresses any repeat", () => {
  it("does not offer the close again later in the same conversation", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: true,
        readinessMet: true,
        offeredThisConversation: true,
      }),
    ).toBe(false);
  });

  it("the milestone is consumed when the sheet appears, not when it is dismissed", () => {
    // Choosing "Keep talking" therefore cannot resurrect it on a later turn.
    expect(route).toMatch(/setShowClosingCard\(true\);[\s\S]{0,240}markMilestone/);
  });

  it("pacing still honours a member who asked to keep going", () => {
    expect(
      decidePacing({
        reply: "That makes sense.",
        latestMemberMessage: "Tell me more",
        breadthSufficient: true,
        elapsedMinutes: 30,
        userTurns: 25,
        readinessMet: true,
        continueRequestedTurnsAgo: 1,
      }),
    ).toBe("continue");
  });
});

describe("C/E/F. returning, reloading, and other devices never recreate the sheet", () => {
  it("a delivered milestone ends foundational mode for every later session", () => {
    expect(
      isFoundationalSession({ completedAt: null, milestoneAt: "2026-08-23T00:00:00Z" }),
    ).toBe(false);
  });

  it("a completed foundational conversation is likewise never foundational again", () => {
    expect(isFoundationalSession({ completedAt: "2026-08-01T00:00:00Z", milestoneAt: null })).toBe(false);
  });

  it("no close may be offered once the session is no longer foundational, however ready", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: false,
        readinessMet: true,
        offeredThisConversation: false,
      }),
    ).toBe(false);
  });

  it("the state is server-backed on the member's own row, never localStorage", () => {
    expect(server).toMatch(/foundational_milestone_at/);
    expect(route).toMatch(/select\("messages, completed_at, foundational_milestone_at, created_at"\)/);
    expect(route).not.toMatch(/localStorage[\s\S]{0,80}milestone/i);
  });
});

describe("D. an ordinary returning turn is never interrupted", () => {
  it("readiness alone cannot close a conversation that is not foundational", () => {
    const pacing = decidePacing({
      reply: "Good to see you.",
      latestMemberMessage: "Hey I'm back, how are you?",
      breadthSufficient: true,
      elapsedMinutes: 0.2,
      userTurns: 1,
      // The server passes `isFoundational && readyNow`; outside the
      // foundational session this is false by construction.
      readinessMet: false,
    });
    expect(pacing).toBe("continue");
  });

  it("the server derives foundational mode from the milestone, not from readiness", () => {
    expect(server).toMatch(/isFoundationalSession\(\{/);
    expect(server).toMatch(/readinessMet: isFoundational && readyNow/);
  });
});

describe("G. accounts are independent", () => {
  it("milestone state is keyed to the caller's own row only", () => {
    const fn = server.slice(server.indexOf("markFoundationalMilestone"));
    expect(fn).toMatch(/\.eq\("user_id", userId\)/);
    expect(fn).toMatch(/\.is\("foundational_milestone_at", null\)/);
  });

  it("the client re-reads it per account on hydration", () => {
    expect(route).toMatch(/foundationalSessionRef\.current = isFoundationalSession\(\{/);
    expect(route).toMatch(/sessionCreatedAt: session\?\.created_at/);
  });
});

describe("H. matchmaking readiness is untouched", () => {
  it("stays true regardless of the conversation lifecycle", () => {
    expect(assessFoundationalReadiness(readyFacets).ready).toBe(true);
  });

  it("the milestone write never touches completed_at, readiness or matchmaking", () => {
    const fn = server.slice(
      server.indexOf("markFoundationalMilestone"),
      server.indexOf("Persist the foundational transcript"),
    );
    expect(fn).not.toMatch(/completed_at/);
    expect(fn).not.toMatch(/evaluateReadiness|runMatchmakingForUser/);
  });
});

describe("I. continuing conversation keeps deepening understanding", () => {
  it("reflection is not gated on the foundational session", () => {
    expect(route).toMatch(/reflect\(\{ data: \{ messages: withReply \} \}\)/);
  });
});

describe("J. members who are not ready keep the early-exit experience", () => {
  it("an unready member still gets the readiness sheet, not the finish sheet", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: true,
        readinessMet: false,
        offeredThisConversation: false,
      }),
    ).toBe(false);
    expect(route).toMatch(/setShowReadinessSheet\(true\)/);
  });

  it("the early-exit path does not consume the once-ever milestone", () => {
    const branch = route.slice(route.indexOf("} else {", route.indexOf("setShowClosingCard(true)")));
    const untilEnd = branch.slice(0, branch.indexOf("}", branch.indexOf("setShowReadinessSheet(true)")));
    expect(untilEnd).not.toMatch(/markMilestone/);
  });

  it("an unready member is still not rushed out by the clock", () => {
    expect(
      decidePacing({
        reply: "Tell me more about that.",
        latestMemberMessage: "Sure.",
        breadthSufficient: false,
        elapsedMinutes: 8,
        userTurns: 6,
        readinessMet: false,
      }),
    ).toBe("continue");
  });
});


// ---------------------------------------------------------------------------
// LIVE REGRESSION — legacy accounts that reached readiness BEFORE the
// `foundational_milestone_at` column existed were left NULL by the migration,
// so their first return after deployment re-delivered the once-ever sheet.
// ---------------------------------------------------------------------------
const legacyCreatedAt = new Date(MILESTONE_ARCHITECTURE_AT - 5 * 864e5).toISOString();
const newCreatedAt = new Date(MILESTONE_ARCHITECTURE_AT + 60_000).toISOString();

describe("K. legacy member: ready before the marker existed", () => {
  const legacyRow = {
    completedAt: null,
    milestoneAt: null,
    sessionCreatedAt: legacyCreatedAt,
    memberAlreadyReady: true,
  };

  it("is recognised as having already crossed the foundation", () => {
    expect(isLegacyCrossedFoundation(legacyRow)).toBe(true);
  });

  it("returning after the migration is an ordinary continuing conversation", () => {
    expect(isFoundationalSession(legacyRow)).toBe(false);
  });

  it("the closing sheet can never be offered to them, however ready", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: isFoundationalSession(legacyRow),
        readinessMet: true,
        offeredThisConversation: false,
      }),
    ).toBe(false);
  });

  it("the server self-heals the marker instead of relying on the backfill alone", () => {
    expect(server).toMatch(/isLegacyCrossedFoundation\(\{/);
    const heal = server.slice(server.indexOf("const legacyCrossed"));
    expect(heal).toMatch(/foundational_milestone_at: new Date\(\)\.toISOString\(\)/);
    expect(heal.slice(0, 1200)).toMatch(/\.is\("foundational_milestone_at", null\)/);
  });

  it("nothing in the legacy path resets readiness, completion or intake", () => {
    const heal = server.slice(server.indexOf("const legacyCrossed"), server.indexOf("Breadth-first orchestration"));
    expect(heal).not.toMatch(/completed_at/);
    expect(heal).not.toMatch(/evaluateReadiness|runMatchmakingForUser|messages:/);
  });
});

describe("L. the legacy rule is narrow", () => {
  it("a legacy member who never reached readiness still gets their milestone", () => {
    expect(
      isFoundationalSession({
        completedAt: null,
        milestoneAt: null,
        sessionCreatedAt: legacyCreatedAt,
        memberAlreadyReady: false,
      }),
    ).toBe(true);
  });

  it("a genuinely new member is unaffected even once ready", () => {
    expect(
      isFoundationalSession({
        completedAt: null,
        milestoneAt: null,
        sessionCreatedAt: newCreatedAt,
        memberAlreadyReady: true,
      }),
    ).toBe(true);
  });

  it("a new member still experiences the milestone exactly once", () => {
    expect(
      mayOfferFoundationalClose({
        foundationalSession: true,
        readinessMet: true,
        offeredThisConversation: false,
      }),
    ).toBe(true);
  });
});

describe("M. one canonical eligibility rule", () => {
  it("both the text and voice server paths use it", () => {
    const live = readFileSync("src/lib/athena-live.server.ts", "utf8");
    expect(live).toMatch(/isFoundationalSession\(\{/);
    expect(live).toMatch(/memberAlreadyReady: liveReadiness\.ready/);
    expect(live).toMatch(/sessionCreatedAt/);
  });

  it("the sheet has exactly one render trigger, and it consults the rule", () => {
    expect(route.match(/setShowClosingCard\(true\)/g)?.length).toBe(1);
    expect(route).toMatch(/mayOfferFoundationalClose\(/);
  });
});
