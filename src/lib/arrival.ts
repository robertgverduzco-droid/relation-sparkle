/**
 * D5 — Arrival & return greeting rules (V1).
 *
 * Pure, testable rules for two moments only:
 *   - the member's first-ever arrival with Athena (spoken once, ever);
 *   - a genuine return to a new session (spoken at most once per session).
 *
 * Everything here is text-first: the caller renders the same words visibly
 * whether or not audio is available, so nothing essential depends on hearing
 * Athena.
 */

/** The one-time spoken welcome. Text equivalence is mandatory. */
export const ARRIVAL_WELCOME =
  "Welcome to Athena. The next evolution of matchmaking. Let's begin with you.";

/**
 * A "meaningful return" is a new browser session that begins at least this
 * long after the member's last recorded activity. Backgrounding, app
 * switching, tab focus changes and in-session navigation never qualify.
 */
export const RETURN_IDLE_MS = 30 * 60 * 1000;

export const LAST_SEEN_KEY = "athena-last-seen";
export const SESSION_GREETED_KEY = "athena-session-greeted";

/**
 * Only member-provided identity is ever spoken. No inference from email,
 * handles, or anything Athena has learned in conversation.
 */
export function usableFirstName(displayName: string | null | undefined): string | null {
  const raw = (displayName ?? "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return null; // an email address is not a chosen name
  const first = raw.split(/\s+/)[0]?.replace(/[^\p{L}\p{M}'’-]/gu, "") ?? "";
  if (first.length < 2 || first.length > 40) return null;
  return first;
}

/** "Welcome back, Robert." — or simply "Welcome back." Never more. */
export function returnGreeting(firstName: string | null): string {
  return firstName ? `Welcome back, ${firstName}.` : "Welcome back.";
}

export type ReturnContext = {
  /** Already greeted in this browser session. */
  sessionGreeted: boolean;
  /** Epoch ms of last recorded activity, or null if unknown. */
  lastSeenAt: number | null;
  /** Now, epoch ms. */
  now: number;
  /** Something meaningful is in progress — never interrupt it. */
  busy: boolean;
  /** The member has audio switched off (voice kill switch / text mode). */
  audioEnabled: boolean;
};

/**
 * Should Athena *speak* the return greeting? The visible greeting is always
 * rendered; this governs audio only.
 */
export function shouldSpeakReturn(ctx: ReturnContext): boolean {
  if (!ctx.audioEnabled) return false;
  if (ctx.busy) return false;
  if (ctx.sessionGreeted) return false;
  if (ctx.lastSeenAt === null) return false; // first ever visit is not a return
  return ctx.now - ctx.lastSeenAt >= RETURN_IDLE_MS;
}

export function readLastSeen(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markSeen(now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, String(now));
  } catch {
    /* storage unavailable — the greeting simply stays silent */
  }
}

export function sessionGreeted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_GREETED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSessionGreeted(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_GREETED_KEY, "1");
  } catch {
    /* ignore */
  }
}
