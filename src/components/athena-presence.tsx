import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type PresenceState =
  | "quiet"
  | "listening"
  | "processing"
  | "speaking"
  | "recognition"
  | "unavailable";

const LABEL: Record<PresenceState, string> = {
  quiet: "Athena is present",
  listening: "Athena is listening",
  processing: "Athena is thinking",
  speaking: "Athena is speaking",
  recognition: "Athena noticed something",
  unavailable: "Athena is unavailable",
};

/**
 * Athena's visual presence (D4 / §15–§16): focused light and an organized
 * field. No avatar, no figure, no generic AI orb. Every state is legible
 * without motion — the text label carries the same meaning as the light.
 */
export function AthenaPresence({
  state = "quiet",
  showLabel = true,
  className,
}: {
  state?: PresenceState;
  showLabel?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const animate = !reduced && (state === "processing" || state === "speaking" || state === "listening");

  const ring =
    state === "unavailable"
      ? "color-mix(in oklab, var(--warning) 55%, transparent)"
      : state === "recognition"
        ? "color-mix(in oklab, var(--premium) 60%, transparent)"
        : "color-mix(in oklab, var(--athena) 60%, transparent)";

  const spread =
    state === "processing" ? 26 : state === "speaking" ? 22 : state === "listening" ? 18 : 12;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <span
        aria-hidden
        className="relative inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: ring,
          boxShadow: `0 0 ${spread}px ${state === "unavailable" ? "0" : "1px"} ${ring}`,
          animation: animate ? "athena-breathe 4.2s ease-in-out infinite" : undefined,
          opacity: state === "unavailable" ? 0.7 : 1,
        }}
      />
      {showLabel && (
        <span
          className="type-caption"
          role="status"
          aria-live="polite"
          /* §12 — the informational state label must clear 4.5:1 against the
           * void. Approved accessibility deviation from the prototype. */
          style={{ color: "var(--lavender)", opacity: 1 }}
        >
          {LABEL[state]}
        </span>
      )}

      {!showLabel && <span className="sr-only" role="status" aria-live="polite">{LABEL[state]}</span>}
      <style>{`@keyframes athena-breathe {
        0%, 100% { transform: scale(1); opacity: 0.78; }
        50% { transform: scale(1.22); opacity: 1; }
      }`}</style>
    </div>
  );
}

/**
 * Operational truth (§53 / §55). Failure never borrows Athena's processing
 * language — it says what happened and what can be done.
 */
export function OperationalState({
  kind,
  detail,
  onRetry,
}: {
  kind:
    | "offline"
    | "timeout"
    | "ai-unavailable"
    | "transcription-failed"
    | "voice-unavailable"
    | "network"
    | "action-failed";
  detail?: string;
  onRetry?: () => void;
}) {
  const copy: Record<typeof kind, string> = {
    offline: "You're offline. Nothing was lost — this will continue when the connection returns.",
    timeout: "That took longer than it should have.",
    "ai-unavailable": "Athena can't respond right now. This is on our side, not yours.",
    "transcription-failed": "That recording didn't come through. You can try again, or type instead.",
    "voice-unavailable": "Voice isn't available right now. Text works exactly the same.",
    network: "The connection dropped partway through.",
    "action-failed": "That didn't save.",
  } as const;

  return (
    <div className="panel p-4" role="alert">
      <p className="type-body text-foreground">{detail ?? copy[kind]}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="tap-target mt-3 rounded-lg border border-border-strong px-4 text-sm text-foreground"
        >
          Try again
        </button>
      )}
    </div>
  );
}
