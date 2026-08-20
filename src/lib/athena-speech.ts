/**
 * D5 — Athena voice playback (client).
 *
 * Transient by construction: synthesized audio is held as a blob URL for the
 * duration of playback and revoked immediately afterwards. Nothing is stored,
 * cached, or uploaded. No recording of the member is created here.
 *
 * BR01-01 — bounded recovery. Athena's conversation state must never depend
 * exclusively on `onended`. Playback resolves on whichever of these comes
 * first: normal completion, an error, an abort, or a bounded watchdog timeout
 * derived from the real audio duration where available. Every path runs the
 * same single-shot cleanup, so the composer always returns to a usable state.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Fallback watchdog used before (or instead of) real audio metadata.
 * Athena speaks at roughly 14 characters per second; we add a margin and
 * clamp so a pathological input can never lock the surface for long.
 */
export const SPEECH_MARGIN_MS = 4000;
export const SPEECH_MIN_MS = 8000;
export const SPEECH_MAX_MS = 180_000;

export function estimateSpeechMs(text: string): number {
  const raw = text.trim().length * 71 + SPEECH_MARGIN_MS;
  return Math.min(SPEECH_MAX_MS, Math.max(SPEECH_MIN_MS, raw));
}

/** Watchdog once the browser reports a real duration for the clip. */
export function durationWatchdogMs(durationSeconds: number, text: string): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return estimateSpeechMs(text);
  }
  return Math.min(SPEECH_MAX_MS, durationSeconds * 1000 + SPEECH_MARGIN_MS);
}

export type SpeechOutcome = "completed" | "failed" | "aborted" | "timed-out";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function speak(
  text: string,
  signal: AbortSignal,
  onState?: (speaking: boolean) => void,
): Promise<SpeechOutcome> {
  // A stale callback from an earlier line must never re-open the speaking
  // state after a newer one began: every notification goes through this guard.
  let settled = false;
  const notify = (speaking: boolean) => {
    if (settled && speaking) return;
    onState?.(speaking);
  };

  if (signal.aborted) return "aborted";

  let res: Response;
  try {
    res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text }),
      signal,
    });
  } catch {
    notify(false);
    return signal.aborted ? "aborted" : "failed";
  }
  if (!res.ok) {
    notify(false);
    return "failed";
  }
  if (signal.aborted) {
    notify(false);
    return "aborted";
  }

  let url: string;
  let audio: HTMLAudioElement;
  try {
    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    audio = new Audio(url);
  } catch {
    notify(false);
    return signal.aborted ? "aborted" : "failed";
  }

  notify(true);

  return await new Promise<SpeechOutcome>((resolve) => {
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const clearWatchdog = () => {
      if (watchdog !== null) {
        clearTimeout(watchdog);
        watchdog = null;
      }
    };

    const arm = (ms: number) => {
      clearWatchdog();
      watchdog = setTimeout(() => finish("timed-out"), ms);
    };

    const onEnded = () => finish("completed");
    const onError = () => finish("failed");
    const onAbort = () => finish("aborted");
    const onMeta = () => arm(durationWatchdogMs(audio.duration, text));

    function finish(outcome: SpeechOutcome) {
      if (settled) return;
      settled = true;
      clearWatchdog();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", onMeta);
      signal.removeEventListener("abort", onAbort);
      try {
        audio.pause();
      } catch {
        /* nothing to pause */
      }
      // Transient by construction: the blob never outlives playback.
      URL.revokeObjectURL(url);
      onState?.(false);
      resolve(outcome);
    }

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", onMeta);
    signal.addEventListener("abort", onAbort, { once: true });

    // Armed before playback even starts, so a rejected or silently stalled
    // play() can never leave the conversation locked.
    arm(estimateSpeechMs(text));

    void Promise.resolve(audio.play()).catch(() => finish("failed"));
  });
}
