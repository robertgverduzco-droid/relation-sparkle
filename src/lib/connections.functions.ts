import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import { z } from "zod";

// -------- Helpers --------

async function openConnectionIfMutual(
  supabase: Awaited<ReturnType<typeof getCtx>>["supabase"],
  pairId: string,
) {
  const { data: pair } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high")
    .eq("id", pairId)
    .maybeSingle();
  if (!pair) return null;

  const { data: responses } = await supabase
    .from("introduction_responses")
    .select("user_id, response")
    .eq("pair_id", pairId);

  const accepted = new Set((responses ?? []).filter((r) => r.response === "accepted").map((r) => r.user_id as string));
  if (!accepted.has(pair.user_low as string) || !accepted.has(pair.user_high as string)) return null;

  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("pair_id", pairId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: opened } = await supabase
    .from("connections")
    .insert({
      pair_id: pairId,
      user_low: pair.user_low,
      user_high: pair.user_high,
      status: "open",
    })
    .select("id")
    .maybeSingle();
  return (opened?.id as string) ?? null;
}
// Re-exported for use from introductions.functions.ts.
export { openConnectionIfMutual };

async function getCtx() {
  // helper type-shim so openConnectionIfMutual can share the supabase type
  return {} as unknown as { supabase: import("@supabase/supabase-js").SupabaseClient };
}

// -------- List connections --------

export const listMyConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: conns } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status, opened_at")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .neq("status", "closed")
      .order("opened_at", { ascending: false });

    if (!conns || conns.length === 0) return { connections: [] as Array<{
      id: string; other_id: string; other_name: string; status: string; opened_at: string;
    }> };

    const otherIds = conns.map((c) => (c.user_low === userId ? c.user_high : c.user_low) as string);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds);
    const nameOf = new Map<string, string>();
    for (const p of profs ?? []) nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");

    return {
      connections: conns.map((c) => {
        const otherId = (c.user_low === userId ? c.user_high : c.user_low) as string;
        return {
          id: c.id as string,
          other_id: otherId,
          other_name: nameOf.get(otherId) ?? "Someone",
          status: c.status as string,
          opened_at: c.opened_at as string,
        };
      }),
    };
  });

// -------- Connection detail --------

const idInput = z.object({ connection_id: z.string().uuid() });

export const getConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => idInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status, opened_at, pair_id")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");

    const otherId = (conn.user_low === userId ? conn.user_high : conn.user_low) as string;

    const [{ data: prof }, { data: proposals }, { data: reflection }, { data: pair }] = await Promise.all([
      supabase.from("profiles").select("display_name, city, birth_date").eq("id", otherId).maybeSingle(),
      supabase
        .from("meeting_proposals")
        .select("id, proposed_by, when_text, where_text, notes, scheduled_for, status, confirmed_at, completed_at, created_at")
        .eq("connection_id", conn.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("post_meeting_reflections")
        .select("id, transcript, summary, sentiment, would_meet_again, refined_at")
        .eq("connection_id", conn.id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("pair_reasoning")
        .select("presentation_a, presentation_b, user_low")
        .eq("id", conn.pair_id as string)
        .maybeSingle(),
    ]);

    const myPresentation = pair
      ? (pair.user_low === userId ? pair.presentation_a : pair.presentation_b) as string | null
      : null;

    return {
      connection: {
        id: conn.id as string,
        status: conn.status as string,
        opened_at: conn.opened_at as string,
        other_id: otherId,
        other_name: (prof?.display_name as string | null) ?? "Someone",
        other_city: (prof?.city as string | null) ?? null,
      },
      athena_reflection: myPresentation,
      proposals: (proposals ?? []).map((p) => ({
        id: p.id as string,
        by_me: p.proposed_by === userId,
        when_text: p.when_text as string | null,
        where_text: p.where_text as string | null,
        notes: p.notes as string | null,
        scheduled_for: p.scheduled_for as string | null,
        status: p.status as string,
        confirmed_at: p.confirmed_at as string | null,
        completed_at: p.completed_at as string | null,
        created_at: p.created_at as string,
      })),
      reflection: reflection
        ? {
            id: reflection.id as string,
            transcript: (reflection.transcript ?? []) as Array<{ role: "user" | "assistant"; content: string }>,
            summary: reflection.summary as string | null,
            sentiment: reflection.sentiment as string | null,
            would_meet_again: reflection.would_meet_again as boolean | null,
          }
        : null,
    };
  });

// -------- Meeting proposals --------

const proposeInput = z.object({
  connection_id: z.string().uuid(),
  when_text: z.string().max(200).optional(),
  where_text: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  scheduled_for: z.string().datetime().optional(),
});

export const proposeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => proposeInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS covers participant check; still verify status.
    const { data: conn } = await supabase
      .from("connections")
      .select("id, status")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.status === "closed") throw new Error("Connection closed");

    const { error } = await supabase.from("meeting_proposals").insert({
      connection_id: data.connection_id,
      proposed_by: userId,
      when_text: data.when_text ?? null,
      where_text: data.where_text ?? null,
      notes: data.notes ?? null,
      scheduled_for: data.scheduled_for ?? null,
      status: "proposed",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const proposalActionInput = z.object({
  proposal_id: z.string().uuid(),
  action: z.enum(["confirm", "complete", "cancel"]),
});

export const updateMeetingProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => proposalActionInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = new Date().toISOString();
    const patch =
      data.action === "confirm"
        ? { status: "confirmed", confirmed_at: now }
        : data.action === "complete"
          ? { status: "completed", completed_at: now }
          : { status: "canceled" };

    const { data: updated, error } = await supabase
      .from("meeting_proposals")
      .update(patch)
      .eq("id", data.proposal_id)
      .select("connection_id, status")
      .maybeSingle();
    if (error || !updated) throw new Error(error?.message ?? "Update failed");

    if (data.action === "confirm") {
      await supabase.from("connections").update({ status: "meeting_planned" }).eq("id", updated.connection_id as string);
    } else if (data.action === "complete") {
      await supabase.from("connections").update({ status: "met" }).eq("id", updated.connection_id as string);
    }
    return { ok: true };
  });

// -------- Post-meeting reflection with Athena --------

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const reflectAskInput = z.object({
  connection_id: z.string().uuid(),
  messages: z.array(messageSchema),
});

function reflectSystemPrompt(otherName: string): string {
  return `You are Athena.

You are speaking privately with someone who has just met ${otherName} in person. They agreed to meet after you introduced them. This conversation is completely private — ${otherName} will never see any of it.

Your purpose here:
- help them make sense of the meeting, honestly and without pressure
- listen for how they actually felt, not how they think they should have felt
- pay attention to what surprised them, what resonated, what didn't land
- notice anything that shifts your understanding of them as a person

Voice:
- quiet, patient, warm; never leading, never scoring, never coaching
- one thoughtful question at a time; reflect briefly on what they shared before asking the next
- do not push toward a verdict — the goal is honest reflection, not a rating

If this is the very beginning, greet them gently and ask how the meeting was, in your own words. Let them set the pace.`;
}

export const askAthenaReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reflectAskInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");
    const otherId = (conn.user_low === userId ? conn.user_high : conn.user_low) as string;
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", otherId)
      .maybeSingle();
    const otherName = (prof?.display_name as string | null) ?? "them";

    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const messages: ModelMessage[] = [
      { role: "system", content: reflectSystemPrompt(otherName) },
      ...data.messages.filter((m) => m.role !== "system"),
    ];
    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    // Persist transcript after each turn.
    const nextTranscript = [
      ...data.messages.filter((m) => m.role !== "system"),
      { role: "assistant" as const, content: text.trim() },
    ];
    await supabase.from("post_meeting_reflections").upsert(
      {
        connection_id: data.connection_id,
        user_id: userId,
        transcript: nextTranscript,
      },
      { onConflict: "connection_id,user_id" },
    );

    return { reply: text.trim() };
  });

const reflectDistillInput = z.object({ connection_id: z.string().uuid() });

const reflectionSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["warm", "neutral", "off", "unsure"]),
  would_meet_again: z.boolean().nullable(),
  understanding_updates: z.array(
    z.object({
      note: z.string(),
      about: z.enum(["self", "other"]),
    }),
  ),
});

export const distillReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reflectDistillInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("post_meeting_reflections")
      .select("transcript")
      .eq("connection_id", data.connection_id)
      .eq("user_id", userId)
      .maybeSingle();
    const transcript = (existing?.transcript ?? []) as Array<{ role: string; content: string }>;
    if (transcript.length < 2) throw new Error("Not enough conversation to reflect on yet.");

    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const asText = transcript
      .map((m) => `${m.role === "user" ? "THEY" : "ATHENA"}: ${m.content}`)
      .join("\n\n");
    const { object } = await generateObject({
      model: gateway("openai/gpt-5.5"),
      schema: reflectionSchema,
      providerOptions: { lovable: { reasoningEffort: "none" } },
      prompt: `You are Athena. Distill this private post-meeting reflection into a compact honest summary. Prefer null / "unsure" over guessing. Understanding updates should be short natural-language notes about how this reflection nudges what you understand about THEM (self) or about the person they met (other). If nothing is clearly supported, return an empty array.\n\nCONVERSATION:\n\n${asText}`,
    });

    await supabase
      .from("post_meeting_reflections")
      .update({
        summary: object.summary,
        sentiment: object.sentiment,
        would_meet_again: object.would_meet_again,
        refined_at: new Date().toISOString(),
      })
      .eq("connection_id", data.connection_id)
      .eq("user_id", userId);

    return { ok: true, summary: object.summary, sentiment: object.sentiment };
  });
