// Founder photo moderation — server functions.
//
// Thin wrapper: module scope holds only imports, types, and server-fn
// declarations. Authority comes from the bearer token plus the `founder`
// role, checked server-side on every call. These fail closed and reveal
// nothing — a non-founder gets "Not found", never "forbidden".
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

export const getPendingPhotosForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { listPendingPhotosForFounder } = await import("./photo-moderation.server");
    return listPendingPhotosForFounder();
  });

export const approvePendingPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ photo_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { approvePhotoAsFounder } = await import("./photo-moderation.server");
    return approvePhotoAsFounder(context.userId, data.photo_id);
  });

export const rejectPendingPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ photo_id: z.string().uuid(), note: z.string().max(500).nullish() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    const { rejectPhotoAsFounder } = await import("./photo-moderation.server");
    return rejectPhotoAsFounder(context.userId, data.photo_id, data.note ?? null);
  });
