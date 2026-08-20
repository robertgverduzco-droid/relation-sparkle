/**
 * Beta remediation — authentication retry cooldown.
 *
 * There is no 48-hour cooldown written anywhere in this application. The only
 * throttles the app itself owns are:
 *   - `rateLimit`/`durableRateLimit` in `security.server.ts` (minutes, not days);
 *   - the password-recovery limiter in `recovery.server.ts` (3 per 15 minutes).
 *
 * The long wait members experience comes from the auth provider's own
 * email-send throttle, which is returned to the client as a 429 with a
 * retry hint. This module is the single place where that hint is interpreted:
 * it caps the *observed* wait at the beta ceiling of 2 hours, and turns it
 * into an honest, member-facing sentence that names the time they may try
 * again — never a generic failure.
 *
 * Nothing here weakens authentication: a short cooldown is still enforced,
 * the provider's own abuse protection is untouched, and the cap only affects
 * what this client will wait before allowing another attempt.
 */

/** Beta ceiling for any authentication retry cooldown. */
export const BETA_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/** Floor between two requests for the same address (anti-hammering). */
export const MIN_COOLDOWN_MS = 60_000;

const STORE_KEY = "athena-auth-retry-after";

/**
 * Read a retry delay out of whatever the auth provider gave us. Handles the
 * common shapes: an explicit `retry_after`, a "after N seconds" message, or a
 * generic email-rate-limit message with no number at all.
 */
export function parseRetryAfterMs(err: unknown): number {
  if (!err) return 0;
  const e = err as { status?: number; message?: string; retryAfter?: number };
  if (typeof e.retryAfter === "number" && e.retryAfter > 0) {
    return clampCooldown(e.retryAfter * 1000);
  }
  const msg = (e.message ?? "").toString();
  const seconds = msg.match(/after\s+(\d+)\s*second/i);
  if (seconds?.[1]) return clampCooldown(Number(seconds[1]) * 1000);
  const minutes = msg.match(/after\s+(\d+)\s*minute/i);
  if (minutes?.[1]) return clampCooldown(Number(minutes[1]) * 60_000);
  const hours = msg.match(/(\d+)\s*hour/i);
  if (hours?.[1]) return clampCooldown(Number(hours[1]) * 3_600_000);
  if (e.status === 429 || /rate limit|too many/i.test(msg)) return BETA_COOLDOWN_MS;
  return 0;
}

/** No cooldown may exceed the beta ceiling, and none may be trivially short. */
export function clampCooldown(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(BETA_COOLDOWN_MS, Math.max(MIN_COOLDOWN_MS, ms));
}

/** "You can request another email at 10:42 AM." — never a generic failure. */
export function cooldownMessage(readyAt: number, now = Date.now()): string {
  const remaining = Math.max(0, readyAt - now);
  if (remaining === 0) return "You can request another email now.";
  const mins = Math.ceil(remaining / 60_000);
  const at = new Date(readyAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const human = mins >= 60 ? `${Math.round(mins / 60)} hour${mins >= 90 ? "s" : ""}` : `${mins} minute${mins === 1 ? "" : "s"}`;
  return `Too many requests for this address. You can try again in about ${human} — at ${at}.`;
}

type Store = Record<string, number>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(s: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — the provider still enforces its own limit */
  }
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Epoch ms when this address may request again, or 0 if it may right now. */
export function retryReadyAt(email: string, now = Date.now()): number {
  const at = readStore()[normalize(email)] ?? 0;
  return at > now ? at : 0;
}

/** Record a cooldown observed from the provider, capped at the beta ceiling. */
export function noteCooldown(email: string, ms: number, now = Date.now()): number {
  const capped = clampCooldown(ms);
  if (capped === 0) return 0;
  const readyAt = now + capped;
  const store = readStore();
  store[normalize(email)] = readyAt;
  // Drop anything already elapsed so this never grows unbounded.
  for (const [k, v] of Object.entries(store)) if (v <= now) delete store[k];
  writeStore(store);
  return readyAt;
}

/** Clear the cooldown for an address after a successful send/sign-in. */
export function clearCooldown(email: string): void {
  const store = readStore();
  delete store[normalize(email)];
  writeStore(store);
}
