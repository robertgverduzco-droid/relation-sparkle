import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SPOKEN_REGISTER, spokenRegisterBlock } from "./spoken-register";
import { ATHENA_VOICE_SETTINGS, ATHENA_VOICE_ID, ELEVENLABS_LIVE_MODEL } from "./athena-voice";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("spoken delivery register (D5 v1.1)", () => {
  it("applies only to the voice channel", () => {
    expect(spokenRegisterBlock("voice")).toBe(SPOKEN_REGISTER);
    expect(spokenRegisterBlock("text")).toBe("");
    expect(spokenRegisterBlock(undefined)).toBe("");
  });

  it("states the 90/10 balance and keeps the serious override", () => {
    expect(SPOKEN_REGISTER).toMatch(/nine out of ten/i);
    expect(SPOKEN_REGISTER).toMatch(/one in ten/i);
    expect(SPOKEN_REGISTER).toMatch(/grief, fear, shame, crisis/i);
    expect(SPOKEN_REGISTER).toMatch(/no compatibility scores/i);
  });

  it("is composed on the one voice path that exists", () => {
    expect(read("src/routes/api/eleven-agent-chat.ts")).toContain('channel: "voice"');
    expect(read("src/lib/athena.functions.ts")).toContain("spokenRegisterBlock(data.channel)");
  });
});

describe("voice configuration alignment (D5 v1.1)", () => {
  it("keeps one source of truth for both synthesis paths", () => {
    const script = read("scripts/update-speech-engine.ts");
    expect(script).toContain("ATHENA_VOICE_SETTINGS");
    expect(script).toContain("ELEVENLABS_LIVE_MODEL");
    expect(script).not.toMatch(/voice_id\s*:\s*"/);
    expect(ATHENA_VOICE_ID).toBe("ogwqBH5bbF03DSbNiRNN");
    expect(ELEVENLABS_LIVE_MODEL).toBe("eleven_v3_conversational");
    expect(ATHENA_VOICE_SETTINGS.style).toBeGreaterThan(0.4);
    expect(ATHENA_VOICE_SETTINGS.stability).toBeLessThan(0.5);
  });
});
