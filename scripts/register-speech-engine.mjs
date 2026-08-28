// One-time setup: register Athena's Speech Engine with ElevenLabs.
// Run with: ELEVEN_API_KEY=... node scripts/register-speech-engine.mjs
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const apiKey = process.env.ELEVEN_API_KEY || process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Missing ELEVEN_API_KEY / ELEVENLABS_API_KEY");

const WS_URL = "wss://relation-sparkle.lovable.app/api/speech-engine/ws";
const SAVVY_VOICE_ID = "ogwqBH5bbF03DSbNiRNN";

const client = new ElevenLabsClient({ apiKey });

const created = await client.speechEngine.create({
  name: "Athena Relationship Intelligence",
  speechEngine: { wsUrl: WS_URL },
  tts: { voiceId: SAVVY_VOICE_ID },
  language: "en",
  tags: ["athena", "v1"],
});

console.log(JSON.stringify({ speechEngineId: created.speechEngineId, name: created.name, wsUrl: created.speechEngine?.wsUrl }, null, 2));
