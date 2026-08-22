// Thin wrapper. All helpers, schemas, and copy live in ./relationship.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { endingChoiceInput, focusInput } from "./relationship.server";

/** The ending choice Athena is currently waiting on, if any. */
export const getEndingChoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const {
      getOpenTransition,
      ENDING_INTRO_COPY,
      ENDING_PATHS,
      REST_HOLD_DAYS,
      restPeriodElapsed,
      REST_ELAPSED_INVITATION,
    } = await import("./relationship.server");
    const t = await getOpenTransition(supabase, userId);
    if (!t) return { pending: null };

    let otherName: string | null = null;
    if (t.connection_id) {
      const { data: conn } = await supabase
        .from("connections")
        .select("user_low, user_high")
        .eq("id", t.connection_id)
        .maybeSingle();
      if (conn) {
        const otherId = (conn.user_low === userId ? conn.user_high : conn.user_low) as string;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", otherId)
          .maybeSingle();
        otherName = (prof?.display_name as string | null) ?? null;
      }
    }

    return {
      pending: {
        id: t.id,
        choice: t.choice,
        hold_until: t.hold_until,
        other_name: otherName,
        intro: ENDING_INTRO_COPY,
        paths: ENDING_PATHS,
        rest_days: REST_HOLD_DAYS,
        // X-01 / F-30: a lapsed pause is an invitation, never an automatic return.
        rest_elapsed: restPeriodElapsed(t),
        rest_elapsed_invitation: REST_ELAPSED_INVITATION,
      },
    };
  });

/** Record which of the three paths the member chose. Always reversible. */
export const chooseEndingPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => endingChoiceInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ENDING_ACKNOWLEDGEMENTS, REST_HOLD_DAYS } = await import("./relationship.server");

    // Ownership is proven with the member-scoped client (RLS applies) BEFORE
    // any privileged write. `member_transitions` is SELECT-only for
    // `authenticated`, so the governed transition itself is written with the
    // service-role client, narrowly, for this member's own row.
    const { data: owned } = await supabase
      .from("member_transitions")
      .select("id, resolved_at")
      .eq("id", data.transition_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!owned) throw new Error("Not your transition");

    const now = new Date();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("member_transitions")
      .update({
        choice: data.choice,
        chosen_at: now.toISOString(),
        hold_until:
          data.choice === "rest"
            ? new Date(now.getTime() + REST_HOLD_DAYS * 864e5).toISOString()
            : null,
        resolved_at: data.choice === "resume" ? now.toISOString() : null,
      })
      .eq("id", data.transition_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    if (data.choice === "resume") {
      const { runMatchmakingForUser } = await import("./introductions.server");
      void runMatchmakingForUser(userId).catch(() => {});
    }

    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { evaluateReadiness } = await import("./readiness.server");
      await evaluateReadiness(supabaseAdmin, userId, "ending_path_chosen");
    }
    return { ok: true, acknowledgement: ENDING_ACKNOWLEDGEMENTS[data.choice] };
  });

/** Relationship Focus state for one connection, from this member's side. */
export const getFocusState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => focusInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const {
      getFocusRow,
      focusCheckInDue,
      FOCUS_INVITE_COPY,
      FOCUS_WAITING_COPY,
      FOCUS_STARTED_NOTICE,
      FOCUS_CHECKIN_COPY,
    } = await import("./relationship.server");

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");

    const row = await getFocusRow(supabase, data.connection_id);
    const isLow = conn.user_low === userId;
    const mineAt = row ? (isLow ? row.low_opted_in_at : row.high_opted_in_at) : null;
    const active = Boolean(row?.started_at && !row?.ended_at);

    // Gentle check-in: posted at read time, never more often than the doctrine allows.
    if (row && focusCheckInDue(row)) {
      const { postSystemMessage, findConversationId } = await import("./connections.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as unknown as typeof supabase;
      const conversationId = await findConversationId(
        admin,
        conn.user_low as string,
        conn.user_high as string,
      );
      if (conversationId) await postSystemMessage(admin, conversationId, FOCUS_CHECKIN_COPY);
      await admin
        .from("relationship_focus")
        .update({ last_checkin_at: new Date().toISOString() })
        .eq("id", row.id as string);
    }

    return {
      eligible: conn.status === "mutual_interest" || active,
      active,
      i_opted_in: Boolean(mineAt),
      started_at: (row?.started_at as string | null) ?? null,
      invite: FOCUS_INVITE_COPY,
      waiting: FOCUS_WAITING_COPY,
      started_notice: FOCUS_STARTED_NOTICE,
    };
  });

/** Opt into Relationship Focus. It only begins when both members choose it. */
export const optIntoFocus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => focusInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getFocusRow, FOCUS_STARTED_NOTICE, FOCUS_WAITING_COPY } = await import(
      "./relationship.server"
    );

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high, status")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");
    if (conn.status !== "mutual_interest") throw new Error("Not available yet");

    const isLow = conn.user_low === userId;
    const nowIso = new Date().toISOString();

    // Participation and eligibility are proven above with the member-scoped
    // client. `relationship_focus` is SELECT-only for `authenticated`, so the
    // opt-in itself is a narrow privileged write — and only ever to this
    // member's own side of the row. Mutual opt-in semantics are unchanged.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const writer = supabaseAdmin as unknown as typeof supabase;

    let row = await getFocusRow(supabase, data.connection_id);
    if (!row) {
      const { error } = await writer.from("relationship_focus").insert({
        connection_id: data.connection_id,
        user_low: conn.user_low as string,
        user_high: conn.user_high as string,
        low_opted_in_at: isLow ? nowIso : null,
        high_opted_in_at: isLow ? null : nowIso,
      });
      if (error) throw new Error(error.message);
      row = await getFocusRow(supabase, data.connection_id);
    } else if (!(isLow ? row.low_opted_in_at : row.high_opted_in_at)) {
      const { error } = await writer
        .from("relationship_focus")
        .update(isLow ? { low_opted_in_at: nowIso } : { high_opted_in_at: nowIso })
        .eq("id", row.id as string);
      if (error) throw new Error(error.message);
      row = await getFocusRow(supabase, data.connection_id);
    }


    const both = Boolean(row?.low_opted_in_at && row?.high_opted_in_at);
    if (both && row && !row.started_at) {
      const admin = writer;
      await admin
        .from("relationship_focus")
        .update({ started_at: nowIso })
        .eq("id", row.id as string);

      // Athena's role changes here, and she says so once — to both of them.
      const { postSystemMessage, findConversationId } = await import("./connections.server");
      const conversationId = await findConversationId(
        admin,
        conn.user_low as string,
        conn.user_high as string,
      );
      if (conversationId) await postSystemMessage(admin, conversationId, FOCUS_STARTED_NOTICE);

      // Outcome-learning (recording only): the strongest sanctioned signal.
      const { emitOutcomeSignal } = await import("./learning.server");
      emitOutcomeSignal({
        userA: conn.user_low as string,
        userB: conn.user_high as string,
        kind: "focus_started",
        dedupeKey: data.connection_id,
      });
    }

    return {
      active: both,
      message: both ? FOCUS_STARTED_NOTICE : FOCUS_WAITING_COPY,
    };
  });

/** Leave Relationship Focus. Athena offers each member the three paths after. */
export const endFocus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => focusInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getFocusRow, openEndingChoice, FOCUS_ENDED_NOTICE } = await import(
      "./relationship.server"
    );

    const { data: conn } = await supabase
      .from("connections")
      .select("id, user_low, user_high")
      .eq("id", data.connection_id)
      .maybeSingle();
    if (!conn) throw new Error("Not found");
    if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");

    const row = await getFocusRow(supabase, data.connection_id);
    if (!row || row.ended_at) return { ok: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as typeof supabase;
    await admin
      .from("relationship_focus")
      .update({ ended_at: new Date().toISOString(), ended_reason: "member_ended" })
      .eq("id", row.id as string);
    await admin
      .from("connections")
      .update({ status: "closed", closed_at: new Date().toISOString(), close_reason: "focus_ended" })
      .eq("id", data.connection_id);

    const { postSystemMessage, findConversationId } = await import("./connections.server");
    const conversationId = await findConversationId(
      admin,
      conn.user_low as string,
      conn.user_high as string,
    );
    if (conversationId) await postSystemMessage(admin, conversationId, FOCUS_ENDED_NOTICE);

    for (const uid of [conn.user_low as string, conn.user_high as string]) {
      await openEndingChoice(admin, { userId: uid, connectionId: data.connection_id });
    }

    // Outcome-learning (recording only). Duration milestones reached while
    // Focus was active are recorded alongside the ending, so endurance —
    // never engagement — is what the record reflects.
    {
      const { emitOutcomeSignal, focusMilestones } = await import("./learning.server");
      const both = {
        userA: conn.user_low as string,
        userB: conn.user_high as string,
      };
      const startedAt = row.started_at as string | null;
      if (startedAt) {
        for (const kind of focusMilestones(startedAt)) {
          emitOutcomeSignal({ ...both, kind, dedupeKey: data.connection_id });
        }
      }
      emitOutcomeSignal({ ...both, kind: "focus_ended", dedupeKey: data.connection_id });
      emitOutcomeSignal({
        ...both,
        kind: "connection_ended",
        reason: "focus_ended",
        dedupeKey: data.connection_id,
      });
    }

    return { ok: true };
  });
