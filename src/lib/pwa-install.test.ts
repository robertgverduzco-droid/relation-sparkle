import { describe, expect, it, beforeEach } from "vitest";
import {
  DISMISS_KEY,
  isDismissalActive,
  manualInstallMode,
  shouldAutoPrompt,
  getDeferredPrompt,
  setDeferredPrompt,
  invokeDeferredPrompt,
  onDeferredPromptChange,
  type BIPEvent,
} from "./pwa-install";

function fakeBIP(outcome: "accepted" | "dismissed"): BIPEvent {
  return {
    prompt: async () => undefined,
    userChoice: Promise.resolve({ outcome }),
  } as unknown as BIPEvent;
}

describe("pwa install affordance", () => {
  beforeEach(() => setDeferredPrompt(null));

  it("keeps the dismissal key stable so unrelated state is untouched", () => {
    expect(DISMISS_KEY).toBe("ri-pwa-install-dismissed-at");
  });

  it("treats a recent dismissal as active and an old one as expired", () => {
    const now = Date.now();
    expect(isDismissalActive(String(now - 1000), now)).toBe(true);
    expect(isDismissalActive(String(now - 31 * 24 * 3600 * 1000), now)).toBe(false);
    expect(isDismissalActive(null, now)).toBe(false);
    expect(isDismissalActive("not-a-number", now)).toBe(false);
  });

  it("suppresses only the automatic prompt after dismissal", () => {
    expect(shouldAutoPrompt({ standalone: false, dismissed: true })).toBe(false);
    expect(shouldAutoPrompt({ standalone: false, dismissed: false })).toBe(true);
  });

  it("keeps the manual action available after the automatic prompt was dismissed", () => {
    // Dismissal is not an input to the manual action at all.
    expect(
      manualInstallMode({ standalone: false, ios: true, hasDeferredPrompt: false }),
    ).toBe("ios");
    expect(
      manualInstallMode({ standalone: false, ios: false, hasDeferredPrompt: false }),
    ).toBe("guidance");
  });

  it("uses the native prompt on Chromium when a deferred event exists", () => {
    expect(
      manualInstallMode({ standalone: false, ios: false, hasDeferredPrompt: true }),
    ).toBe("native");
  });

  it("hides the action once the app is installed/standalone", () => {
    expect(
      manualInstallMode({ standalone: true, ios: true, hasDeferredPrompt: true }),
    ).toBe("installed");
  });

  it("invokes and clears the deferred prompt, notifying subscribers", async () => {
    const seen: (BIPEvent | null)[] = [];
    const off = onDeferredPromptChange((e) => seen.push(e));
    setDeferredPrompt(fakeBIP("accepted"));
    expect(getDeferredPrompt()).not.toBeNull();

    await expect(invokeDeferredPrompt()).resolves.toBe("accepted");
    expect(getDeferredPrompt()).toBeNull();
    expect(seen.length).toBe(2);
    off();
  });

  it("reports unavailable when there is no deferred prompt", async () => {
    await expect(invokeDeferredPrompt()).resolves.toBe("unavailable");
  });
});
