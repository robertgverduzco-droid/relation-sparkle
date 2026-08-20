import { describe, expect, it } from "vitest";
import {
  LIVE_MODEL,
  LIVE_VOICE,
  LIVE_SPEECH_ADDENDUM,
  liveSessionConfig,
} from "./athena-live.server";

describe("Athena Live Conversation session", () => {
  const cfg = liveSessionConfig("DOCTRINE");

  it("uses the canonical D5 voice", () => {
    expect(LIVE_VOICE).toBe("marin");
    expect(cfg.session.audio.output.voice).toBe("marin");
  });

  it("runs on the realtime model with doctrine attached", () => {
    expect(cfg.session.model).toBe(LIVE_MODEL);
    expect(cfg.session.instructions).toBe("DOCTRINE");
  });

  it("yields the floor the moment the member speaks", () => {
    expect(cfg.session.audio.input.turn_detection.interrupt_response).toBe(true);
  });

  it("does not treat a thinking pause as a finished turn", () => {
    expect(cfg.session.audio.input.turn_detection.eagerness).toBe("low");
  });

  it("keeps turn-taking guidance free of scoring or self-narration", () => {
    expect(LIVE_SPEECH_ADDENDUM).toMatch(/yield instantly/i);
    expect(LIVE_SPEECH_ADDENDUM).toMatch(/Silence is allowed/i);
    expect(LIVE_SPEECH_ADDENDUM).toMatch(/never narrate/i);
    expect(LIVE_SPEECH_ADDENDUM).not.toMatch(/\b(score|rating|percentage)\b/i);
  });
});
