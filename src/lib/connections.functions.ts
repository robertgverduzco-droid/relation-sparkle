// Thin wrapper. All helpers, schemas, and prompts live in ./connections.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { generalizeArea } from "./geography";
import {
  idInput,
  proposeInput,
  proposalActionInput,
  partnerPerceptionInput,
  reflectionSubmitInput,
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
    // `profiles` is owner-scoped by RLS; counterpart display fields are read
    // server-side with a narrow projection after membership is proven above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin
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

    // Membership is proven above (RLS-scoped read of the connection). The
    // counterpart profile and this member's own side of the pair presentation
    // are then read server-side: `profiles` is owner-scoped, and members hold
    // no column grant on either presentation side.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: prof }, { data: proposals }, { data: reflection }, { data: pair }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("display_name, city, region, birth_date")
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
        supabaseAdmin
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
        // F-06: connection alone does not authorise finer geography than the
        // surface needs; members share specifics deliberately when they plan.
        other_area: generalizeArea(prof?.city as string | null, prof?.region as string | null),
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
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    // Authorization first: the proposal must belong to a connection this
    // member is part of. The member-scoped read is the proof; the transition
    // itself is a system-owned write.
    const { data: proposal } = await supabase
      .from("meeting_proposals")
      .select("id, connection_id")
      .eq("id", data.proposal_id)
      .maybeSingle();
    if (!proposal) throw new Error("Not found");
    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status")
      .eq("id", proposal.connection_id as string)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");

    const patch =
      data.action === "confirm"
        ? { status: "confirmed", confirmed_at: now }
        : data.action === "complete"
          ? { status: "completed", completed_at: now }
          : { status: "canceled" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("meeting_proposals")
      .update(patch)
      .eq("id", data.proposal_id)
      .select("connection_id, status")
      .maybeSingle();
    if (error || !updated) throw new Error(error?.message ?? "Update failed");

    if (data.action === "confirm") {
      await supabaseAdmin
        .from("connections")
        .update({ status: "meeting_planned" })
        .eq("id", updated.connection_id as string);
    } else if (data.action === "complete") {
      await supabaseAdmin
        .from("connections")
        .update({ status: "met" })
        .eq("id", updated.connection_id as string);
    }


    // Outcome-learning: anonymized signal only. No influence on reasoning.
    if (data.action === "confirm" || data.action === "complete") {
      const { data: pair } = await supabase
        .from("connections")
        .select("user_low, user_high")
        .eq("id", updated.connection_id as string)
        .maybeSingle();
      if (pair) {
        const { emitOutcomeSignal } = await import("./learning.server");
        emitOutcomeSignal({
          userA: pair.user_low as string,
          userB: pair.user_high as string,
          kind: data.action === "confirm" ? "meeting_confirmed" : "meeting_completed",
          dedupeKey: data.proposal_id,
        });
      }
    }
    return { ok: true };
  });

// A-06: the legacy free-form reflection chat and its distillation were
// retired (no UI caller; superseded by structured reflection submissions).
// Retiring them removes an unbounded member-text prompt path.
// A-06 note: the legacy free-form reflection distillation was retired. Structured
// reflection submissions supersede it; no unbounded prompt path remains here.

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

    // The author is proven above; `author_id` and `subject_id` are derived
    // here rather than accepted from the client, and the row is written on the
    // service path so a member can never author a perception of a third party.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
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



// --- Athena Reflection Flow (post-date experience) --------------------------
// Additive: sits alongside the free-form reflection conversation and the
// private partner-perception questions, neither of which changed.

export const getGuidedReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => idInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status, opened_at")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");

    const [{ data: row }, { data: history }] = await Promise.all([
      supabase
        .from("post_meeting_reflections")
        .select(
          "feeling_tags, feeling_other, most_genuine, greatest_difference, self_understanding, continue_decision, decision_reason, anything_else, submitted_at, reflection_required, last_checkin_at, athena_acknowledgement",
        )
        .eq("connection_id", data.connection_id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("reflection_submissions")
        .select(
          "id, sequence, feeling_tags, feeling_other, most_genuine, greatest_difference, self_understanding, continue_decision, decision_reason, anything_else, athena_acknowledgement, submitted_at",
        )
        .eq("connection_id", data.connection_id)
        .eq("user_id", userId)
        .order("sequence", { ascending: false }),
    ]);

    const {
      computeReflectionAvailability,
      shouldCheckInAfterUnsure,
      REFLECTION_CHECKIN_COPY,
      REFLECTION_CONCLUDED_INVITE,
    } = await import("./connections.server");

    const availability = await computeReflectionAvailability(supabase, {
      connectionId: conn.id as string,
      openedAt: conn.opened_at as string,
      userLow: conn.user_low as string,
      userHigh: conn.user_high as string,
    });

    const rows = history ?? [];
    const latest = rows[0] ?? null;
    const required = Boolean(row?.reflection_required);

    const checkin = shouldCheckInAfterUnsure({
      lastDecision: (latest?.continue_decision as string | null) ?? null,
      lastSubmittedAt: (latest?.submitted_at as string | null) ?? null,
      lastActivityAt: null,
      lastCheckinAt: (row?.last_checkin_at as string | null) ?? null,
    })
      ? REFLECTION_CHECKIN_COPY
      : null;

    return {
      reflection: row ?? null,
      history: rows,
      // Required reflections always open, even before the timing signals fire:
      // the introduction has already concluded and Athena is waiting.
      available: availability.available || required || rows.length > 0,
      availability_reason: availability.reason,
      required,
      required_invite: required ? REFLECTION_CONCLUDED_INVITE : null,
      checkin,
      connection_status: conn.status as string,
    };
  });

export const submitGuidedReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reflectionSubmitInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");
    const otherId = (conn.user_low === userId ? conn.user_high : conn.user_low) as string;

    const {
      applyReflectionOutcome,
      REFLECTION_CLOSINGS,
      acknowledgementPrompt,
      detectMutualYes,
      markReflectionRequired,
      findConversationId,
      postSystemMessage,
      REFLECTION_CONCLUDED_NOTICE,
      MUTUAL_YES_NOTICE,
    } = await import("./connections.server");

    const submittedAt = new Date().toISOString();

    // Every reflection is kept. Earlier ones are never overwritten.
    const { data: prior } = await supabase
      .from("reflection_submissions")
      .select("sequence")
      .eq("connection_id", data.connection_id)
      .eq("user_id", userId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sequence = ((prior?.sequence as number | null) ?? 0) + 1;

    const payload = {
      feeling_tags: data.feeling_tags,
      feeling_other: data.feeling_other ?? null,
      most_genuine: data.most_genuine ?? null,
      greatest_difference: data.greatest_difference ?? null,
      self_understanding: data.self_understanding ?? null,
      continue_decision: data.continue_decision,
      decision_reason: data.decision_reason ?? null,
      anything_else: data.anything_else ?? null,
    };

    const { data: submission, error: subError } = await supabase
      .from("reflection_submissions")
      .insert({
        connection_id: data.connection_id,
        user_id: userId,
        sequence,
        ...payload,
        submitted_at: submittedAt,
      })
      .select("id")
      .maybeSingle();
    if (subError) throw new Error(subError.message);

    // The existing current-state row keeps working exactly as before.
    const { error } = await supabase.from("post_meeting_reflections").upsert(
      {
        connection_id: data.connection_id,
        user_id: userId,
        ...payload,
        submitted_at: submittedAt,
        reflection_required: false,
        would_meet_again:
          data.continue_decision === "yes"
            ? true
            : data.continue_decision === "no"
              ? false
              : null,
      },
      { onConflict: "connection_id,user_id" },
    );
    if (error) throw new Error(error.message);

    // The reflection is complete — that pending notification no longer applies,
    // and readiness may have changed.
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { obsoleteNotifications } = await import("./notifications.server");
      const { evaluateReadiness } = await import("./readiness.server");
      await obsoleteNotifications(
        supabaseAdmin,
        userId,
        ["reflection_available"],
        `/connections/${data.connection_id}`,
      );
      await evaluateReadiness(supabaseAdmin, userId, "reflection_submitted");
    }

    // Athena's acknowledgement — personal, tone-matched, never directive.
    const { data: otherProf } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", otherId)
      .maybeSingle();
    const otherName = (otherProf?.display_name as string | null) ?? "them";

    let acknowledgement = REFLECTION_CLOSINGS[data.continue_decision];
    try {
      const { createLovableGateway } = await import("./ai-gateway.server");
      const gateway = createLovableGateway();
      const { text } = await generateText({
        model: gateway("openai/gpt-5.5"),
        prompt: acknowledgementPrompt({
          otherName,
          feelings: data.feeling_tags,
          feelingOther: payload.feeling_other,
          mostGenuine: payload.most_genuine,
          greatestDifference: payload.greatest_difference,
          selfUnderstanding: payload.self_understanding,
          decision: data.continue_decision,
          decisionReason: payload.decision_reason,
          anythingElse: payload.anything_else,
        }),
        providerOptions: { lovable: { reasoningEffort: "none" } },
      });
      if (text.trim()) acknowledgement = text.trim();
    } catch {
      /* the static closing copy is a complete, safe fallback */
    }

    await supabase
      .from("post_meeting_reflections")
      .update({ athena_acknowledgement: acknowledgement })
      .eq("connection_id", data.connection_id)
      .eq("user_id", userId);
    if (submission?.id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("reflection_submissions")
        .update({ athena_acknowledgement: acknowledgement })
        .eq("id", submission.id as string);
    }

    const { closed } = await applyReflectionOutcome(supabase, {
      connectionId: data.connection_id,
      userId,
      decision: data.continue_decision,
    });

    // Cross-member effects are platform actions, not member-scoped writes.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as typeof supabase;
    const conversationId = await findConversationId(
      admin,
      conn.user_low as string,
      conn.user_high as string,
    );

    let mutual = false;
    if (closed) {
      // The other member learns only that the introduction concluded, and is
      // invited to complete their own private reflection.
      await markReflectionRequired(admin, {
        connectionId: data.connection_id,
        userId: otherId,
      });
      if (conversationId) {
        await postSystemMessage(admin, conversationId, REFLECTION_CONCLUDED_NOTICE);
      }

      // Relationship Journey doctrine: an ending is not an automatic return to
      // matchmaking. Athena offers each member the three paths instead.
      const { openEndingChoice } = await import("./relationship.server");
      await openEndingChoice(admin, { userId, connectionId: data.connection_id });
      await openEndingChoice(admin, { userId: otherId, connectionId: data.connection_id });
    } else if (data.continue_decision === "yes") {
      mutual = await detectMutualYes(admin, {
        connectionId: data.connection_id,
        otherUserId: otherId,
      });
      if (mutual) {
        await admin
          .from("connections")
          .update({ status: "mutual_interest" })
          .eq("id", data.connection_id);
        if (conversationId) {
          await postSystemMessage(admin, conversationId, MUTUAL_YES_NOTICE);
        }
      }
    }

    // Outcome-learning (recording only): anonymized categorical signals.
    // A single ending is evidence about fit, never about a member's worth.
    {
      const { emitOutcomeSignal } = await import("./learning.server");
      const both = {
        userA: conn.user_low as string,
        userB: conn.user_high as string,
      };
      emitOutcomeSignal({
        ...both,
        kind: "reflection_submitted",
        dedupeKey: `${data.connection_id}:${sequence}`,
      });
      if (data.continue_decision === "not_sure") {
        emitOutcomeSignal({
          ...both,
          kind: "reflection_uncertain",
          dedupeKey: `${data.connection_id}:${sequence}`,
        });
      }
      if (closed) {
        emitOutcomeSignal({
          ...both,
          kind: "connection_ended",
          reason:
            data.continue_decision === "no" ? "member_declined_continue" : "reflection_complete",
          // One member continuing while the other closes is contradictory
          // evidence: recorded, but excluded from any future aggregation.
          isContradictory: data.continue_decision !== "no",
          dedupeKey: data.connection_id,
        });
      }
      if (mutual) {
        emitOutcomeSignal({
          ...both,
          kind: "mutual_interest",
          dedupeKey: data.connection_id,
        });
      }
    }

    // Reflection is high-signal for understanding; refresh what's gone stale.
    const { refreshStalePairsForUser, runMatchmakingForUser } = await import(
      "./introductions.server"
    );
    void refreshStalePairsForUser(userId).catch(() => {});
    if (closed) {
      // A slot just opened — consider a new introduction when appropriate.
      void runMatchmakingForUser(userId).catch(() => {});
    }

    return {
      ok: true,
      closed,
      mutual,
      acknowledgement,
      closing: REFLECTION_CLOSINGS[data.continue_decision],
    };
  });
