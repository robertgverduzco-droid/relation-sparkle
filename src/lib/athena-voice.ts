/**
 * Athena voice selection (D5) — single source of truth for voice delivery.
 *
 * The current TEST voice is the ElevenLabs Voice Library voice
 * "Savvy — Warm, Grounded & Natural". This is a test selection, not a frozen
 * brand decision: the ElevenLabs path activates only when both a credential
 * and an explicit voice id are present in the server environment, and the
 * existing gateway voice remains the fallback so the spoken experience never
 * degrades while the selection is being finalised.
 *
 * D5 v1.1 (Spoken Delivery Register) makes this file authoritative for BOTH
 * synthesis paths — the one-shot /api/tts route and the registered Speech
 * Engine used by live conversation. The scripts under scripts/ import these
 * constants rather than restating them, so the two configurations can no
 * longer drift and change Athena's character with the transport.
 *
 * Nothing here changes Athena's written personality, doctrine or prompts.
 */

/** Human-readable name of the current test voice. */
export const ATHENA_TEST_VOICE_NAME = "Savvy — Warm, Grounded & Natural";

/** The Savvy voice id, shared by both synthesis paths. */
export const ATHENA_VOICE_ID = "ogwqBH5bbF03DSbNiRNN";

/** Fallback voice on the Lovable AI gateway path (unchanged V1 behaviour). */
export const ATHENA_GATEWAY_VOICE = "marin";

/** Model for one-shot synthesis (welcomes, greetings, read-aloud). */
export const ELEVENLABS_MODEL = "eleven_multilingual_v2";

/** Model for live conversation: real-time, natural laughter, inflection. */
export const ELEVENLABS_LIVE_MODEL = "eleven_v3_conversational";

/** Expressive Mode stays on for live: the register is played, not read. */
export const ELEVENLABS_EXPRESSIVE_MODE = true;

/**
 * D5 v1.1 delivery direction, shared by both synthesis paths so the character
 * of the voice does not shift with the transport. Lower stability and higher
 * style than v1.0: v1.0's settings flattened Savvy into a narrator, which is
 * the wrong delivery for the spoken register.
 */
export const ATHENA_VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.8,
  style: 0.55,
  use_speaker_boost: true,
  speed: 1.0,
} as const;

export type ElevenLabsVoiceConfig = {
  apiKey: string;
  voiceId: string;
};

/**
 * Resolve the ElevenLabs configuration, or null when it is not yet supplied.
 * Never guesses a voice id and never substitutes another voice.
 */
export function resolveElevenLabsVoice(
  env: Record<string, string | undefined>,
): ElevenLabsVoiceConfig | null {
  // The ElevenLabs connector may sync the key as either ELEVENLABS_API_KEY or
  // ELEVEN_API_KEY depending on how it was linked. Accept both so the Savvy
  // test voice activates without requiring a duplicate secret.
  const apiKey = (env.ELEVENLABS_API_KEY ?? env.ELEVEN_API_KEY)?.trim();
  const voiceId = env.ELEVENLABS_SAVVY_VOICE_ID?.trim();
  if (!apiKey || !voiceId) return null;
  return { apiKey, voiceId };
}
