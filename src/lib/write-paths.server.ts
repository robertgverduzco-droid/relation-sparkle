// GOVERNED MEMBER WRITE PATHS
//
// After V1 stabilization the `authenticated` role has no INSERT/UPDATE grant
// on the relational/state tables below. Every legitimate member action here
// therefore follows one shape, and only this shape:
//
//   1. prove intent and membership with the MEMBER-SCOPED client (RLS applies);
//   2. perform the state transition with the SERVICE-ROLE client, always keyed
//      to the caller's own user_id — never on behalf of a counterpart.
//
// The clients are parameters rather than ambient imports so the transition can
// be exercised deterministically end-to-end (see write-path.test.ts). Never
// re-open these tables to the client to make an action work.
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient;

export type EndingChoice = "rest" | "resume" | "talk";

/** Record which of the three paths the member chose after an ending. */
export async function recordEndingChoice(
  member: Client,
  admin: Client,
  userId: string,
  input: { transition_id: string; choice: EndingChoice },
): Promise<{ ok: true }> {
  const { REST_HOLD_DAYS } = await import("./relationship.server");

  const { data: owned } = await member
    .from("member_transitions")
    .select("id, resolved_at")
    .eq("id", input.transition_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!owned) throw new Error("Not your transition");

  const now = new Date();
  const { error } = await admin
    .from("member_transitions")
    .update({
      choice: input.choice,
      chosen_at: now.toISOString(),
      hold_until:
        input.choice === "rest"
          ? new Date(now.getTime() + REST_HOLD_DAYS * 864e5).toISOString()
          : null,
      resolved_at: input.choice === "resume" ? now.toISOString() : null,
    })
    .eq("id", input.transition_id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  return { ok: true };
}

/**
 * Opt into Relationship Focus. It begins only when both members have chosen
 * it — a decision that belongs to the two of them, never to one.
 */
export async function optIntoFocusFor(
  member: Client,
  admin: Client,
  userId: string,
  connectionId: string,
): Promise<{ active: boolean; started: boolean; low: string; high: string }> {
  const { getFocusRow } = await import("./relationship.server");

  const { data: conn } = await member
    .from("connections")
    .select("id, user_low, user_high, status")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) throw new Error("Not found");
  if (conn.user_low !== userId && conn.user_high !== userId) throw new Error("Not yours");
  if (conn.status !== "mutual_interest") throw new Error("Not available yet");

  const isLow = conn.user_low === userId;
  const nowIso = new Date().toISOString();

  let row = await getFocusRow(member, connectionId);
  if (!row) {
    const { error } = await admin.from("relationship_focus").insert({
      connection_id: connectionId,
      user_low: conn.user_low as string,
      user_high: conn.user_high as string,
      low_opted_in_at: isLow ? nowIso : null,
      high_opted_in_at: isLow ? null : nowIso,
    });
    if (error) throw new Error(error.message);
    row = await getFocusRow(member, connectionId);
  } else if (!(isLow ? row.low_opted_in_at : row.high_opted_in_at)) {
    const { error } = await admin
      .from("relationship_focus")
      .update(isLow ? { low_opted_in_at: nowIso } : { high_opted_in_at: nowIso })
      .eq("id", row.id as string);
    if (error) throw new Error(error.message);
    row = await getFocusRow(member, connectionId);
  }

  const both = Boolean(row?.low_opted_in_at && row?.high_opted_in_at);
  const started = Boolean(both && row && !row.started_at);
  if (started && row) {
    await admin
      .from("relationship_focus")
      .update({ started_at: nowIso })
      .eq("id", row.id as string);
  }

  return {
    active: both,
    started,
    low: conn.user_low as string,
    high: conn.user_high as string,
  };
}

export type IntroductionResponse = "accepted" | "declined" | "deferred";

/**
 * Record this member's own answer to an introduction. Membership and
 * presentation are proven with the member-scoped client first; the response
 * itself is pinned to `userId` so no member can answer for the other.
 */
export async function recordIntroductionResponse(
  member: Client,
  admin: Client,
  userId: string,
  input: { pair_id: string; response: IntroductionResponse; note?: string | undefined },
): Promise<{ isLow: boolean; low: string; high: string }> {
  const { data: pair } = await member
    .from("pair_reasoning")
    .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
    .eq("id", input.pair_id)
    .maybeSingle();

  if (!pair) throw new Error("Introduction not found");
  const isLow = pair.user_low === userId;
  const isHigh = pair.user_high === userId;
  if (!isLow && !isHigh) throw new Error("Not your introduction");
  if ((isLow && !pair.presented_to_a_at) || (isHigh && !pair.presented_to_b_at)) {
    throw new Error("Introduction has not been presented to you");
  }

  const { error: respErr } = await admin.from("introduction_responses").upsert(
    { pair_id: input.pair_id, user_id: userId, response: input.response, note: input.note ?? null },
    { onConflict: "pair_id,user_id" },
  );
  if (respErr) throw new Error(respErr.message);

  const { error: fbErr } = await admin.from("introduction_feedback").insert({
    pair_id: input.pair_id,
    user_id: userId,
    kind: input.response,
    perspective: input.note ?? null,
    signals: {},
  });
  if (fbErr) throw new Error(fbErr.message);

  return { isLow, low: pair.user_low as string, high: pair.user_high as string };
}

/**
 * A private, qualitative note to Athena about visual response. Never shown to
 * the counterpart, never a rating of a human being.
 */
export async function recordAttractionFor(
  member: Client,
  admin: Client,
  userId: string,
  input: { pair_id: string; response: "drawn" | "curious" | "unsure" | "not_there" },
): Promise<{ ok: true }> {
  const { counterpartForPresentedPair } = await import("./attraction.server");
  await counterpartForPresentedPair(member, input.pair_id, userId);

  const { error } = await admin.from("introduction_attraction").upsert(
    { pair_id: input.pair_id, user_id: userId, response: input.response },
    { onConflict: "pair_id,user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}
