// Thin wrapper. All helpers, schemas, and prompts live in ./connections.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import {
  idInput,
  proposeInput,
  proposalActionInput,
  reflectAskInput,
  reflectDistillInput,
  reflectionSchema,
  partnerPerceptionInput,
} from "./connections.server";


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

    if (!conns || conns.length === 0) {
      return {
        connections: [] as Array<{
          id: string;
          other_id: string;
          other_name: string;
          status: string;
          opened_at: string;
        }>,
      };
    }

    const otherIds = conns.map((c) =>
      (c.user_low === userId ? c.user_high : c.user_low) as string,
    );
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds);
    const nameOf = new Map<string, string>();
    for (const p of profs ?? []) {
      nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");
    }

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

    const [{ data: prof }, { data: proposals }, { data: reflection }, { data: pair }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, city, birth_date")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("meeting_proposals")
          .select(
            "id, proposed_by, when_text, where_text, notes, scheduled_for, status, confirmed_at, completed_at, created_at",
          )
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
      ? ((pair.user_low === userId ? pair.presentation_a : pair.presentation_b) as string | null)
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
            transcript: (reflection.transcript ?? []) as Array<{
              role: "user" | "assistant";
              content: string;
            }>,
            summary: reflection.summary as string | null,
            sentiment: reflection.sentiment as string | null,
            would_meet_again: reflection.would_meet_again as boolean | null,
          }
        : null,
    };
  });

export const proposeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => proposeInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
      await supabase
        .from("connections")
        .update({ status: "meeting_planned" })
        .eq("id", updated.connection_id as string);
    } else if (data.action === "complete") {
      await supabase
        .from("connections")
        .update({ status: "met" })
        .eq("id", updated.connection_id as string);
    }
    return { ok: true };
  });

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
    const { reflectSystemPrompt } = await import("./connections.server");
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

    // Post-meeting reflection is high-signal — refresh any pair reasoning
    // the DB triggers have marked stale for this user.
    const { refreshStalePairsForUser } = await import("./introductions.server");
    void refreshStalePairsForUser(userId).catch(() => {});

    return { ok: true, summary: object.summary, sentiment: object.sentiment };
  });


// Save (or update) the current user's private perception of the person they
// met. Never surfaced to the subject.
export const submitPartnerPerception = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => partnerPerceptionInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");
    const subjectId = (conn.user_low === userId ? conn.user_high : conn.user_low) as string;

    const { error } = await supabase
      .from("partner_perception")
      .upsert(
        {
          connection_id: data.connection_id,
          author_id: userId,
          subject_id: subjectId,
          warmth: data.warmth ?? null,
          honesty: data.honesty ?? null,
          safety: data.safety ?? null,
          chemistry: data.chemistry ?? null,
          would_meet_again: data.would_meet_again ?? null,
          surprised_by: data.surprised_by ?? null,
          concerns: data.concerns ?? null,
          notes: data.notes ?? null,
        },
        { onConflict: "connection_id,author_id" },
      );
    if (error) throw new Error(error.message);

    // Partner perception updates Athena's view of the subject; refresh any
    // stale pair reasoning for BOTH users (the trigger marks both sides).
    const { refreshStalePairsForUser } = await import("./introductions.server");
    void refreshStalePairsForUser(userId).catch(() => {});
    void refreshStalePairsForUser(subjectId).catch(() => {});

    return { ok: true };
  });


export const getMyPartnerPerception = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ connection_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("partner_perception")
      .select(
        "warmth, honesty, safety, chemistry, would_meet_again, surprised_by, concerns, notes, updated_at",
      )
      .eq("connection_id", data.connection_id)
      .eq("author_id", userId)
      .maybeSingle();
    return { perception: row ?? null };
  });

