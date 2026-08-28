// Keeps the registered Speech Engine's voice layer aligned with the single
// source of truth in src/lib/athena-voice.ts (D5 v1.1). The live path and the
// one-shot /api/tts path now read the same model, voice and delivery
// settings, so transport can no longer change Athena's character.
//
//   bun scripts/update-speech-engine.ts
import {
  ATHENA_VOICE_ID,
  ATHENA_VOICE_SETTINGS,
  ELEVENLABS_EXPRESSIVE_MODE,
  ELEVENLABS_LIVE_MODEL,
} from "../src/lib/athena-voice";

const API_KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY;
const ENGINE_ID = "seng_1301m14txaqpe8mt4qk7etbtf2sj";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY is not set.");
  process.exit(1);
}

const res = await fetch(`https://api.elevenlabs.io/v1/speech-engine/${ENGINE_ID}`, {
  method: "PATCH",
  headers: { "xi-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({
    tts: {
      model_id: ELEVENLABS_LIVE_MODEL,
      voice_id: ATHENA_VOICE_ID,
      expressive_mode: ELEVENLABS_EXPRESSIVE_MODE,
      ...ATHENA_VOICE_SETTINGS,
    },
  }),
});

if (!res.ok) {
  console.error(`Update failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const engine = (await res.json()) as { tts?: unknown };
console.log("Speech Engine updated:", engine.tts);
