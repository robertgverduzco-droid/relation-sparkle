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

  it("puts the past conversation and account controls in the menu", () => {
    expect(screen).toContain("MemberMenuLinks");
    expect(screen).toContain("showHistory");
    // The trigger has to read as a menu, not as a status word.
    expect(screen).toContain('data-testid="athena-menu"');
  });
});

/**
 * Sign out and the founder tools must never again be orphaned by a layout
 * change: they live in one shared menu, reachable from the field screen too.
 */
describe("member menu reachability", () => {
  const menu = readFileSync("src/components/member-menu.tsx", "utf8");
  const field = readFileSync("src/routes/_authenticated/home.tsx", "utf8");

  it("carries sign out, profile, account and founder controls", () => {
    expect(menu).toContain('data-testid="menu-sign-out"');
    expect(menu).toContain('to="/profile"');
    expect(menu).toContain('to="/account"');
    expect(menu).toContain('to="/founder"');
    expect(menu).toContain('to="/beta-accounts"');
    expect(menu).toContain('to="/moderation"');
    expect(menu).toContain('to="/athena-history"');
  });

  it("is reachable from the field screen", () => {
    expect(field).toContain('data-testid="field-menu"');
    expect(field).toContain("MemberMenuSheet");
  });
});
