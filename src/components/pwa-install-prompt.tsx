import { useEffect, useState } from "react";

// Non-intrusive install prompt.
// - Chromium/Android: uses the native `beforeinstallprompt` deferred event.
// - iOS Safari: shows Add-to-Home-Screen instructions (no programmatic API).
// - Hidden once installed (display-mode: standalone) or dismissed for 30 days.

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ri-pwa-install-dismissed-at";
const DISMISS_DAYS = 30;

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const when = Number(raw);
    if (!Number.isFinite(when)) return false;
    return Date.now() - when < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && "ontouchend" in document;
  return iOSDevice || iPadOS;
}

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (isRecentlyDismissed()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      // Small delay so it doesn't crash a first paint.
      window.setTimeout(() => setVisible(true), 1200);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari has no beforeinstallprompt. Show the manual hint after a
    // meaningful pause so it doesn't feel like a popup.
    if (isIos()) {
      const t = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 4000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
      };
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  async function accept() {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
    markDismissed();
  }

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto max-w-[480px] px-4">
      <div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Keep Athena close
        </p>
        {iosHint && !deferred ? (
          <>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground">
              Add Relationship Intelligence to your Home Screen. Tap the
              <span className="mx-1 inline-block rounded border border-border px-1 text-[12px]">Share</span>
              icon in Safari, then <span className="font-medium">Add to Home Screen</span>.
            </p>
            <div className="mt-3 flex justify-end">
              <button
                onClick={dismiss}
                className="rounded-full border border-border px-4 py-1.5 text-[13px] text-foreground"
              >
                Got it
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground">
              Install the app for a quieter, faster way to return to Athena.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={dismiss}
                className="rounded-full border border-border px-4 py-1.5 text-[13px] text-muted-foreground"
              >
                Not now
              </button>
              <button
                onClick={accept}
                className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground"
              >
                Install
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
