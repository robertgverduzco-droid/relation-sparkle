// Persistent, member-invokable "Add Athena to Home Screen".
//
// The automatic prompt can be dismissed for 30 days; this action never
// disappears because of that. It only disappears once the app is installed.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getDeferredPrompt,
  invokeDeferredPrompt,
  isIos,
  isStandalone,
  manualInstallMode,
  onDeferredPromptChange,
  type InstallMode,
} from "@/lib/pwa-install";

export function InstallAppAction() {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const recompute = () =>
      setMode(
        manualInstallMode({
          standalone: isStandalone(),
          ios: isIos(),
          hasDeferredPrompt: Boolean(getDeferredPrompt()),
        }),
      );
    recompute();
    const off = onDeferredPromptChange(recompute);
    window.addEventListener("appinstalled", recompute);
    return () => {
      off();
      window.removeEventListener("appinstalled", recompute);
    };
  }, []);

  if (!mode || mode === "installed") return null;

  async function activate() {
    if (mode === "native") {
      const outcome = await invokeDeferredPrompt();
      if (outcome === "accepted") {
        toast("Athena is on your Home Screen.");
        return;
      }
      if (outcome === "unavailable") setShowHelp(true);
      return;
    }
    setShowHelp((v) => !v);
  }

  return (
    <div
      className="rounded-2xl border border-border/70 bg-card p-5"
      data-testid="install-app-action"
      data-mode={mode}
    >
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        On your phone
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        Keep Athena a tap away, in her own app window.
      </p>

      <button
        data-testid="install-app-button"
        onClick={activate}
        className="mt-4 w-full rounded-full border border-border px-5 py-3 text-sm text-foreground"
      >
        Add Athena to Home Screen
      </button>

      {showHelp && (
        <p
          data-testid="install-app-help"
          className="mt-3 text-[13px] leading-relaxed text-ink-soft"
        >
          {mode === "ios" ? (
            <>
              In Safari, tap the
              <span className="mx-1 inline-block rounded border border-border px-1 text-[12px]">
                Share
              </span>
              icon, then <span className="font-medium">Add to Home Screen</span>. iPhone doesn't
              let a website install itself — this last step is yours.
            </>
          ) : (
            <>
              Open your browser menu and choose{" "}
              <span className="font-medium">Install app</span> or{" "}
              <span className="font-medium">Add to Home screen</span>. If you don't see it, your
              browser may not support installing — Chrome, Edge and Safari do.
            </>
          )}
        </p>
      )}
    </div>
  );
}
