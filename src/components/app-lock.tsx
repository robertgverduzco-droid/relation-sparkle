// F-12 — optional local application lock.
//
// A shared or briefly-borrowed phone should not expose a member's Athena
// conversations. When the member enables the lock, a PIN is required after the
// app is backgrounded or reloaded. The PIN is hashed locally with a random
// salt and never leaves the device; it is a device-local privacy screen, not
// an authentication factor, and it is deliberately independent of the session.
import { useCallback, useEffect, useState } from "react";

const SALT_KEY = "ri.lock.salt";
const HASH_KEY = "ri.lock.hash";
const UNLOCK_KEY = "ri.lock.until";
const GRACE_MS = 2 * 60 * 1000;

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export function isAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(HASH_KEY));
}

export async function enableAppLock(pin: string): Promise<void> {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(HASH_KEY, await hashPin(pin, salt));
  localStorage.setItem(UNLOCK_KEY, String(Date.now() + GRACE_MS));
}

export function disableAppLock(): void {
  localStorage.removeItem(SALT_KEY);
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(UNLOCK_KEY);
}

export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const relock = useCallback(() => {
    if (!isAppLockEnabled()) return;
    const until = Number(localStorage.getItem(UNLOCK_KEY) ?? 0);
    if (Date.now() > until) setLocked(true);
  }, []);

  useEffect(() => {
    relock();
    const onHide = () => {
      if (document.visibilityState === "hidden" && isAppLockEnabled()) {
        localStorage.setItem(UNLOCK_KEY, String(Date.now() + GRACE_MS));
      } else {
        relock();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [relock]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    const salt = localStorage.getItem(SALT_KEY);
    const stored = localStorage.getItem(HASH_KEY);
    if (!salt || !stored) return setLocked(false);
    if ((await hashPin(pin, salt)) !== stored) {
      setError("That PIN doesn't match.");
      setPin("");
      return;
    }
    localStorage.setItem(UNLOCK_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
    setPin("");
    setError(null);
    setLocked(false);
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-8">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Relationship Intelligence
      </p>
      <h1 className="mt-3 font-display text-[1.6rem] text-foreground">Locked</h1>
      <p className="mt-2 text-center text-sm text-ink-soft">
        Enter your PIN to return to your conversations.
      </p>
      <form onSubmit={unlock} className="mt-6 w-full max-w-xs space-y-3">
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-full border border-border bg-card px-5 py-3 text-center text-lg tracking-[0.4em] text-foreground"
          placeholder="••••"
          aria-label="App lock PIN"
        />
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
