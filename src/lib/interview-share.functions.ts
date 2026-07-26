import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getOrCreateShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("interview_shares")
      .select("token, revoked_at, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing.data) return { token: existing.data.token };
    const { data, error } = await supabase
      .from("interview_shares")
      .insert({ user_id: userId })
      .select("token")
      .single();
    if (error) throw new Error(error.message);
    return { token: data.token };
  });

export const getActiveShare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("interview_shares")
      .select("token, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();
    return { token: data?.token ?? null, created_at: data?.created_at ?? null };
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("interview_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
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
      .select("user_id, revoked_at, created_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!share.data || share.data.revoked_at) {
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
    };
  });
