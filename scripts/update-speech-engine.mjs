// Keeps the registered Speech Engine's voice layer at the settings Athena
// depends on: Eleven v3 Conversational (real-time capable, natural laughter
// and emotional inflection) with Expressive Mode on, speaking as Savvy.
//
//   node scripts/update-speech-engine.mjs
const API_KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY;
const ENGINE_ID = "seng_1301m14txaqpe8mt4qk7etbtf2sj";
const VOICE_ID = "ogwqBH5bbF03DSbNiRNN"; // Savvy — Warm, Grounded & Natural

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY is not set.");
  process.exit(1);
}

const res = await fetch(`https://api.elevenlabs.io/v1/speech-engine/${ENGINE_ID}`, {
  method: "PATCH",
  headers: { "xi-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({
    tts: {
      model_id: "eleven_v3_conversational",
      voice_id: VOICE_ID,
      expressive_mode: true,
    },
  }),
});

if (!res.ok) {
  console.error(`Update failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const engine = await res.json();
console.log("Speech Engine updated:", engine.tts);
