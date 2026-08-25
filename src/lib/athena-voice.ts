/**
 * Athena voice selection (D5) — TEST voice configuration.
 *
 * The current TEST voice is the ElevenLabs Voice Library voice
 * "Savvy — Warm, Grounded & Natural". This is a test selection, not a frozen
 * brand decision: the ElevenLabs path activates only when both a credential
 * and an explicit voice id are present in the server environment, and the
 * existing gateway voice remains the fallback so the spoken experience never
 * degrades while the selection is being finalised.
 *
 * Nothing here changes Athena's written personality, doctrine or prompts.
 */

/** Human-readable name of the current test voice. */
export const ATHENA_TEST_VOICE_NAME = "Savvy — Warm, Grounded & Natural";

/** Fallback voice on the Lovable AI gateway path (unchanged V1 behaviour). */
export const ATHENA_GATEWAY_VOICE = "marin";

/** ElevenLabs model used for Athena's measured, conversational delivery. */
export const ELEVENLABS_MODEL = "eleven_multilingual_v2";

/**
 * D5 delivery direction, shared by both synthesis paths so the character of
 * the voice does not shift with the transport.
 */
export const ATHENA_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.75,
  style: 0.25,
  use_speaker_boost: true,
  speed: 0.96,
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
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = env.ELEVENLABS_SAVVY_VOICE_ID?.trim();
  if (!apiKey || !voiceId) return null;
  return { apiKey, voiceId };
}
