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

export async function listPendingPhotosForFounder(): Promise<{ photos: PendingPhoto[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows } = await supabaseAdmin
    .from("user_photos")
    .select("id, user_id, storage_path, created_at")
    .eq("moderation", "pending")
    .order("created_at", { ascending: true });

  const pending = rows ?? [];
  if (pending.length === 0) return { photos: [] };

  const ids = Array.from(new Set(pending.map((r) => r.user_id as string)));
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const nameOf = new Map<string, string>();
  for (const p of profs ?? [])
    nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");

  const photos: PendingPhoto[] = [];
  for (const r of pending) {
    // Storage RLS scopes signed-URL creation to the owning member's own
    // folder; the founder is never that owner, so this must go through the
    // service-role client rather than the caller's RLS-scoped one.
    const { data: signed } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUrl(r.storage_path as string, SIGNED_URL_TTL_SECONDS);
    photos.push({
      id: r.id as string,
      user_id: r.user_id as string,
      member_name: nameOf.get(r.user_id as string) ?? "Someone",
      url: signed?.signedUrl ?? "",
      created_at: r.created_at as string,
    });
  }
  return { photos };
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

export async function rejectPhotoAsFounder(
  actorId: string,
  photoId: string,
  note: string | null,
): Promise<{ ok: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: photo, error } = await supabaseAdmin
    .from("user_photos")
    .select("user_id, storage_path")
    .eq("id", photoId)
    .eq("moderation", "pending")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!photo) throw new Error("That photo isn't waiting on review.");

  // Deleted, not merely flagged: a rejected row must never sit in the
  // five-photo count. Leaving it behind would trade one dead end (pending
  // forever) for another (blocked from ever uploading a replacement).
  await supabaseAdmin.storage.from("profile-photos").remove([photo.storage_path as string]);
  const { error: delErr } = await supabaseAdmin.from("user_photos").delete().eq("id", photoId);
  if (delErr) throw new Error(delErr.message);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId,
    actorRole: "founder",
    action: "photo_moderation.reject",
    subjectId: photo.user_id as string,
    resource: "user_photos",
    purpose: "Photo moderation decision",
    metadata: { photo_id: photoId, note: note ?? null },
  });

  // The member's own read of this event, so rejection is never silent. Uses
  // the admin client throughout — including for notify()'s internal reads —
  // because the founder is never the target member and RLS would otherwise
  // block reading that member's own profile/preferences.
  const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
  await notify(supabaseAdmin as never, {
    userId: photo.user_id as string,
    category: "account",
    eventType: "photo_rejected",
    title: NOTIFICATION_COPY.photo_rejected.title,
    body: note?.trim() || NOTIFICATION_COPY.photo_rejected.body,
    actionPath: "/profile",
    dedupeKey: `photo_rejected:${photoId}`,
  });

  return { ok: true };
}
