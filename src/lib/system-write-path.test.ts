// SYSTEM WRITE-PATH REGRESSION SUITE
//
// The platform-owned side of the same contract: actions Athena performs on a
// member's behalf (opening a connection, posting a system message, opening the
// ending choice, delivering a notification, requiring a reflection) write to
// tables the `authenticated` role cannot touch. Each is exercised with a
// MEMBER client in hand — as it is called at runtime — and must still land,
// because the helper reaches for the service role itself.
//
//   bunx vitest run src/lib/system-write-path.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Db } from "./test-support";

let db: Db;

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return db.admin();
  },
}));

vi.mock("./security.server", () => ({ featureEnabled: async () => true }));

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const CONN = "dddddddd-0000-4000-8000-00000000000c";
const CONV = "cccccccc-0000-4000-8000-00000000000f";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Athena's own writes still land under the tightened grants", () => {
  it("posts a system message the member client could never insert", async () => {
    db = new Db({ messages: [] });
    const { error } = await db
      .member()
      .from("messages")
      .insert({ conversation_id: CONV, sender_id: null, kind: "system", body: "x" });
    // The member grant exists on `messages`, but RLS pins sender_id to the
    // caller; the platform message is written with the service role instead.
    expect(error).toBeNull();
    db = new Db({ messages: [] });

    const { postSystemMessage } = await import("./connections.server");
    await postSystemMessage(db.member() as never, CONV, "Athena speaks once.");
    expect(db.rows("messages")).toHaveLength(1);
    expect(db.rows("messages")[0]!["sender_id"]).toBeNull();
    expect(db.rows("messages")[0]!["kind"]).toBe("system");
  });

  it("opens the ending choice for a member (member_transitions is closed)", async () => {
    db = new Db({ member_transitions: [] });
    const denied = await db
      .member()
      .from("member_transitions")
      .insert({ user_id: A, connection_id: CONN });
    expect(denied.error?.message).toMatch(/permission denied/i);

    const { openEndingChoice } = await import("./relationship.server");
    await openEndingChoice(db.member() as never, { userId: A, connectionId: CONN });
    expect(db.rows("member_transitions")).toHaveLength(1);
    expect(db.rows("member_transitions")[0]!["user_id"]).toBe(A);

    // Idempotent: one open choice per member, never a second.
    await openEndingChoice(db.member() as never, { userId: A, connectionId: CONN });
    expect(db.rows("member_transitions")).toHaveLength(1);
  });

  it("delivers a notification (notifications is closed to members)", async () => {
    db = new Db({
      profiles: [{ id: A, is_paused: false }],
      notifications: [],
      notification_preferences: [],
    });
    const denied = await db.member().from("notifications").insert({ user_id: A, title: "x" });
    expect(denied.error?.message).toMatch(/permission denied/i);

    const { notify } = await import("./notifications.server");
    const res = await notify(db.member() as never, {
      userId: A,
      category: "introductions",
      eventType: "introduction_new",
      title: "Someone worth meeting",
      body: null,
      actionPath: "/introductions",
      dedupeKey: "intro:1",
    });
    expect(res.created).toBe(true);
    expect(db.rows("notifications")).toHaveLength(1);
    expect(db.rows("notifications")[0]!["user_id"]).toBe(A);
  });

  it("declines to deliver to a deleted account", async () => {
    db = new Db({ profiles: [], notifications: [] });
    const { notify } = await import("./notifications.server");
    const res = await notify(db.member() as never, {
      userId: B,
      category: "introductions",
      eventType: "introduction_new",
      title: "t",
      body: null,
      actionPath: "/introductions",
      dedupeKey: "intro:2",
    });
    expect(res.created).toBe(false);
    expect(db.rows("notifications")).toHaveLength(0);
  });

  it("marks a reflection as required (post_meeting_reflections is closed)", async () => {
    db = new Db({ post_meeting_reflections: [] });
    const denied = await db
      .member()
      .from("post_meeting_reflections")
      .insert({ connection_id: CONN, user_id: A });
    expect(denied.error?.message).toMatch(/permission denied/i);

    const { markReflectionRequired } = await import("./connections.server");
    await markReflectionRequired(db.member() as never, { connectionId: CONN, userId: A });
    const row = db.one("post_meeting_reflections", { user_id: A });
    expect(row).toBeTruthy();
    expect(row!["reflection_required"]).toBe(true);
  });
});
