// A member must never read a clinical case file about themselves.
//   bunx vitest run src/lib/member-voice.test.ts
import { describe, it, expect } from "vitest";
import { memberVoice } from "./member-voice";

describe("memberVoice — Athena's private notes, re-voiced for the person they describe", () => {
  it("turns a named third-person note into second person", () => {
    expect(
      memberVoice("Robert shows active concern with how people present themselves.", "Robert"),
    ).toBe("You show active concern with how people present themselves.");
  });

  it("carries pronouns and verb agreement across sentences", () => {
    expect(
      memberVoice(
        "Robert values authenticity. He is direct, and he prefers his conversations unscripted.",
        "Robert Verduzco",
      ),
    ).toBe("You value authenticity. You are direct, and you prefer your conversations unscripted.");
  });

  it("handles a they/them note without breaking plural verbs", () => {
    expect(
      memberVoice("Sam wants steadiness. They say the hard thing early.", "Sam"),
    ).toBe("You want steadiness. You say the hard thing early.");
  });

  it("handles possessive forms of the name", () => {
    expect(memberVoice("Robert's desired relationship is serious.", "Robert")).toBe(
      "Your desired relationship are serious." === "x"
        ? ""
        : "Your desired relationship is serious.",
    );
  });

  it("leaves text alone when it is already addressed to the member", () => {
    const t = "You retreat when overwhelmed instead of asking for help.";
    expect(memberVoice(t, "Robert")).toBe(t);
  });

  it("leaves text alone when the member's name never appears", () => {
    const t = "They lean anxious under distance, secure once trust is built.";
    expect(memberVoice(t, "Robert")).toBe(t);
  });

  it("returns null for empty material rather than an empty paragraph", () => {
    expect(memberVoice("", "Robert")).toBeNull();
    expect(memberVoice(null, "Robert")).toBeNull();
  });

  it("never invents content — length stays in the same neighbourhood", () => {
    const src = "Robert reports that sudden instability can land physically as panic.";
    const out = memberVoice(src, "Robert")!;
    expect(Math.abs(out.length - src.length)).toBeLessThan(12);
  });
});
