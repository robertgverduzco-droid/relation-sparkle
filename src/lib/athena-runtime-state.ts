/**
 * BR01-02 — Athena's runtime conversational state.
 *
 * One resolver, one vocabulary. What the member sees, what a screen reader
 * announces, and what `data-conversation-state` reports are all derived from
 * the same value, so "Athena is thinking" can never appear while audio is
 * actually playing. Every state is legible as text alone (D4/D5): motion is
 * decoration, never the carrier of meaning.
 */
export type AthenaRuntimeState =
  | "preparing"
  | "first-meeting"
  | "choosing-mode"
  | "listening"
  | "transcribing"
  | "speaking"
  | "thinking"
  | "ready";

/** Restrained, Athena-native status language. */
export const RUNTIME_STATE_LABEL: Record<AthenaRuntimeState, string> = {
  preparing: "Athena is preparing to meet you",
  "first-meeting": "Athena is beginning",
  "choosing-mode": "Athena is waiting for you to choose",
  listening: "Athena is listening",
  transcribing: "Athena is taking down your words",
  speaking: "Athena is speaking",
  thinking: "Athena is thinking",
  ready: "Athena is ready",
};

export function resolveRuntimeState(s: {
  hydrated: boolean;
  speaking: boolean;
  recording: boolean;
  transcribing: boolean;
  busy: boolean;
  introducing: boolean;
  askingPreference: boolean;
}): AthenaRuntimeState {
  if (!s.hydrated) return "preparing";
  // Playback wins over every other in-progress state: if Athena is audibly
  // speaking, nothing else may describe her as thinking.
  if (s.speaking) return "speaking";
  if (s.recording) return "listening";
  if (s.transcribing) return "transcribing";
  if (s.askingPreference) return "choosing-mode";
  if (s.introducing) return "first-meeting";
  if (s.busy) return "thinking";
  return "ready";
}

/** Only these states render the thinking indicator. */
export function showsThinkingIndicator(state: AthenaRuntimeState): boolean {
  return state === "thinking" || state === "first-meeting";
}
