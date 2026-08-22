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
/** Set once the one-time arrival welcome has actually been delivered. */
export const ARRIVAL_DELIVERED_KEY = "athena-arrival-delivered";
/** Set once the *written* welcome has appeared during onboarding. */
export const ARRIVAL_SHOWN_KEY = "athena-arrival-shown";

/**
 * Arrival is an account-scoped moment, not a browser-scoped one. Two people
 * signing in on the same device each deserve their own first welcome, and the
 * same person must never receive a second one. Every key below is therefore
 * namespaced by account id; an unknown account falls back to the bare key
 * only so that pre-sign-in surfaces keep working.
 */
export function scopedKey(base: string, accountId: string | null | undefined): string {
  return accountId ? `${base}:${accountId}` : base;
}

function readFlag(base: string, accountId: string | null | undefined): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(scopedKey(base, accountId)) === "1";
  } catch {
    return true;
  }
}

function writeFlag(base: string, accountId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedKey(base, accountId), "1");
  } catch {
    /* ignore */
  }
}

/** Has this account already received the one-time *spoken* arrival welcome? */
export function arrivalDelivered(accountId?: string | null): boolean {
  return readFlag(ARRIVAL_DELIVERED_KEY, accountId);
}

export function markArrivalDelivered(accountId?: string | null): void {
  writeFlag(ARRIVAL_DELIVERED_KEY, accountId);
}

/**
 * The written welcome shown during onboarding is a separate record. Reading
 * the words on screen must never consume Athena's spoken first greeting: she
 * still says them herself when the member reaches her.
 */
export function arrivalShown(accountId?: string | null): boolean {
  return readFlag(ARRIVAL_SHOWN_KEY, accountId);
}

export function markArrivalShown(accountId?: string | null): void {
  writeFlag(ARRIVAL_SHOWN_KEY, accountId);
}



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

export function readLastSeen(accountId?: string | null): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(scopedKey(LAST_SEEN_KEY, accountId));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markSeen(accountId?: string | null, now = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedKey(LAST_SEEN_KEY, accountId), String(now));
  } catch {
    /* storage unavailable — the greeting simply stays silent */
  }
}

export function sessionGreeted(accountId?: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(scopedKey(SESSION_GREETED_KEY, accountId)) === "1";
  } catch {
    return true;
  }
}

export function markSessionGreeted(accountId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(scopedKey(SESSION_GREETED_KEY, accountId), "1");
  } catch {
    /* ignore */
  }
}
