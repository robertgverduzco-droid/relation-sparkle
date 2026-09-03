// Founder photo moderation — runtime logic. Never imported by client
// components — only by the thin server-function wrapper in
// ./photo-moderation.functions.ts.
//
// The counterpart to src/lib/moderation.server.ts (report review), for the
// one review step the app never actually finished wiring up: nothing in this
// codebase used to transition a photo's moderation status away from
// 'pending', so a member's photo — and therefore any introduction — could
// never move forward. This is that missing transition.

export type PendingPhoto = {
  id: string;
  user_id: string;
  member_name: string;
  url: string;
  created_at: string;
};

/** How long a founder's signed preview link stays valid. Review-session length only. */
const SIGNED_URL_TTL_SECONDS = 600;

/** How many recently-approved photos the review screen shows at once. */
const APPROVED_REVIEW_LIMIT = 50;

async function namedPhotos(
  rows: Array<{ id: string; user_id: string; storage_path: string; created_at: string }>,
): Promise<PendingPhoto[]> {
  if (rows.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameOf = new Map<string, string>();
  for (const p of profs ?? [])
    nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");

  const photos: PendingPhoto[] = [];
  for (const r of rows) {
    // Storage RLS scopes signed-URL creation to the owning member's own
    // folder; the founder is never that owner, so this must go through the
    // service-role client rather than the caller's RLS-scoped one.
    const { data: signed } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS);
    photos.push({
      id: r.id,
      user_id: r.user_id,
      member_name: nameOf.get(r.user_id) ?? "Someone",
      url: signed?.signedUrl ?? "",
      created_at: r.created_at,
    });
  }
  return photos;
}

export async function listPendingPhotosForFounder(): Promise<{ photos: PendingPhoto[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("user_photos")
    .select("id, user_id, storage_path, created_at")
    .eq("moderation", "pending")
    .order("created_at", { ascending: true });
  return { photos: await namedPhotos((rows ?? []) as never) };
}

/** Currently-live photos, so a mistaken or later-problematic approval can be reversed. */
export async function listApprovedPhotosForFounder(): Promise<{ photos: PendingPhoto[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("user_photos")
    .select("id, user_id, storage_path, created_at")
    .eq("moderation", "approved")
    .order("created_at", { ascending: false })
    .limit(APPROVED_REVIEW_LIMIT);
  return { photos: await namedPhotos((rows ?? []) as never) };
}

export async function approvePhotoAsFounder(
  actorId: string,
  photoId: string,
): Promise<{ ok: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: photo, error } = await supabaseAdmin
    .from("user_photos")
    .update({ moderation: "approved" })
    .eq("id", photoId)
    .eq("moderation", "pending")
    .select("user_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!photo) throw new Error("That photo isn't waiting on review.");

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId,
    actorRole: "founder",
    action: "photo_moderation.approve",
    subjectId: photo.user_id as string,
    resource: "user_photos",
    purpose: "Photo moderation decision",
    metadata: { photo_id: photoId },
  });

  return { ok: true };
}

/**
 * The one DB effect shared by rejecting a pending photo and revoking an
 * approved one: the photo is deleted outright, never merely flagged. A
 * lingering row -- whatever status it carried -- must never sit in the
 * five-photo count; that would trade the pending-forever dead end this
 * feature exists to close for a different one (blocked from ever uploading
 * a replacement). Readiness is refreshed for the same reason clearHold()
 * refreshes it (moderation.server.ts): nothing live reads a cached value,
 * so this isn't load-bearing, but it keeps that cache honest, and taking a
 * photo down can be the exact thing that changes whether a member is
 * currently eligible for introductions.
 *
 * The member's own read of this event, so it's never silent either way.
 * Uses the admin client throughout — including for notify()'s internal
 * reads — because the founder is never the target member and RLS would
 * otherwise block reading that member's own profile/preferences.
 */
async function takeDownPhoto(args: {
  actorId: string;
  photoId: string;
  requiredStatus: "pending" | "approved";
  notFoundMessage: string;
  auditAction: string;
  eventType: string;
  title: string;
  defaultBody: string;
  note: string | null;
}): Promise<{ ok: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: photo, error } = await supabaseAdmin
    .from("user_photos")
    .select("user_id, storage_path")
    .eq("id", args.photoId)
    .eq("moderation", args.requiredStatus)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!photo) throw new Error(args.notFoundMessage);

  await supabaseAdmin.storage.from("profile-photos").remove([photo.storage_path as string]);
  const { error: delErr } = await supabaseAdmin.from("user_photos").delete().eq("id", args.photoId);
  if (delErr) throw new Error(delErr.message);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.actorId,
    actorRole: "founder",
    action: args.auditAction,
    subjectId: photo.user_id as string,
    resource: "user_photos",
    purpose: "Photo moderation decision",
    metadata: { photo_id: args.photoId, note: args.note ?? null },
  });

  const { notify } = await import("./notifications.server");
  await notify(supabaseAdmin as never, {
    userId: photo.user_id as string,
    category: "account",
    eventType: args.eventType,
    title: args.title,
    body: args.note?.trim() || args.defaultBody,
    actionPath: "/profile",
    dedupeKey: `${args.eventType}:${args.photoId}`,
  });

  const { evaluateReadiness } = await import("./readiness.server");
  await evaluateReadiness(supabaseAdmin, photo.user_id as string, "account_change");

  return { ok: true };
}

export async function rejectPhotoAsFounder(
  actorId: string,
  photoId: string,
  note: string | null,
): Promise<{ ok: true }> {
  const { NOTIFICATION_COPY } = await import("./notifications.server");
  return takeDownPhoto({
    actorId,
    photoId,
    note,
    requiredStatus: "pending",
    notFoundMessage: "That photo isn't waiting on review.",
    auditAction: "photo_moderation.reject",
    eventType: "photo_rejected",
    title: NOTIFICATION_COPY.photo_rejected.title,
    defaultBody: NOTIFICATION_COPY.photo_rejected.body,
  });
}

/**
 * Approving was previously one-way. A photo can be approved by mistake, or
 * be fine at the time and become a problem later — this is the reversal.
 * Deletes the photo (see takeDownPhoto) rather than reverting it to
 * 'pending', so the member is never left wondering whether something they
 * could already see is quietly back under review: it's gone, they're told
 * plainly why, and they're free to upload a replacement immediately.
 */
export async function unapprovePhotoAsFounder(
  actorId: string,
  photoId: string,
  note: string | null,
): Promise<{ ok: true }> {
  const { NOTIFICATION_COPY } = await import("./notifications.server");
  return takeDownPhoto({
    actorId,
    photoId,
    note,
    requiredStatus: "approved",
    notFoundMessage: "That photo isn't currently approved.",
    auditAction: "photo_moderation.unapprove",
    eventType: "photo_unapproved",
    title: NOTIFICATION_COPY.photo_unapproved.title,
    defaultBody: NOTIFICATION_COPY.photo_unapproved.body,
  });
}
