// Shared PWA install logic.
//
// The automatic prompt (src/components/pwa-install-prompt.tsx) and the
// persistent manual action (src/components/install-app-action.tsx) both read
// from here so there is exactly one source of truth for install state.

export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const DISMISS_KEY = "ri-pwa-install-dismissed-at";
export const DISMISS_DAYS = 30;

/** Pure: was the automatic prompt dismissed inside the dismissal window? */
export function isDismissalActive(raw: string | null, now: number = Date.now()): boolean {
  if (!raw) return false;
  const when = Number(raw);
  if (!Number.isFinite(when)) return false;
  return now - when < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export type InstallMode = "installed" | "native" | "ios" | "guidance";

/**
 * Pure: what the *manual, always-available* action should do.
 * Dismissal of the automatic prompt deliberately has no effect here.
 */
export function manualInstallMode(state: {
  standalone: boolean;
  ios: boolean;
  hasDeferredPrompt: boolean;
}): InstallMode {
  if (state.standalone) return "installed";
  if (state.hasDeferredPrompt) return "native";
  if (state.ios) return "ios";
  return "guidance";
}

/** Pure: should the automatic (uninvited) prompt appear? */
export function shouldAutoPrompt(state: {
  standalone: boolean;
  dismissed: boolean;
}): boolean {
  return !state.standalone && !state.dismissed;
}

export function readDismissal(): boolean {
  try {
    return isDismissalActive(localStorage.getItem(DISMISS_KEY));
  } catch {
    return false;
  }
}

export function markInstallPromptDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Mac") && "ontouchend" in document;
  return iOSDevice || iPadOS;
}

/**
 * The browser fires `beforeinstallprompt` once, early. Cache it at module
 * level so an action mounted later (settings screen) can still use it.
 */
let deferredPrompt: BIPEvent | null = null;
const listeners = new Set<(e: BIPEvent | null) => void>();

export function getDeferredPrompt(): BIPEvent | null {
  return deferredPrompt;
}

export function setDeferredPrompt(e: BIPEvent | null) {
  deferredPrompt = e;
  listeners.forEach((l) => l(e));
}

export function onDeferredPromptChange(fn: (e: BIPEvent | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function invokeDeferredPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const e = deferredPrompt;
  if (!e) return "unavailable";
  try {
    await e.prompt();
    const choice = await e.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}
