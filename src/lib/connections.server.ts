// Server-only helpers for connections & post-meeting reflection.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const reflectAskInput = z.object({
  connection_id: z.string().uuid(),
  messages: z.array(messageSchema),
});

export const reflectDistillInput = z.object({ connection_id: z.string().uuid() });

export const reflectionSchema = z.object({
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

export const idInput = z.object({ connection_id: z.string().uuid() });

export const proposeInput = z.object({
  connection_id: z.string().uuid(),
  when_text: z.string().max(200).optional(),
  where_text: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  scheduled_for: z.string().datetime().optional(),
});

export const proposalActionInput = z.object({
  proposal_id: z.string().uuid(),
  action: z.enum(["confirm", "complete", "cancel"]),
});

// Private, internal-only post-meeting feedback about the OTHER person.
// Athena uses this to build understanding of how someone actually shows up
// in real meetings. The subject never sees any of it. When concerning
// patterns emerge across multiple independent authors, safety review kicks in.
export const partnerPerceptionInput = z.object({
  connection_id: z.string().uuid(),
  warmth: z.number().int().min(1).max(5).nullable().optional(),
  honesty: z.number().int().min(1).max(5).nullable().optional(),
  safety: z.number().int().min(1).max(5).nullable().optional(),
  chemistry: z.number().int().min(1).max(5).nullable().optional(),
  would_meet_again: z.boolean().nullable().optional(),
  surprised_by: z.string().max(1000).optional(),
  concerns: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});


import { runtimeDoctrine } from "./athena-doctrine.server";
import { PROMPT_BOUNDARY, asMemberData } from "./security.server";

export function reflectSystemPrompt(otherName: string, recentMemberText = ""): string {
  return `${PROMPT_BOUNDARY}

You are Athena.

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

${runtimeDoctrine("meeting", recentMemberText)}

If this is the very beginning, greet them gently and ask how the meeting was, in your own words. Let them set the pace.`;
}

export async function openConnectionIfMutual(
  supabase: SupabaseClient,
  pairId: string,
): Promise<string | null> {
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

  const accepted = new Set(
    (responses ?? [])
      .filter((r) => r.response === "accepted")
      .map((r) => r.user_id as string),
  );
  if (!accepted.has(pair.user_low as string) || !accepted.has(pair.user_high as string)) {
    return null;
  }

  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("pair_id", pairId)
    .maybeSingle();
  if (existing) return existing.id as string;

  // ACL contract: `connections` is SELECT-only for `authenticated`; opening a
  // connection is a platform action taken only after mutual acceptance above.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: opened } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("connections")
    .insert({
      pair_id: pairId,
      user_low: pair.user_low,
      user_high: pair.user_high,
      status: "open",
    })
    .select("id")
    .maybeSingle();

  const connectionId = (opened?.id as string) ?? null;
  if (connectionId) {
    const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
    for (const uid of [pair.user_low as string, pair.user_high as string]) {
      await notify(supabase, {
        userId: uid,
        category: "introductions",
        eventType: "introduction_mutual",
        title: NOTIFICATION_COPY.introduction_mutual.title,
        body: NOTIFICATION_COPY.introduction_mutual.body,
        actionPath: `/connections/${connectionId}`,
        dedupeKey: `introduction_mutual:${connectionId}`,
      });
    }
  }
  return connectionId;
}


// ---------------------------------------------------------------------------
// Athena Reflection Flow (post-date experience)
//
// North star: every reflection should leave the member feeling more understood
// than when they began, while helping Athena understand them more deeply for
// every future introduction.
//
// This is additive. The free-form reflection conversation and the private
// partner-perception questions above remain exactly as they were.
// ---------------------------------------------------------------------------

export const REFLECTION_INTRO =
  "Your reflections help me understand both the person you met and the person you are becoming. The more honestly you share your experience, the more thoughtfully I can guide future introductions.";

export const REFLECTION_FEELINGS = [
  "Comfortable",
  "Relaxed",
  "Excited",
  "Curious",
  "Nervous",
  "Unsure",
  "Disconnected",
  "Other",
] as const;

export const REFLECTION_CLOSINGS: Record<"yes" | "no" | "not_sure", string> = {
  yes: "I'm happy to hear that. I'll continue supporting you as you get to know one another. Whenever you'd like to reflect on your experiences together or talk something through, I'm here.",
  not_sure:
    "That's perfectly okay. Meaningful relationships sometimes take time to understand. Whenever you're ready to reflect again, I'll be here.",
  no: "Thank you for telling me honestly. I'll carry what you shared into every introduction that comes next.",
};

export const reflectionSubmitInput = z.object({
  connection_id: z.string().uuid(),
  feeling_tags: z.array(z.string().max(40)).max(10).default([]),
  feeling_other: z.string().max(200).optional(),
  most_genuine: z.string().max(4000).optional(),
  greatest_difference: z.string().max(4000).optional(),
  self_understanding: z.string().max(4000).optional(),
  continue_decision: z.enum(["yes", "no", "not_sure"]),
  decision_reason: z.string().max(4000).optional(),
  anything_else: z.string().max(4000).optional(),
});

/**
 * When a member says they don't want to continue, the introduction is
 * complete: the connection closes, the pair leaves their active set, and the
 * slot frees up for a future introduction. "Yes" and "not sure yet" both leave
 * the introduction active — nothing changes.
 */
export async function applyReflectionOutcome(
  userScoped: SupabaseClient,
  args: { connectionId: string; userId: string; decision: "yes" | "no" | "not_sure" },
): Promise<{ closed: boolean }> {
  if (args.decision !== "no") return { closed: false };
  // Closing the pair is a platform action, not a member-scoped write.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const supabase = supabaseAdmin as unknown as SupabaseClient;
  void userScoped;

  const { data: conn } = await supabase
    .from("connections")
    .select("id, pair_id, status")
    .eq("id", args.connectionId)
    .maybeSingle();
  if (!conn) return { closed: false };

  await supabase
    .from("connections")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      close_reason: "reflection_complete",
    })
    .eq("id", args.connectionId);

  if (conn.pair_id) {
    await supabase
      .from("pair_reasoning")
      .update({ status: "closed", is_stale: true, stale_reason: "reflection complete" })
      .eq("id", conn.pair_id as string);
  }

  return { closed: true };
}

// ---------------------------------------------------------------------------
// Reflection extensions (seven approved product decisions).
//
// Everything below is additive. The guided reflection flow, the free-form
// reflection conversation, the private partner-perception questions, and the
// existing safety system all keep working exactly as they did.
// ---------------------------------------------------------------------------

/** Neutral copy shown to the member who did not select "No". */
export const REFLECTION_CONCLUDED_NOTICE =
  "This introduction has concluded. Continuing requires mutual interest from both people. Nothing about the other person's reflection is shared.";

export const REFLECTION_CONCLUDED_INVITE =
  "When you're ready, I'd still like to hear how the experience was for you. Your private reflection helps me understand you better for what comes next.";

export const MUTUAL_YES_NOTICE =
  "You've both said you'd like to keep getting to know one another. I'll stay close as this unfolds.";

/** Athena's gentle "not yet" state before a meeting has plausibly happened. */
export const REFLECTION_NOT_YET =
  "There's no rush. Once you've actually spent time together, I'll be here to reflect on it with you.";

export const REFLECTION_CHECKIN_DAYS = 10;
export const REQUIRED_REFLECTION_GRACE_DAYS = 14;

/** Find the conversation shared by a pair, if one exists. */
export async function findConversationId(
  supabase: SupabaseClient,
  a: string,
  b: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .or(`and(user_a.eq.${a},user_b.eq.${b}),and(user_a.eq.${b},user_b.eq.${a})`)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Post a neutral Athena system message into a pair's conversation. */
export async function postSystemMessage(
  supabase: SupabaseClient,
  conversationId: string,
  body: string,
): Promise<void> {
  // Athena's own system messages carry no member sender and are written with
  // the service-role client; member RLS requires sender_id = auth.uid().
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  void supabase;
  await (supabaseAdmin as unknown as SupabaseClient).from("messages").insert({
    conversation_id: conversationId,
    sender_id: null,
    kind: "system",
    body,
  });
}

/**
 * Decision 2 — reflection timing.
 *
 * A reflection only opens once Athena has a reasonable indication that a
 * meaningful interaction actually happened. Uses existing signals only:
 *   - a meeting proposal completed, or scheduled more than 4 hours ago, OR
 *   - the pair has messaged on two distinct days and the connection is 72h old.
 */
export async function computeReflectionAvailability(
  supabase: SupabaseClient,
  args: { connectionId: string; openedAt: string; userLow: string; userHigh: string },
): Promise<{ available: boolean; reason: string }> {
  const now = Date.now();

  const { data: proposals } = await supabase
    .from("meeting_proposals")
    .select("status, scheduled_for, completed_at")
    .eq("connection_id", args.connectionId);

  for (const p of proposals ?? []) {
    if (p.status === "completed" || p.completed_at) {
      return { available: true, reason: "meeting_completed" };
    }
    const when = p.scheduled_for as string | null;
    if (when && now - new Date(when).getTime() > 4 * 60 * 60 * 1000) {
      return { available: true, reason: "meeting_time_passed" };
    }
  }

  const ageHours = (now - new Date(args.openedAt).getTime()) / 36e5;
  if (ageHours >= 72) {
    const conversationId = await findConversationId(supabase, args.userLow, args.userHigh);
    if (conversationId) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("created_at, sender_id")
        .eq("conversation_id", conversationId)
        .not("sender_id", "is", null)
        .limit(500);
      const days = new Set(
        (msgs ?? []).map((m) => (m.created_at as string).slice(0, 10)),
      );
      if (days.size >= 2) return { available: true, reason: "sustained_conversation" };
    }
  }

  return { available: false, reason: "too_early" };
}

/**
 * Decision 3 — "I'm not sure yet" check-in.
 *
 * Read-time only: no cron, no new state machine. True when the last
 * "not sure" reflection is old, nothing has happened since, and Athena
 * hasn't already checked in about it.
 */
export function shouldCheckInAfterUnsure(args: {
  lastDecision: string | null;
  lastSubmittedAt: string | null;
  lastActivityAt: string | null;
  lastCheckinAt: string | null;
}): boolean {
  if (args.lastDecision !== "not_sure" || !args.lastSubmittedAt) return false;
  const submitted = new Date(args.lastSubmittedAt).getTime();
  const ageDays = (Date.now() - submitted) / 864e5;
  if (ageDays < REFLECTION_CHECKIN_DAYS) return false;
  if (args.lastActivityAt && new Date(args.lastActivityAt).getTime() > submitted) return false;
  if (args.lastCheckinAt && new Date(args.lastCheckinAt).getTime() > submitted) return false;
  return true;
}

export const REFLECTION_CHECKIN_COPY =
  "It's been a little while since you last reflected on this introduction. Whenever you're ready, I'd like to hear where things stand for you now.";

/**
 * Decision 7 — Athena's acknowledgement prompt.
 *
 * She reflects back what she heard. She never advises, never nudges toward or
 * away from continuing, and never references the other person's answers.
 */
export function acknowledgementPrompt(args: {
  otherName: string;
  feelings: string[];
  feelingOther?: string | null;
  mostGenuine?: string | null;
  greatestDifference?: string | null;
  selfUnderstanding?: string | null;
  decision: "yes" | "no" | "not_sure";
  decisionReason?: string | null;
  anythingElse?: string | null;
}): string {
  const lines = [
    `Feelings named: ${[...args.feelings, args.feelingOther].filter(Boolean).join(", ") || "none named"}`,
    `Most genuine moment: ${args.mostGenuine || "—"}`,
    `Greatest difference noticed: ${args.greatestDifference || "—"}`,
    `What they learned about themselves: ${args.selfUnderstanding || "—"}`,
    `Their decision: ${args.decision}`,
    `Reason given: ${args.decisionReason || "—"}`,
    `Anything else: ${args.anythingElse || "—"}`,
  ].join("\n");

  return `${PROMPT_BOUNDARY}

You are Athena, speaking privately with a member who has just finished reflecting on time spent with ${args.otherName}.

Write a brief acknowledgement — two or three sentences, no more.

Absolute constraints:
- Reflect back what you actually heard, in your own quiet, warm, unhurried voice.
- Match their emotional tone. Do not brighten it, do not darken it.
- Never advise, never evaluate, never encourage or discourage continuing.
- Never mention or imply anything about the other person's reflection.
- No questions, no lists, no headings. Plain prose.

WHAT THEY SHARED:
${asMemberData(lines)}`;
}

/**
 * Decision 1 — the other member must still reflect before Athena introduces
 * them to someone new. Mark the reflection as required and record when the
 * wait began (a 14-day grace keeps a silent member from being locked out).
 */
export async function markReflectionRequired(
  supabase: SupabaseClient,
  args: { connectionId: string; userId: string },
): Promise<void> {
  const { data: existing } = await supabase
    .from("post_meeting_reflections")
    .select("id, submitted_at, reflection_required")
    .eq("connection_id", args.connectionId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (existing?.submitted_at) return; // already reflected — nothing required

  // ACL contract: `post_meeting_reflections` is SELECT-only for `authenticated`.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const writer = supabaseAdmin as unknown as SupabaseClient;

  if (existing) {
    await writer
      .from("post_meeting_reflections")
      .update({ reflection_required: true, required_since: new Date().toISOString() })
      .eq("id", existing.id as string);
    return;
  }

  await writer.from("post_meeting_reflections").insert({
    connection_id: args.connectionId,
    user_id: args.userId,
    transcript: [],
    reflection_required: true,
    required_since: new Date().toISOString(),
  });

  const { notify, NOTIFICATION_COPY } = await import("./notifications.server");
  await notify(supabase, {
    userId: args.userId,
    category: "reflection",
    eventType: "reflection_available",
    title: NOTIFICATION_COPY.reflection_available.title,
    body: NOTIFICATION_COPY.reflection_available.body,
    actionPath: `/connections/${args.connectionId}`,
    // One notification per connection, ever: no repeated pressure.
    dedupeKey: `reflection_available:${args.connectionId}:${args.userId}`,
  });
}

/**
 * Decision 5 — mutual "Yes". Returns true when the other member's most recent
 * submitted reflection also says yes. Callers move the connection into
 * `mutual_interest`, which is the entry point Relationship Focus Mode will
 * attach to later. No parallel system is created here.
 */
export async function detectMutualYes(
  supabase: SupabaseClient,
  args: { connectionId: string; otherUserId: string },
): Promise<boolean> {
  const { data } = await supabase
    .from("reflection_submissions")
    .select("continue_decision")
    .eq("connection_id", args.connectionId)
    .eq("user_id", args.otherUserId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.continue_decision as string | null) === "yes";
}
