import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EXPIRY_HOURS = z.union([
  z.literal(0), // never
  z.literal(1),
  z.literal(24),
  z.literal(168),
  z.literal(720),
]);

function computeExpiry(hours: number): string | null {
  if (!hours || hours <= 0) return null;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export const getOrCreateShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ expiresInHours: EXPIRY_HOURS.default(0) }).parse(v ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const existing = await supabase
      .from("interview_shares")
      .select("token, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing.data) {
      const notExpired = !existing.data.expires_at || existing.data.expires_at > nowIso;
      if (notExpired) return { token: existing.data.token, expires_at: existing.data.expires_at };
    }
    const expires_at = computeExpiry(data.expiresInHours);
    const { data: created, error } = await supabase
      .from("interview_shares")
      .insert({ user_id: userId, expires_at })
      .select("token, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return { token: created.token, expires_at: created.expires_at };
  });

export const getActiveShare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("interview_shares")
      .select("token, created_at, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { token: null, created_at: null, expires_at: null };
    const expired = data.expires_at && data.expires_at <= nowIso;
    if (expired) return { token: null, created_at: null, expires_at: null };
    return { token: data.token, created_at: data.created_at, expires_at: data.expires_at };
  });

/** Returns any expired-but-not-yet-notified shares, and marks them notified. */
export const checkExpiredShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("interview_shares")
      .select("id, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .is("expiry_notified_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso);
    const rows = data ?? [];
    if (rows.length > 0) {
      await supabase
        .from("interview_shares")
        .update({ expiry_notified_at: nowIso })
        .in("id", rows.map((r) => r.id));
    }
    return { expired: rows.length };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("interview_shares")
      .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listActiveShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("interview_shares")
      .select("id, token, created_at, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    const rows = (data ?? []).filter((r) => !r.expires_at || r.expires_at > nowIso);
    return { shares: rows };
  });

export const listRevokedShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("interview_shares")
      .select("id, token, created_at, expires_at, revoked_at, revoked_by")
      .eq("user_id", userId)
      .not("revoked_at", "is", null)
      .order("revoked_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const revokerIds = Array.from(
      new Set(rows.map((r) => r.revoked_by).filter((v): v is string => !!v)),
    );
    let names: Record<string, string> = {};
    if (revokerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", revokerIds);
      names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? ""]));
    }
    return {
      revoked: rows.map((r) => ({
        ...r,
        revoked_by_name: r.revoked_by ? names[r.revoked_by] ?? null : null,
        revoked_by_self: r.revoked_by === context.userId,
      })),
    };
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ expiresInHours: EXPIRY_HOURS.default(0) }).parse(v ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const expires_at = computeExpiry(data.expiresInHours);
    const { data: created, error } = await supabase
      .from("interview_shares")
      .insert({ user_id: userId, expires_at })
      .select("id, token, created_at, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const revokeShareById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("interview_shares")
      .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq("user_id", userId)
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



const tokenInput = z.object({ token: z.string().min(8).max(128) });

export const getSharedTranscript = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => tokenInput.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const share = await supabaseAdmin
      .from("interview_shares")
      .select("user_id, revoked_at, created_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    const nowIso = new Date().toISOString();
    if (
      !share.data ||
      share.data.revoked_at ||
      (share.data.expires_at && share.data.expires_at <= nowIso)
    ) {
      return { ok: false as const, reason: "revoked" as const };
    }
    const session = await supabaseAdmin
      .from("interview_sessions")
      .select("messages, completed_at, updated_at")
      .eq("user_id", share.data.user_id)
      .maybeSingle();
    const profile = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", share.data.user_id)
      .maybeSingle();
    return {
      ok: true as const,
      displayName: profile.data?.display_name ?? null,
      messages: (session.data?.messages as Array<{ role: string; content: string; ts?: string }>) ?? [],
      completedAt: session.data?.completed_at ?? null,
      sharedAt: share.data.created_at,
      expiresAt: share.data.expires_at,
    };
  });
