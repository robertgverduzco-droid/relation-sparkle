// PHOTO MODERATION — regression coverage for un-approve.
//
// Approving was one-way; un-approving reverses it. The failure this guards
// against isn't just "the row didn't change" -- it's the same class of bug
// as the appeals work: a state change that's supposed to affect the member
// but where nothing actually re-evaluates the thing that matters. Proven
// directly against evaluateReadiness, not assumed from the DB write alone.
//
//   bunx vitest run src/lib/photo-moderation.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Db, nextId } from "./test-support";
// Imported statically for the same reason appeals.test.ts does: loading this
// module graph inside the first timed test made things flake under a fully
// parallel run. The supabaseAdmin mock below is hoisted, so a static import
// still receives the per-test in-memory database.
import { evaluateReadiness } from "./readiness.server";
import {
  approvePhotoAsFounder,
  rejectPhotoAsFounder,
  unapprovePhotoAsFounder,
} from "./photo-moderation.server";

let db: Db;

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return db.admin();
  },
}));

const MEMBER = "aaaaaaaa-0000-4000-8000-000000000001";
const FOUNDER = "bbbbbbbb-0000-4000-8000-000000000002";

function seedMemberWithPhoto(moderation: "pending" | "approved") {
  const photoId = nextId();
  db = new Db({
    profiles: [
      { id: MEMBER, display_name: "Alex", is_paused: false, suspended_by_moderator: false },
    ],
    user_photos: [
      { id: photoId, user_id: MEMBER, storage_path: `${MEMBER}/photo.jpg`, moderation },
    ],
    reports: [],
    relationship_focus: [],
    member_transitions: [],
    post_meeting_reflections: [],
    user_intelligence: [{ user_id: MEMBER, last_interview_at: "2026-01-01T00:00:00Z" }],
    understanding_facets: [],
    member_readiness: [],
    security_kill_switches: [],
    admin_audit_log: [],
    notifications: [],
    notification_preferences: [],
    pair_reasoning: [],
    introduction_responses: [],
  });
  return photoId;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("unapprovePhotoAsFounder — reversing a mistaken or later-problematic approval", () => {
  it("refuses to un-approve a photo that isn't currently approved", async () => {
    const photoId = seedMemberWithPhoto("pending");
    await expect(unapprovePhotoAsFounder(FOUNDER, photoId, null)).rejects.toThrow(
      /isn't currently approved/i,
    );
    // Untouched -- a rejected call must not have deleted anything.
    expect(db.rows("user_photos")).toHaveLength(1);
  });

  it("deletes the photo outright, same as reject -- never left lingering as 'un-approved'", async () => {
    const photoId = seedMemberWithPhoto("approved");
    await unapprovePhotoAsFounder(FOUNDER, photoId, "Doesn't match the guidelines after all.");
    expect(db.rows("user_photos")).toHaveLength(0);
  });

  it("tells the member, distinctly from a plain rejection", async () => {
    const photoId = seedMemberWithPhoto("approved");
    await unapprovePhotoAsFounder(FOUNDER, photoId, null);
    const notif = db.rows("notifications").find((n) => n["user_id"] === MEMBER);
    expect(notif).toBeTruthy();
    expect(notif!["event_type"]).toBe("photo_unapproved");
    expect(notif!["title"]).not.toBe("A photo needs another try"); // the reject copy
  });

  it("the member actually loses introduction eligibility on the photo dimension -- proven, not assumed", async () => {
    const photoId = seedMemberWithPhoto("approved");

    // Before: the photo gate specifically is satisfied. (Whatever else is
    // missing -- there are no understanding facets seeded here -- readiness
    // fails *later* in the pipeline, which is exactly what proves the photo
    // check itself passed rather than being the reason.)
    const before = await evaluateReadiness(db.member(), MEMBER, "manual_request");
    expect(before.reason_code).not.toBe("photo_required");
    expect(before.reason_code).not.toBe("photo_pending");

    await unapprovePhotoAsFounder(FOUNDER, photoId, null);

    const after = await evaluateReadiness(db.member(), MEMBER, "manual_request");
    expect(after.state).toBe("A");
    expect(after.reason_code).toBe("photo_required");
  });

  it("audits distinctly from approve/reject so the trail says what actually happened", async () => {
    const photoId = seedMemberWithPhoto("approved");
    await unapprovePhotoAsFounder(FOUNDER, photoId, null);
    const entry = db.rows("admin_audit_log").find((r) => r["subject_id"] === MEMBER);
    expect(entry).toBeTruthy();
    expect(entry!["action"]).toBe("photo_moderation.unapprove");
  });
});

describe("reject and un-approve stay separate actions, not one generalised over the other", () => {
  it("reject still refuses to touch an already-approved photo", async () => {
    const photoId = seedMemberWithPhoto("approved");
    await expect(rejectPhotoAsFounder(FOUNDER, photoId, null)).rejects.toThrow(
      /isn't waiting on review/i,
    );
    expect(db.rows("user_photos")).toHaveLength(1);
  });

  it("approve still refuses to touch an already-approved photo", async () => {
    const photoId = seedMemberWithPhoto("approved");
    await expect(approvePhotoAsFounder(FOUNDER, photoId)).rejects.toThrow(
      /isn't waiting on review/i,
    );
  });
});
