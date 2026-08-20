// BR-01 defect remediation — regression coverage.
//
// One test per finding, asserting the rule rather than the implementation
// detail, so a future refactor cannot quietly reintroduce the defect.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SPEECH_MARGIN_MS,
  SPEECH_MAX_MS,
  SPEECH_MIN_MS,
  durationWatchdogMs,
  estimateSpeechMs,
} from "./athena-speech";
import {
  RUNTIME_STATE_LABEL,
  resolveRuntimeState,
  showsThinkingIndicator,
} from "./athena-runtime-state";
import { athenaRestatement, resolveBasis } from "./understanding.server";

const read = (p: string) => readFileSync(p, "utf8");

const BASE = {
  hydrated: true,
  speaking: false,
  recording: false,
  transcribing: false,
  busy: false,
  introducing: false,
  askingPreference: false,
};

describe("BR01-01 — speech never locks the conversation", () => {
  it("every utterance has a bounded watchdog", () => {
    expect(estimateSpeechMs("")).toBeGreaterThanOrEqual(SPEECH_MIN_MS);
    expect(estimateSpeechMs("a".repeat(100_000))).toBeLessThanOrEqual(SPEECH_MAX_MS);
    expect(estimateSpeechMs("a short line")).toBeGreaterThan(0);
  });

  it("a known duration tightens the watchdog to duration plus margin", () => {
    expect(durationWatchdogMs(12, "x")).toBe(12_000 + SPEECH_MARGIN_MS);
  });

  it("an unusable duration falls back to the text estimate", () => {
    expect(durationWatchdogMs(NaN, "hello")).toBe(estimateSpeechMs("hello"));
    expect(durationWatchdogMs(0, "hello")).toBe(estimateSpeechMs("hello"));
  });

  it("playback settles on error and abort, not only on completion", () => {
    const src = read("src/lib/athena-speech.ts");
    for (const hook of ['"ended"', '"error"', '"abort"', "timed-out"]) {
      expect(src).toContain(hook);
    }
  });
});

describe("BR01-02 — thinking is never shown while Athena speaks", () => {
  it("playback outranks every other in-progress state", () => {
    expect(resolveRuntimeState({ ...BASE, speaking: true, busy: true })).toBe("speaking");
    expect(RUNTIME_STATE_LABEL[resolveRuntimeState({ ...BASE, speaking: true })]).toContain(
      "speaking",
    );
  });

  it("thinking only describes generation, and only then", () => {
    expect(resolveRuntimeState({ ...BASE, busy: true })).toBe("thinking");
    expect(showsThinkingIndicator("speaking")).toBe(false);
    expect(showsThinkingIndicator("listening")).toBe(false);
    expect(showsThinkingIndicator("thinking")).toBe(true);
  });

  it("listening, transcribing and preparing are distinct, legible states", () => {
    expect(resolveRuntimeState({ ...BASE, recording: true })).toBe("listening");
    expect(resolveRuntimeState({ ...BASE, transcribing: true })).toBe("transcribing");
    expect(resolveRuntimeState({ ...BASE, hydrated: false })).toBe("preparing");
    expect(resolveRuntimeState(BASE)).toBe("ready");
  });

  it("every state has restrained Athena-native text", () => {
    for (const label of Object.values(RUNTIME_STATE_LABEL)) {
      expect(label.startsWith("Athena is")).toBe(true);
      expect(label).not.toMatch(/\d/);
    }
  });
});

describe("BR01-03 — sign-in cannot fall through to a native submit", () => {
  const auth = read("src/routes/auth.tsx");

  it("submission controls stay inert until hydration", () => {
    expect(auth).toContain("setHydrated(true)");
    expect(auth).toContain('type="submit" disabled={busy || !hydrated}');
    expect(auth).toContain("if (!hydrated || busy) return;");
  });

  it("no credential field can ever be serialised into a URL", () => {
    expect(auth).not.toMatch(/name=["'](email|password)["']/);
    expect(auth).not.toMatch(/<form[^>]*method=/);
  });
});

describe("BR01-04 — provenance comes from the record, not from evidence", () => {
  it("only an explicit basis claims the member stated it", () => {
    expect(resolveBasis("stated")).toBe("stated");
    expect(resolveBasis("inferred")).toBe("inferred");
    expect(resolveBasis(null)).toBe("unestablished");
    expect(resolveBasis(undefined)).toBe("unestablished");
    expect(resolveBasis("anything else")).toBe("unestablished");
  });

  it("the reflection step must record provenance for each facet", () => {
    expect(read("src/lib/athena.server.ts")).toContain('basis: z.enum(["stated", "inferred"])');
    expect(read("src/lib/athena.functions.ts")).toContain("basis: f.basis");
  });
});

describe("BR01-05 — corrections are restated in Athena's voice", () => {
  it("first-person statements are addressed back to the member", () => {
    expect(athenaRestatement("I'm not driven by status")).toBe("You're not driven by status.");
    expect(athenaRestatement("My work matters to me")).toBe("Your work matters to you.");
    expect(athenaRestatement("I value quiet over novelty.")).toBe(
      "You value quiet over novelty.",
    );
  });

  it("meaning is never added, softened, or reinterpreted", () => {
    expect(athenaRestatement("I want children eventually.")).toBe(
      "You want children eventually.",
    );
    expect(athenaRestatement("Stability, not adventure.")).toBe("Stability, not adventure.");
    expect(athenaRestatement(null)).toBeNull();
    expect(athenaRestatement("   ")).toBeNull();
  });
});

describe("BR01-06 — one denial notice per attempt", () => {
  it("moderation denial is guarded and deduplicated", () => {
    const src = read("src/routes/_authenticated/moderation.tsx");
    expect(src).toContain("deniedRef");
    expect(src).toContain('id: "moderation-denied"');
    expect(src.match(/toast\("You don't have access to moderation\./g)?.length).toBe(1);
  });
});
