import { useEffect, useRef, useState } from "react";
import {
  markSeen,
  markSessionGreeted,
  readLastSeen,
  returnGreeting,
  sessionGreeted,
  shouldSpeakReturn,
  usableFirstName,
} from "@/lib/arrival";
import { speak } from "@/lib/athena-speech";

const VOICE_KEY = "athena-voice-mode";

/**
 * D5 — the returning-member greeting.
 *
 * The words are always visible; audio is an addition, never the carrier of
 * meaning. Athena speaks them only on a genuinely new session that begins
 * after a real absence — never on app switching, tab focus, or navigation
 * within the app. Nothing motivational is appended: recognition is the whole
 * experience.
 */
export function ReturnGreeting({ displayName }: { displayName: string | null }) {
  const firstName = usableFirstName(displayName);
  const text = returnGreeting(firstName);
  const [speaking, setSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const audioEnabled =
      (typeof window !== "undefined" && window.localStorage.getItem(VOICE_KEY)) === "voice";
    const speakIt = shouldSpeakReturn({
      sessionGreeted: sessionGreeted(),
      lastSeenAt: readLastSeen(),
      now: Date.now(),
      busy: false,
      audioEnabled,
    });
    markSessionGreeted();
    markSeen();
    if (!speakIt) return;
    const abort = new AbortController();
    abortRef.current = abort;
    void speak(text, abort.signal, setSpeaking);
    return () => abort.abort();
  }, [text]);

  return (
    <div className="mt-3">
      <h1 className="type-page-title text-foreground" data-testid="today-greeting">
        {text}
      </h1>
      <div aria-live="polite">
        {speaking && (
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xs text-ink-soft">Athena is speaking.</p>
            <button
              type="button"
              data-testid="today-stop-speaking"
              onClick={() => {
                abortRef.current?.abort();
                setSpeaking(false);
              }}
              className="tap-target rounded-full border border-border px-3 text-xs text-foreground"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
