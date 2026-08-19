// D5 closure regression suite — arrival welcome, return greeting, playback
// state, sound-off behaviour, privacy and visual restraint.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ARRIVAL_WELCOME,
  RETURN_IDLE_MS,
  returnGreeting,
  shouldSpeakReturn,
  usableFirstName,
} from "./arrival";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const base = {
  sessionGreeted: false,
  lastSeenAt: Date.now() - RETURN_IDLE_MS - 1000,
  now: Date.now(),
  busy: false,
  audioEnabled: true,
};

describe("first-ever arrival", () => {
  it("uses the canonical welcome, verbatim", () => {
    expect(ARRIVAL_WELCOME).toBe(
      "Welcome to Athena. The next evolution of matchmaking. Let's begin with you.",
    );
  });

  it("is spoken only inside the first-meeting branch, which never replays", () => {
    const page = read("src/routes/_authenticated/athena.tsx");
    // The intro sequence is guarded by "no prior messages exist".
    expect(page).toContain("if (priorMessages.length > 0)");
    expect(page).toContain("ARRIVAL_WELCOME");
    // …and the welcome is part of the transcript, so it is visible text too.
    expect(page).toContain("accumulated.push({ role: \"assistant\"");
  });
});

describe("returning member", () => {
  it("greets by member-provided first name", () => {
    expect(returnGreeting(usableFirstName("Robert Verduzco"))).toBe("Welcome back, Robert.");
  });

  it("falls back cleanly with no usable name", () => {
    for (const v of [null, "", "   ", "r", "robert@example.com"]) {
      expect(returnGreeting(usableFirstName(v))).toBe("Welcome back.");
    }
  });

  it("appends no motivational language", () => {
    expect(returnGreeting("Robert").split(".").filter(Boolean)).toHaveLength(1);
  });

  it("speaks on a genuine return", () => {
    expect(shouldSpeakReturn(base)).toBe(true);
  });

  it("does not repeat within the same session (quick app switching)", () => {
    expect(shouldSpeakReturn({ ...base, sessionGreeted: true })).toBe(false);
  });

  it("does not greet a brief absence", () => {
    expect(shouldSpeakReturn({ ...base, lastSeenAt: Date.now() - 60_000 })).toBe(false);
  });

  it("never treats a first-ever visit as a return", () => {
    expect(shouldSpeakReturn({ ...base, lastSeenAt: null })).toBe(false);
  });

  it("stays silent when audio is off", () => {
    expect(shouldSpeakReturn({ ...base, audioEnabled: false })).toBe(false);
  });

  it("never interrupts something in progress", () => {
    expect(shouldSpeakReturn({ ...base, busy: true })).toBe(false);
  });

  it("is only mounted on Today, never on conversation or safety surfaces", () => {
    for (const f of [
      "src/routes/_authenticated/athena.tsx",
      "src/routes/_authenticated/messages.$id.tsx",
      "src/routes/_authenticated/introductions.tsx",
    ]) {
      expect(read(f)).not.toContain("ReturnGreeting");
    }
    expect(read("src/routes/_authenticated/home.tsx")).toContain("ReturnGreeting");
  });
});

describe("text equivalence and playback state", () => {
  it("renders the return greeting as a visible heading regardless of audio", () => {
    const c = read("src/components/return-greeting.tsx");
    expect(c).toContain('data-testid="today-greeting"');
    expect(c).toMatch(/<h1[^>]*>\s*\{text\}/);
  });

  it("states playback in words, not motion alone, with a stop control", () => {
    const page = read("src/routes/_authenticated/athena.tsx");
    expect(page).toContain("Athena is speaking.");
    expect(page).toContain('data-testid="athena-stop-speaking"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain("tap-target");
  });

  it("honours the voice kill switch by stopping playback on switch to text", () => {
    expect(read("src/routes/_authenticated/athena.tsx")).toContain(
      'if (mode === "text") stopSpeaking();',
    );
  });
});

describe("voice character and privacy", () => {
  const tts = read("src/routes/api/tts.ts");

  it("keeps marin as the V1 Athena voice", () => {
    expect(tts).toContain('body.voice ?? "marin"');
  });

  it("keeps the D5 delivery direction and refuses the forbidden registers", () => {
    expect(tts).toMatch(/warm feminine intelligence/i);
    expect(tts).toMatch(/lower-middle register/i);
    expect(tts).toMatch(/never performative|never dramatic|never salesy/i);
  });

  it("never caches or stores synthesized audio", () => {
    expect(tts).toContain('"Cache-Control": "no-store"');
    const speech = read("src/lib/athena-speech.ts");
    expect(speech).toContain("URL.revokeObjectURL");
    expect(speech).not.toMatch(/localStorage|indexedDB|upload/i);
  });
});

describe("visual restraint", () => {
  it("introduces no chime, jingle or oscillator anywhere in the app", () => {
    for (const f of [
      "src/routes/index.tsx",
      "src/routes/_authenticated/home.tsx",
      "src/components/connection-field.tsx",
      "src/components/return-greeting.tsx",
    ]) {
      expect(read(f)).not.toMatch(/AudioContext|OscillatorNode|createOscillator|chime/i);
    }
  });

  it("introduces no avatar, face or waveform in the presence language", () => {
    const presence = read("src/components/athena-presence.tsx");
    expect(presence).not.toMatch(/avatar|face|waveform|orb\b/i);
    expect(presence).toContain("useReducedMotion");
  });

  it("reuses the existing presence states rather than new AI visual language", () => {
    expect(read("src/routes/_authenticated/home.tsx")).toContain(
      'athenaSpeaking ? "speaking" : "quiet"',
    );
  });
});
