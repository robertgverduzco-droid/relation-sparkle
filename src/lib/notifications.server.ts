// Server-only: notification creation and delivery rules.
//
// Doctrine: a notification exists only when it supports a meaningful member
// action. No streaks, countdowns, scarcity, re-engagement nudges, unread
// pressure, social comparison, or match-volume promotion. Success is measured
// by relationship quality, never by sessions or opens.
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationCategory =
  | "account"
  | "athena"
  | "introductions"
  | "connections"
  | "messages"
  | "reflection"
  | "relationship"
  | "safety";

/** Categories a member cannot switch off: account state and safety. */
const ESSENTIAL: NotificationCategory[] = ["account", "safety"];

const PREF_COLUMN: Partial<Record<NotificationCategory, string>> = {
  messages: "messages",
  introductions: "introductions",
  reflection: "reflection",
  athena: "athena",
  relationship: "relationship",
  connections: "messages",
};

export type NotifyInput = {
  userId: string;
  category: NotificationCategory;
  eventType: string;
  /** Privacy-conscious: previews never carry private reasoning or intimate detail. */
  title: string;
  body?: string | null;
  actionPath?: string | null;
  /** Stable per underlying event so the same event never notifies twice. */
  dedupeKey: string;
  expiresAt?: string | null;
};

/**
 * Create an in-app notification if — and only if — the member is eligible for
 * it. Silent no-op otherwise. Never throws into caller flows.
 */
export async function notify(
  supabase: SupabaseClient,
  input: NotifyInput,
): Promise<{ created: boolean; reason?: string }> {
  try {
    // ACL contract: `notifications` is SELECT-only for `authenticated`.
    // Creation is a platform action, so the row is always written with the
    // service-role client regardless of which client the caller passed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const writer = supabaseAdmin as unknown as SupabaseClient;
    const { featureEnabled } = await import("./security.server");
    if (!(await featureEnabled("notifications"))) return { created: false, reason: "paused" };
    const essential = ESSENTIAL.includes(input.category);


    // Deleted account: no profile row, nothing is ever delivered.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_paused")
      .eq("id", input.userId)
      .maybeSingle();
    if (!profile) return { created: false, reason: "no_account" };

    // Paused account: only essential account/safety notifications continue.
    if (profile.is_paused && !essential) return { created: false, reason: "paused" };

    // A-18 — relationship-state guard. A member in Relationship Focus Mode or
    // in a chosen Rest is not being matched, so an introductions notification
    // would be both untrue and an intrusion. The hold rule has one source
    // (relationship.server.heldMemberIds); this reuses it rather than
    // re-deriving state.
    if (input.category === "introductions") {
      const { heldMemberIds } = await import("./relationship.server");
      const held = await heldMemberIds(supabase as never);
      if (held.has(input.userId)) return { created: false, reason: "relationship_hold" };
    }


    if (!essential) {
      const col = PREF_COLUMN[input.category];
      if (col) {
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("messages, introductions, reflection, athena, relationship")
          .eq("user_id", input.userId)
          .maybeSingle();
        if (prefs && (prefs as Record<string, boolean>)[col] === false) {
          return { created: false, reason: "preference_off" };
        }
      }
    }

    const { error } = await writer.from("notifications").insert({
      user_id: input.userId,
      category: input.category,
      event_type: input.eventType,
      title: input.title,
      body: input.body ?? null,
      action_path: input.actionPath ?? null,
      channel: "in_app",
      delivery_status: "delivered",
      dedupe_key: input.dedupeKey,
      expires_at: input.expiresAt ?? null,
    });
    // Unique (user_id, dedupe_key) makes repeat events idempotent.
    if (error) return { created: false, reason: "duplicate_or_error" };
    return { created: true };
  } catch {
    return { created: false, reason: "error" };
  }
}

/**
 * Mark notifications pointing at a flow that no longer exists as obsolete so
 * members are never routed into a closed or invalid state.
 */
export async function obsoleteNotifications(
  supabase: SupabaseClient,
  userId: string,
  eventTypes: string[],
  matchPathPrefix?: string,
): Promise<void> {
  // ACL contract: system-owned column, privileged write only.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  void supabase;
  let q = (supabaseAdmin as unknown as SupabaseClient)
    .from("notifications")
    .update({ obsolete_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("event_type", eventTypes)
    .is("obsolete_at", null);
  if (matchPathPrefix) q = q.like("action_path", `${matchPathPrefix}%`);
  await q;
}

// --- Copy helpers ------------------------------------------------------
// Deliberately plain. A locked phone screen reveals nothing private: no
// Athena reasoning, no other member's information, no reflection content.

export const NOTIFICATION_COPY = {
  introduction_new: {
    title: "Athena has someone for you to consider",
    body: "There's a new introduction waiting whenever you have a quiet moment.",
  },
  // Never names the other member, the constraint, or whose preference it is.
  profile_detail_needed: {
    title: "A small detail would help Athena",
    body: "There's something in your profile Athena doesn't know yet. Adding it helps her think clearly about who to introduce you to.",
  },
  introduction_mutual: {
    title: "You both said yes",
    body: "A conversation is open when you're ready.",
  },
  message_new: {
    title: "New message",
    body: "You have a new message in one of your conversations.",
  },
  reflection_available: {
    title: "Athena would like to hear how it went",
    body: "Whenever you're ready, there's a short conversation waiting.",
  },
  meeting_proposal: {
    title: "A meeting has been proposed",
    body: "There's something to look at in one of your connections.",
  },
  focus_started: {
    title: "Relationship Focus has begun",
    body: "Athena's role has changed for the two of you.",
  },
  ending_choice: {
    title: "Athena has left a choice with you",
    body: "Whenever you're ready, you can tell her what you'd like next.",
  },
  account_state: {
    title: "Your account has changed",
    body: "There's an update on your account.",
  },
  photo_rejected: {
    title: "A photo needs another try",
    body: "One of your photos didn't meet what's needed for your profile. Feel free to add a different one — there's no limit on trying again.",
  },
  photo_unapproved: {
    title: "A photo was taken down",
    body: "One of your approved photos no longer meets what's needed and has been removed from your profile. If that was your only approved photo, introductions will pause until you add a new one — nothing else about your account has changed.",
  },
  safety_update: {
    title: "A safety update",
    body: "There's information about a recent report on your account.",
  },
  account_suspended: {
    title: "Your account is on hold",
    body: "Athena's team reviewed a report and placed a hold on your account. You can see why, and respond, from your account settings.",
  },
  appeal_granted: {
    title: "Your appeal was granted",
    body: "Athena's team reviewed your appeal and agreed — the hold has been lifted.",
  },
  appeal_upheld: {
    title: "A decision on your appeal",
    body: "Athena's team reviewed your appeal. The hold stands.",
  },
} as const;
