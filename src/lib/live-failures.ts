// Live Conversation failure vocabulary.
//
// The microphone layer (see mic-access.ts) answers "may we listen?". This
// module answers everything after that: whether the session could be created,
// whether the connection could be established, and whether the provider is
// available. A member whose microphone is already granted is never told to
// enable microphone access — every message here begins from the fact that the
// microphone is fine.

export type LiveFailure =
  /** The app's own session endpoint refused the caller (expired session). */
  | "auth-failed"
  /** Provider/session creation failed, or is not configured at all. */
  | "session-failed"
  /** Provider is configured but temporarily unavailable. */
  | "provider-unavailable"
  /** Provider quota or rate limit reached. */
  | "rate-limited"
  /** The provider account has no credit/quota left — billing, not traffic. */
  | "quota-exhausted"
  /** The SDP exchange or peer connection failed to establish. */
  | "connection-failed"
  /** The request never reached anything — offline, DNS, blocked. */
  | "network-failed"
  /** This browser has no WebRTC at all. */
  | "unsupported-browser"
  /** Everything opened, then dropped. */
  | "disconnected";

const MESSAGES: Record<LiveFailure, string> = {
  "auth-failed":
    "Your microphone is fine — your session expired before the conversation could open. Sign in again, or type here.",
  "session-failed":
    "Your microphone is fine — continuous conversation isn't available right now. You can still type here, and I'll answer aloud.",
  "provider-unavailable":
    "Your microphone is fine — the live conversation service isn't responding right now. Please try again in a moment, or type here.",
  "rate-limited":
    "Your microphone is fine — we've opened a lot of live conversations in a short time. Give it a minute, or type here.",
  "quota-exhausted":
    "Your microphone is fine — live conversation is temporarily unavailable. You can type here, and I'll answer aloud.",
  "connection-failed":
    "Your microphone is fine — the live connection couldn't be established, often a network or firewall restriction. You can try again, or type here.",
  "network-failed":
    "Your microphone is fine — I couldn't reach the conversation service. Check your connection, or type here.",
  "unsupported-browser":
    "This browser can't hold a live conversation. You can type here, and I'll answer aloud.",
  disconnected:
    "The live conversation dropped. You can start it again, or type here.",
};

export function liveFailureMessage(reason: LiveFailure): string {
  return MESSAGES[reason];
}

/** Maps the app's own session-endpoint status onto a member-facing failure. */
export function classifySessionStatus(status: number): LiveFailure {
  if (status === 401 || status === 403) return "auth-failed";
  if (status === 429) return "rate-limited";
  if (status === 503) return "session-failed";
  if (status >= 500) return "provider-unavailable";
  return "session-failed";
}

/**
 * A thrown fetch is indistinguishable from offline at the API level, so it is
 * reported as a network failure rather than guessed at.
 */
export function classifyThrown(error: unknown): LiveFailure {
  const err = error as { name?: string; message?: string } | undefined;
  const message = (err?.message ?? "").toLowerCase();
  if (err?.name === "TypeError" || message.includes("failed to fetch") || message.includes("networkerror")) {
    return "network-failed";
  }
  if (message.includes("peerconnection") || message.includes("sdp") || message.includes("ice")) {
    return "connection-failed";
  }
  return "connection-failed";
}

/** True when a message would wrongly ask an already-permitted member for access. */
export function asksForPermission(message: string): boolean {
  return /allow it in|permission|enable microphone|microphone access/i.test(message);
}

export function webrtcSupported(scope?: unknown): boolean {
  const w = (scope ?? (typeof window === "undefined" ? undefined : window)) as
    | { RTCPeerConnection?: unknown }
    | undefined;
  return typeof w?.RTCPeerConnection === "function";
}
