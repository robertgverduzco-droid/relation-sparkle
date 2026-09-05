import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const screen = readFileSync("src/routes/_authenticated/athena.tsx", "utf8");

/**
 * Contract for the Athena screen: a member arrives to her, not to a
 * transcript. The full history is reachable only from the settings sheet.
 */
describe("Athena arrival surface", () => {
  it("renders the resting presence rather than a scrolling history", () => {
    expect(screen).toContain("AthenaRestingPresence");
    // Only the current exchange is rendered — never the whole message array.
    expect(screen).not.toContain("messages.map((m, i)");
    expect(screen).toContain("exchange.map(");
  });

  it("keeps turns from previous visits off the screen", () => {
    expect(screen).toContain("baselineRef.current = priorMessages.length");
    expect(screen).toContain("Math.max(exchangeStart, baselineRef.current)");
  });

  it("offers both voice and text as ways to begin", () => {
    expect(screen).toContain('data-testid="athena-live-toggle"');
    expect(screen).toContain('data-testid="athena-open-composer"');
  });

  it("puts the past conversation in settings, understated", () => {
    expect(screen).toContain('to="/athena-history"');
    expect(screen).toContain("Past conversation");
    expect(screen).toContain("Account &amp; sign out");
  });
});
