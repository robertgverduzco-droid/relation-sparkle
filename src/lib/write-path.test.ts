// WRITE-PATH REGRESSION SUITE — both halves of the security contract.
//
// For every member action that lost its direct PostgREST grant during V1
// stabilization we assert two things against the same in-memory database:
//
//   1. DENIED — the member-scoped client cannot mutate the table itself;
//   2. ALLOWED — the governed server function still performs the real state
//      transition, keyed to the caller and refusing to act for anyone else.
//
// Together these prove security tightening did not break member behaviour,
// and that behaviour was not restored by widening grants.
//
//   bunx vitest run src/lib/write-path.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Db } from "./test-support";

let db: Db;

// Side-effect modules that reach further into the system than this suite.
vi.mock("./attraction.server", () => ({
  counterpartForPresentedPair: vi.fn(async () => "counterpart"),
}));

const T1 = "f1111111-0000-4000-8000-000000000011";
const T2 = "f2222222-0000-4000-8000-000000000022";
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const CONN = "dddddddd-0000-4000-8000-00000000000c";
const PAIR = "eeeeeeee-0000-4000-8000-00000000000e";

let caller = A;

function boot(seed: Record<string, Record<string, unknown>[]>) {
  db = new Db(seed);
  caller = A;
}

/** Runs a governed write path exactly as a server function would. */
const paths = () => import("./write-paths.server");

beforeEach(() => {
  vi.clearAllMocks();
});

// --- member_transitions --------------------------------------------------
describe("ending choice (member_transitions)", () => {
  const seedTransition = () => ({
    member_transitions: [
      { id: "f1111111-0000-4000-8000-000000000011", user_id: A, connection_id: CONN, choice: null, hold_until: null, resolved_at: null },
      { id: "f2222222-0000-4000-8000-000000000022", user_id: B, connection_id: CONN, choice: null, hold_until: null, resolved_at: null },
    ],
    connections: [{ id: CONN, user_low: A, user_high: B, status: "closed" }],
    profiles: [{ id: B, display_name: "Bea" }],
  });

  it("DENIES a direct member-scoped mutation", async () => {
    boot(seedTransition());
    const { error } = await db
      .member()
      .from("member_transitions")
      .update({ choice: "resume" })
      .eq("id", T1);
    expect(error?.message).toMatch(/permission denied/i);
    expect(db.one("member_transitions", { id: T1 })!["choice"]).toBeNull();
  });

  it("ALLOWS the governed server function to record the choice", async () => {
    boot(seedTransition());
    const { recordEndingChoice } = await paths();
    const res = await recordEndingChoice(db.member(), db.admin(), caller, {
      transition_id: T1,
      choice: "rest",
    });
    expect(res.ok).toBe(true);
    const row = db.one("member_transitions", { id: T1 })!;
    expect(row["choice"]).toBe("rest");
    expect(row["hold_until"]).toBeTruthy();
  });

  it("REFUSES to act on another member's transition", async () => {
    boot(seedTransition());
    const { recordEndingChoice } = await paths();
    await expect(
      recordEndingChoice(db.member(), db.admin(), caller, {
        transition_id: T2,
        choice: "resume",
      }),
    ).rejects.toThrow(/not your transition/i);
    expect(db.one("member_transitions", { id: T2 })!["choice"]).toBeNull();
  });
});

// --- relationship_focus --------------------------------------------------
describe("relationship focus opt-in (relationship_focus)", () => {
  const seedFocus = () => ({
    connections: [{ id: CONN, user_low: A, user_high: B, status: "mutual_interest" }],
    relationship_focus: [] as Record<string, unknown>[],
  });

  it("DENIES a direct member-scoped insert", async () => {
    boot(seedFocus());
    const { error } = await db
      .member()
      .from("relationship_focus")
      .insert({ connection_id: CONN, user_low: A, user_high: B });
    expect(error?.message).toMatch(/permission denied/i);
    expect(db.rows("relationship_focus")).toHaveLength(0);
  });

  it("ALLOWS opting in, and starts Focus only when BOTH have chosen it", async () => {
    boot(seedFocus());
    const { optIntoFocusFor } = await paths();

    const first = await optIntoFocusFor(db.member(), db.admin(), A, CONN);
    expect(first.active).toBe(false);
    expect(db.rows("relationship_focus")).toHaveLength(1);
    expect(db.rows("relationship_focus")[0]!["started_at"]).toBeFalsy();

    const second = await optIntoFocusFor(db.member(), db.admin(), B, CONN);
    expect(second.active).toBe(true);
    expect(db.rows("relationship_focus")[0]!["started_at"]).toBeTruthy();
  });

  it("REFUSES a member who is not part of the connection", async () => {
    boot(seedFocus());
    const { optIntoFocusFor } = await paths();
    await expect(optIntoFocusFor(db.member(), db.admin(), C, CONN)).rejects.toThrow(/not yours/i);
    expect(db.rows("relationship_focus")).toHaveLength(0);
  });
});

// --- introduction responses / attraction ---------------------------------
describe("introduction response and attraction", () => {
  const seedPair = () => ({
    pair_reasoning: [
      {
        id: PAIR,
        user_low: A,
        user_high: B,
        status: "introduced",
        presented_to_a_at: new Date().toISOString(),
        presented_to_b_at: new Date().toISOString(),
      },
    ],
    introduction_responses: [
      { id: "r1", pair_id: PAIR, user_id: A, response: "pending" },
      { id: "r2", pair_id: PAIR, user_id: B, response: "pending" },
    ],
    introduction_feedback: [] as Record<string, unknown>[],
    introduction_attraction: [] as Record<string, unknown>[],
    profiles: [
      { id: A, display_name: "Ada" },
      { id: B, display_name: "Bea" },
    ],
  });

  it("DENIES direct member-scoped writes to response, feedback and attraction", async () => {
    boot(seedPair());
    for (const table of [
      "introduction_responses",
      "introduction_feedback",
      "introduction_attraction",
    ]) {
      const { error } = await db.member().from(table).insert({ pair_id: PAIR, user_id: A });
      expect(error?.message).toMatch(/permission denied/i);
    }
    expect(db.one("introduction_responses", { user_id: A })!["response"]).toBe("pending");
  });

  it("ALLOWS the caller's own response and pins it to the caller", async () => {
    boot(seedPair());
    const { recordIntroductionResponse } = await paths();
    await recordIntroductionResponse(db.member(), db.admin(), A, {
      pair_id: PAIR,
      response: "accepted",
    });

    expect(db.one("introduction_responses", { user_id: A })!["response"]).toBe("accepted");
    // The counterpart's row is untouched — no member speaks for another.
    expect(db.one("introduction_responses", { user_id: B })!["response"]).toBe("pending");
    expect(db.rows("introduction_feedback")).toHaveLength(1);
    expect(db.rows("introduction_feedback")[0]!["user_id"]).toBe(A);
  });

  it("REFUSES a member who is not part of the pair", async () => {
    boot(seedPair());
    const { recordIntroductionResponse } = await paths();
    await expect(
      recordIntroductionResponse(db.member(), db.admin(), C, {
        pair_id: PAIR,
        response: "accepted",
      }),
    ).rejects.toThrow(/not your introduction/i);
    expect(db.rows("introduction_feedback")).toHaveLength(0);
  });

  it("ALLOWS a qualitative attraction response, keyed to the caller", async () => {
    boot(seedPair());
    const { recordAttractionFor } = await paths();
    await recordAttractionFor(db.member(), db.admin(), A, { pair_id: PAIR, response: "curious" });
    const row = db.one("introduction_attraction", { user_id: A })!;
    expect(row["response"]).toBe("curious");
    expect(db.one("introduction_attraction", { user_id: B })).toBeUndefined();
  });
});
