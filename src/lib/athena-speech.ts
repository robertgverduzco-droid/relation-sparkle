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

export type SpeechOutcome = "completed" | "failed" | "aborted" | "timed-out" | "empty";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Beta reliability fix — one long-lived audio element, unlocked by a real
 * user gesture.
 *
 * `new Audio()` created *after* an awaited network round-trip is no longer
 * inside the gesture that started the turn, so mobile browsers reject
 * `play()` with NotAllowedError. That rejection was swallowed, which is why
 * some replies were spoken and others silently were not. A single element
 * primed on the first gesture stays permanently unlocked, and reusing it also
 * makes overlapping playback structurally impossible.
 */
let sharedAudio: HTMLAudioElement | null = null;

export function primeSpeechAudio(): void {
  if (typeof window === "undefined") return;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  if (sharedAudio.src) return;
  // A silent, zero-length clip: playing it inside the gesture unlocks the
  // element for every later programmatic play().
  sharedAudio.src =
    "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////8AAAA5TEFNRTMuMTAwAc0AAAAAAAAAABSAJAJAQgAAgAAAAnGMHkkIAAAAAAAAAAAAAAAAAAAA";
  sharedAudio.muted = true;
  void sharedAudio.play().then(() => {
    sharedAudio?.pause();
    if (sharedAudio) {
      sharedAudio.muted = false;
      sharedAudio.currentTime = 0;
    }
  }).catch(() => { /* will simply fall back to a fresh element */ });
}

function speechElement(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  sharedAudio.muted = false;
  return sharedAudio;
}

/** One retry for transient upstream/network failures, then give up honestly. */
async function fetchSpeech(text: string, signal: AbortSignal): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal.aborted) return null;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ text }),
        signal,
      });
      if (res.ok) return res;
      // 4xx other than 429 will not succeed on a retry.
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      if (signal.aborted) return null;
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  return null;
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

  const spoken = (text ?? "").trim();
  // An empty or whitespace-only reply is never sent to the voice endpoint.
  if (!spoken) return "empty";
  if (signal.aborted) return "aborted";

  const res = await fetchSpeech(spoken, signal);
  if (!res) {
    notify(false);
    return signal.aborted ? "aborted" : "failed";
  }
  if (signal.aborted) {
    notify(false);
    return "aborted";
  }

  let url: string;
  let audio: HTMLAudioElement;
  try {
    const blob = await res.blob();
    if (blob.size === 0) {
      notify(false);
      return "failed";
    }
    url = URL.createObjectURL(blob);
    audio = speechElement();
    // Any previous clip stops before the next begins: no overlap, ever.
    try { audio.pause(); } catch { /* nothing playing */ }
    audio.src = url;
    audio.currentTime = 0;
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
    arm(estimateSpeechMs(spoken));

    // A single re-attempt covers the case where the element was interrupted
    // mid-load; a second rejection is a real failure the caller can surface.
    void Promise.resolve(audio.play()).catch(() => {
      if (settled) return;
      try { audio.load(); } catch { /* ignore */ }
      void Promise.resolve(audio.play()).catch(() => finish("failed"));
    });
  });

}
