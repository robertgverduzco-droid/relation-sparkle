import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  sendInput,
  listMessagesInput,
  blockInput,
  reportInput,
  usageInput,
} from "./messaging.server";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user_a, user_b, last_message_at, created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const ids = (convs ?? []).map((c) =>
      (c.user_a === userId ? c.user_b : c.user_a) as string,
    );
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string | null }[] };
    const nameOf = new Map<string, string>();
    for (const p of profs ?? []) nameOf.set(p.id, p.display_name ?? "Someone");

    // last message preview per conversation
    const previews: Record<string, { body: string; created_at: string; mine: boolean } | null> = {};
    for (const c of convs ?? []) {
      const { data: last } = await supabase
        .from("messages")
        .select("body, created_at, sender_id")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      previews[c.id as string] = last
        ? { body: last.body as string, created_at: last.created_at as string, mine: last.sender_id === userId }
        : null;
    }

    return {
      conversations: (convs ?? []).map((c) => {
        const otherId = (c.user_a === userId ? c.user_b : c.user_a) as string;
        return {
          id: c.id as string,
          other_id: otherId,
          other_name: nameOf.get(otherId) ?? "Someone",
          last_message_at: c.last_message_at as string | null,
          preview: previews[c.id as string],
        };
      }),
    };
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => listMessagesInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, user_a, user_b")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (!conv) throw new Error("Not found");
    if (conv.user_a !== userId && conv.user_b !== userId) throw new Error("Not yours");
    const otherId = (conv.user_a === userId ? conv.user_b : conv.user_a) as string;
    const [{ data: prof }, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle(),
      supabase
        .from("messages")
        .select("id, sender_id, kind, body, created_at, read_at")
        .eq("conversation_id", data.conversation_id)
        .order("created_at", { ascending: true })
        .limit(500),
    ]);
    // mark unread messages from other user as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .is("read_at", null)
      .neq("sender_id", userId);

    return {
      other: {
        id: otherId,
        name: (prof?.display_name as string | null) ?? "Someone",
      },
      messages: (msgs ?? []).map((m) => ({
        id: m.id as string,
        mine: m.sender_id === userId,
        kind: m.kind as string,
        body: m.body as string,
        created_at: m.created_at as string,
      })),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => sendInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("messages").insert({
      conversation_id: data.conversation_id,
      sender_id: userId,
      kind: "text",
      body: data.body.trim(),
      metadata: {},
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversation_id);
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => blockInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("blocks").insert({
      blocker_id: userId,
      blocked_id: data.user_id,
      reason: data.reason ?? null,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await supabase
      .from("connections")
      .update({ status: "closed", closed_at: new Date().toISOString(), close_reason: "blocked" })
      .or(
        `and(user_low.eq.${userId},user_high.eq.${data.user_id}),and(user_low.eq.${data.user_id},user_high.eq.${userId})`,
      );
    // Closing a connection frees an active-intro slot for both parties.
    const { runMatchmakingForUser } = await import("./introductions.server");
    void runMatchmakingForUser(userId).catch(() => {});
    void runMatchmakingForUser(data.user_id).catch(() => {});
    return { ok: true };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reportInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const severity = data.category === "unsafe" || data.category === "harassment" ? "high" : "medium";
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: data.reported_id,
      conversation_id: data.conversation_id ?? null,
      category: data.category,
      details: data.details ?? null,
      severity,
    });
    if (error) throw new Error(error.message);

    // Outcome-learning (recording only): a safety report is disqualifying for
    // any future pattern and is always reviewed by a person. No member text.
    const { emitOutcomeSignal } = await import("./learning.server");
    emitOutcomeSignal({
      userA: userId,
      userB: data.reported_id,
      kind: "safety_report",
      dedupeKey: `${data.conversation_id ?? "none"}:${data.category}`,
    });
    return { ok: true };
  });

export const logUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => usageInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("athena_usage_log").insert({
      user_id: userId,
      kind: data.kind,
      seconds: data.seconds ?? null,
      input_tokens: data.input_tokens ?? null,
      output_tokens: data.output_tokens ?? null,
      model: data.model ?? null,
      metadata: {},
    });
    return { ok: true };
  });
