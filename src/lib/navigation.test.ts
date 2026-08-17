// Route / navigation regression coverage for audit finding A-04:
// the legacy pre-Athena conversation surface must not be reachable from
// ordinary member navigation, and must not render on a deep link.
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const legacyRoute = readFileSync("src/routes/_authenticated/conversations.tsx", "utf8");
const profile = readFileSync("src/routes/_authenticated/profile.tsx", "utf8");
const tabBar = readFileSync("src/components/mobile-tab-bar.tsx", "utf8");
const home = readFileSync("src/routes/_authenticated/home.tsx", "utf8");

describe("legacy conversation surface (A-04)", () => {
  it("is not linked from the profile menu", () => {
    expect(profile).not.toMatch(/to="\/conversations"/);
  });

  it("is not linked from the tab bar or the Today surface", () => {
    expect(tabBar).not.toMatch(/\/conversations/);
    expect(home).not.toMatch(/to="\/conversations"/);
  });

  it("redirects a deep link to the canonical surface before rendering", () => {
    expect(legacyRoute).toMatch(/beforeLoad/);
    expect(legacyRoute).toMatch(/redirect\(\{\s*to:\s*"\/athena"/);
  });

  it("no longer reads the superseded interview transcript table", () => {
    expect(legacyRoute).not.toMatch(/interview_sessions/);
  });

  it("preserves the retired component for rollback and historical reference", () => {
    expect(existsSync("docs/engineering/legacy/conversations-route.legacy.tsx.txt")).toBe(true);
  });

  it("is classified as legacy in the source itself", () => {
    expect(legacyRoute).toMatch(/LEGACY SURFACE/);
  });
});
