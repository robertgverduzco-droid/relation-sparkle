// One-time setup: register Athena's Speech Engine with ElevenLabs.
// Requires an ElevenLabs API key with the `convai_write` permission.
// Run with: ELEVEN_API_KEY=... node scripts/register-speech-engine.mjs
const apiKey = process.env.ELEVEN_API_KEY || process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Missing ELEVEN_API_KEY / ELEVENLABS_API_KEY");

const WS_URL = "wss://relation-sparkle.lovable.app/api/speech-engine/ws";
// Voice, model and delivery live in src/lib/athena-voice.ts; run
// `bun scripts/update-speech-engine.ts` immediately after registering to
// apply them (D5 v1.1 single source of truth).
const SAVVY_VOICE_ID = "ogwqBH5bbF03DSbNiRNN";

const res = await fetch("https://api.elevenlabs.io/v1/speech-engine", {
  method: "POST",
  headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Athena Relationship Intelligence",
    speech_engine: { ws_url: WS_URL },
    tts: { voice_id: SAVVY_VOICE_ID },
    language: "en",
    tags: ["athena", "v1"],
  }),
});

const body = await res.json();
if (!res.ok) {
  console.error("Failed:", res.status, JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log("Speech Engine ID:", body.speech_engine_id);
console.log(JSON.stringify(body, null, 2));
