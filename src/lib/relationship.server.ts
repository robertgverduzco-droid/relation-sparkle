// Server-only helpers for the Relationship Journey doctrine:
// (a) the three paths Athena offers after a relationship ends, and
// (b) Relationship Focus Mode, the mutual transition in Athena's role.
//
// Doctrine: docs/constitution/cross-cutting/relationship-journey.md
// Nothing here evaluates compatibility (L6b) or decides introductions (L6c);
// it only holds or releases the existing matchmaking gate and records state.
import * as z from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const endingChoiceInput = z.object({
  transition_id: z.string().uuid(),
  choice: z.enum(["rest", "resume", "talk"]),
});

export const focusInput = z.object({ connection_id: z.string().uuid() });

/** How long "take some time" holds introductions before Athena asks again. */
export const REST_HOLD_DAYS = 30;

/** Gentle check-ins are infrequent by design. Never more often than this. */
export const FOCUS_CHECKIN_DAYS = 21;

export const ENDING_INTRO_COPY =
  "Something meaningful just ended, and there's no correct timeline for what comes next. Whenever you're ready, tell me which feels right — and you can change your mind at any point.";

export const ENDING_PATHS = [
  {
    key: "rest" as const,
    label: "Take some time",
    detail: "No introductions for now. I'll check back in a while.",
  },
  {
    key: "resume" as const,
    label: "Begin receiving introductions again",
    detail: "I'll start looking when I genuinely see someone worth meeting.",
  },
  {
    key: "talk" as const,
    label: "Talk with me first",
    detail: "We can sit with this before you decide anything.",
  },
];

export const ENDING_ACKNOWLEDGEMENTS: Record<"rest" | "resume" | "talk", string> = {
  rest: "Then we'll rest. I won't bring anyone to you until you tell me you're ready, and I'll gently check back in a while.",
  resume:
    "Understood. I'll only bring someone to you when I genuinely believe it's worth your time — and you can pause this whenever you want.",
  talk: "Let's talk, then. Nothing changes until you decide it should.",
};

export const FOCUS_INVITE_COPY =
  "You've both said you'd like to keep going. If you choose Relationship Focus together, my role changes: I stop looking for anyone else and stay beside what the two of you are building.";

export const FOCUS_WAITING_COPY =
  "You've chosen Relationship Focus. It begins once they choose it too — this is a decision that belongs to both of you.";

export const FOCUS_STARTED_NOTICE =
  "You've both chosen Relationship Focus. My role has changed. I'm no longer looking for anyone else — I'm here for the two of you: a sounding board, a neutral perspective, a place to reflect. I belong to neither of you. I belong to this relationship, and I'll be here whenever you want me, and quiet when you don't.";

export const FOCUS_CHECKIN_COPY =
  "Just a quiet note that I'm still here — together or individually — whenever a perspective would help. No answer needed.";

export const FOCUS_ENDED_NOTICE =
  "Relationship Focus has ended. Whatever was shared here mattered, and I'll take my lead from each of you on what comes next.";

type Client = SupabaseClient;

export interface OpenTransition {
  id: string;
  connection_id: string | null;
  choice: "rest" | "resume" | "talk" | null;
  hold_until: string | null;
  created_at: string;
}

/** The member's current unresolved ending choice, if any. */
export async function getOpenTransition(
  supabase: Client,
  userId: string,
): Promise<OpenTransition | null> {
  const { data } = await supabase
    .from("member_transitions")
    .select("id, connection_id, choice, hold_until, created_at")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .maybeSingle();
  return (data as OpenTransition | null) ?? null;
}

/**
 * Opened when a connection closes. Athena offers a choice rather than
 * silently returning someone to matchmaking. Idempotent per member.
 */
export async function openEndingChoice(
  supabase: Client,
  args: { userId: string; connectionId: string },
): Promise<void> {
  const existing = await getOpenTransition(supabase, args.userId);
  if (existing) return;
  // ACL contract: `member_transitions` is SELECT-only for `authenticated`.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as unknown as Client).from("member_transitions").insert({
    user_id: args.userId,
    connection_id: args.connectionId,
  });
}

/** Relationship Focus row for a connection, if one exists. */
export async function getFocusRow(supabase: Client, connectionId: string) {
  const { data } = await supabase
    .from("relationship_focus")
    .select(
      "id, connection_id, user_low, user_high, low_opted_in_at, high_opted_in_at, started_at, last_checkin_at, ended_at",
    )
    .eq("connection_id", connectionId)
    .maybeSingle();
  return data;
}

/** True while the member is inside an active Relationship Focus. */
export async function hasActiveFocus(supabase: Client, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("relationship_focus")
    .select("id")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .is("ended_at", null)
    .not("started_at", "is", null)
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * The matchmaking hold implied by the Relationship Journey doctrine.
 * Never decides *who* to introduce — only whether Athena should be looking.
 */
export async function matchmakingHold(
  supabase: Client,
  userId: string,
): Promise<{ held: boolean; reason?: string; holdUntil?: string | null }> {
  if (await hasActiveFocus(supabase, userId)) {
    return { held: true, reason: "relationship_focus" };
  }
  const t = await getOpenTransition(supabase, userId);
  if (!t) return { held: false };
  if (t.choice === "resume") return { held: false };
  if (t.choice === "rest") {
    // X-01 / F-30: the end of a chosen pause NEVER returns a member to
    // matchmaking on its own. Athena may say the time has passed and invite
    // them to resume; only a deliberate choice releases the hold.
    return {
      held: true,
      reason: restPeriodElapsed(t) ? "rest_elapsed_awaiting_choice" : "resting",
      holdUntil: t.hold_until,
    };
  }
  // No choice yet, or "talk with me first" — Athena waits for the member.
  return { held: true, reason: t.choice === "talk" ? "talking_first" : "awaiting_choice" };
}

/**
 * Batch form of {@link matchmakingHold} for candidate-pool filtering.
 * A-05: the pool filter and the per-member check must never drift apart, so
 * both express the same doctrine — focus, unresolved transitions, and elapsed
 * rest all hold a member out until they deliberately resume.
 */
export async function heldMemberIds(supabase: Client): Promise<Set<string>> {
  const held = new Set<string>();
  const [{ data: focused }, { data: transitions }] = await Promise.all([
    supabase
      .from("relationship_focus")
      .select("user_low, user_high")
      .is("ended_at", null)
      .not("started_at", "is", null),
    supabase
      .from("member_transitions")
      .select("user_id, choice, hold_until")
      .is("resolved_at", null),
  ]);
  for (const f of focused ?? []) {
    held.add(f.user_low as string);
    held.add(f.user_high as string);
  }
  for (const t of transitions ?? []) {
    if (t.choice === "resume") continue;
    held.add(t.user_id as string);
  }
  return held;
}

/** True once a chosen rest period has passed. Never releases the hold by itself. */
export function restPeriodElapsed(t: {
  choice: string | null;
  hold_until: string | null;
}): boolean {
  if (t.choice !== "rest" || !t.hold_until) return false;
  return new Date(t.hold_until).getTime() <= Date.now();
}

/** Invitation shown when a rest period has elapsed. No urgency, no pressure. */
export const REST_ELAPSED_INVITATION =
  "The time you asked for has passed. Nothing has changed on my side — I'm not looking for anyone unless you tell me to. If and when you'd like to begin again, you can say so here. There's no hurry, and staying as you are is a complete answer.";


/** Read-time gentle check-in: infrequent, thoughtful, never an interruption. */
export function focusCheckInDue(row: {
  started_at: string | null;
  last_checkin_at: string | null;
  ended_at: string | null;
}): boolean {
  if (!row.started_at || row.ended_at) return false;
  const since = new Date(row.last_checkin_at ?? row.started_at).getTime();
  return (Date.now() - since) / 864e5 >= FOCUS_CHECKIN_DAYS;
}
