// Thin wrapper. Runtime logic lives in ./notifications.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, category, event_type, title, body, action_path, read_at, obsolete_at, created_at")
      .eq("user_id", context.userId)
      .is("obsolete_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = data ?? [];
    return {
      notifications: rows,
      unread: rows.filter((r) => !r.read_at).length,
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("notifications")
      .select("id, dedupe_key")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return { ok: false };
    // Retiring the dedupe key lets the next genuine occurrence of the same
    // event notify again, while the same unread event never repeats.
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString(), dedupe_key: `${row.dedupe_key as string}:${row.id as string}` })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_preferences")
      .select("messages, introductions, reflection, athena, relationship, product_updates, email_enabled")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (
      data ?? {
        messages: true,
        introductions: true,
        reflection: true,
        athena: true,
        relationship: true,
        product_updates: false,
        email_enabled: false,
      }
    );
  });

const prefsInput = z.object({
  messages: z.boolean(),
  introductions: z.boolean(),
  reflection: z.boolean(),
  athena: z.boolean(),
  relationship: z.boolean(),
  product_updates: z.boolean(),
});

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => prefsInput.parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
