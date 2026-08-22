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

// --- harness -------------------------------------------------------------
let ctx: { supabase: unknown; userId: string };

vi.mock("@tanstack/react-start", () => {
  const make = () => {
    const chain = {
      validator: (v: unknown) => v,
      middleware() {
        return chain;
      },
      inputValidator(fn: (v: unknown) => unknown) {
        chain.validator = fn;
        return chain;
      },
      handler(fn: (args: { data: unknown; context: unknown }) => unknown) {
        return (args?: { data?: unknown }) =>
          fn({ data: chain.validator(args?.data), context: ctx });
      },
    };
    return chain;
  };
  return { createServerFn: () => make() };
});

vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

let db: Db;
vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return adminRef.current;
  },
}));
const adminRef: { current: unknown } = { current: null };

// Side-effect modules that reach further into the system than this suite.
vi.mock("./learning.server", () => ({
  emitOutcomeSignal: vi.fn(),
  focusMilestones: () => [],
}));
vi.mock("./introductions.server", () => ({
  runMatchmakingForUser: vi.fn(async () => ({ ok: true })),
  markPairsStaleForUser: vi.fn(async () => {}),
}));
vi.mock("./readiness.server", () => ({ evaluateReadiness: vi.fn(async () => {}) }));
vi.mock("./notifications.server", () => ({
  notify: vi.fn(async () => {}),
  NOTIFICATION_COPY: new Proxy({}, { get: () => ({ title: "t", body: "b" }) }),
}));
vi.mock("./connections.server", () => ({
  postSystemMessage: vi.fn(async () => {}),
  findConversationId: vi.fn(async () => "conv-1"),
  openConnectionIfMutual: vi.fn(async () => {}),
}));

const T1 = "f1111111-0000-4000-8000-000000000011";
const T2 = "f2222222-0000-4000-8000-000000000022";
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const CONN = "dddddddd-0000-4000-8000-00000000000c";
const PAIR = "eeeeeeee-0000-4000-8000-00000000000e";

function boot(seed: Record<string, Record<string, unknown>[]>) {
  db = new Db(seed);
  adminRef.current = db.admin();
  ctx = { supabase: db.member(), userId: A };
}

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
    const { chooseEndingPath } = await import("./relationship.functions");
    const res = await chooseEndingPath({ data: { transition_id: T1, choice: "rest" } });
    expect(res.ok).toBe(true);
    const row = db.one("member_transitions", { id: T1 })!;
    expect(row["choice"]).toBe("rest");
    expect(row["hold_until"]).toBeTruthy();
  });

  it("REFUSES to act on another member's transition", async () => {
    boot(seedTransition());
    const { chooseEndingPath } = await import("./relationship.functions");
    await expect(
      chooseEndingPath({ data: { transition_id: T2, choice: "resume" } }),
    ).rejects.toThrow();
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
    const { optIntoFocus } = await import("./relationship.functions");

    const first = await optIntoFocus({ data: { connection_id: CONN } });
    expect(first.active).toBe(false);
    expect(db.rows("relationship_focus")).toHaveLength(1);
    expect(db.rows("relationship_focus")[0]!["started_at"]).toBeFalsy();

    ctx = { supabase: db.member(), userId: B };
    const second = await optIntoFocus({ data: { connection_id: CONN } });
    expect(second.active).toBe(true);
    expect(db.rows("relationship_focus")[0]!["started_at"]).toBeTruthy();
  });

  it("REFUSES a member who is not part of the connection", async () => {
    boot(seedFocus());
    ctx = { supabase: db.member(), userId: C };
    const { optIntoFocus } = await import("./relationship.functions");
    await expect(optIntoFocus({ data: { connection_id: CONN } })).rejects.toThrow();
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
    const { respondToIntroduction } = await import("./introductions.functions");
    await respondToIntroduction({ data: { pair_id: PAIR, response: "accepted" } });

    expect(db.one("introduction_responses", { user_id: A })!["response"]).toBe("accepted");
    // The counterpart's row is untouched — no member speaks for another.
    expect(db.one("introduction_responses", { user_id: B })!["response"]).toBe("pending");
    expect(db.rows("introduction_feedback")).toHaveLength(1);
    expect(db.rows("introduction_feedback")[0]!["user_id"]).toBe(A);
  });

  it("REFUSES a member who is not part of the pair", async () => {
    boot(seedPair());
    ctx = { supabase: db.member(), userId: C };
    const { respondToIntroduction } = await import("./introductions.functions");
    await expect(
      respondToIntroduction({ data: { pair_id: PAIR, response: "accepted" } }),
    ).rejects.toThrow();
    expect(db.rows("introduction_feedback")).toHaveLength(0);
  });

  it("ALLOWS a qualitative attraction response, keyed to the caller", async () => {
    boot(seedPair());
    const { recordAttractionResponse } = await import("./introductions.functions");
    await recordAttractionResponse({ data: { pair_id: PAIR, response: "curious" } });
    const row = db.one("introduction_attraction", { user_id: A })!;
    expect(row["response"]).toBe("curious");
    expect(db.one("introduction_attraction", { user_id: B })).toBeUndefined();
  });
});
