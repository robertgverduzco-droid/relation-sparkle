// P2 remediation regression suite (A-18 … A-23).
//
// These lock in the polish-wave repairs so a later edit cannot quietly undo
// them. Source-scanning rather than runtime, because the behaviours live in
// server modules and design tokens rather than pure functions.
//
//   bunx vitest run
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("A-18 — relationship-state notification guard", () => {
  const notify = read("src/lib/notifications.server.ts");

  it("suppresses introductions notifications for held members", () => {
    expect(notify).toContain('input.category === "introductions"');
    expect(notify).toContain("relationship_hold");
  });

  it("reuses the single canonical hold rule", () => {
    expect(notify).toContain("heldMemberIds");
    expect(notify).toContain("./relationship.server");
  });
});

describe("A-19 — correspondence framing in navigation", () => {
  const tabs = read("src/components/mobile-tab-bar.tsx");
  it('drops the "Chats" label', () => {
    expect(tabs).not.toContain('"Chats"');
    expect(tabs).toContain('label: "Messages"');
  });
});

describe("A-20 — no hardcoded scrim or theme colour", () => {
  const files = [
    "src/components/report-sheet.tsx",
    "src/routes/_authenticated/athena.tsx",
    "src/components/ui/dialog.tsx",
    "src/components/ui/alert-dialog.tsx",
    "src/components/ui/sheet.tsx",
    "src/components/ui/drawer.tsx",
  ];
  it("uses the semantic scrim token everywhere", () => {
    for (const f of files) expect(read(f)).not.toMatch(/bg-black\/\d/);
  });
  it("defines the scrim token in the design system", () => {
    const css = read("src/styles.css");
    expect(css).toContain("--color-scrim: var(--scrim)");
    expect(css).toMatch(/--scrim:\s*oklch/);
  });
  it("theme-color matches the field colour", () => {
    expect(read("src/routes/__root.tsx")).toContain('"theme-color", content: "#0a0c11"');
  });
});

describe("A-21 — Living Profile reachable in one step", () => {
  it("Today links directly to the understanding surface", () => {
    const home = read("src/routes/_authenticated/home.tsx");
    expect(home).toContain('to="/understanding"');
  });
});

describe("A-22 — attribution answered, never volunteered", () => {
  it("doctrine forbids in-the-spirit-of flavouring", () => {
    const doctrine = read("src/lib/athena-doctrine.server.ts");
    expect(doctrine).toContain("in the spirit of");
    expect(doctrine).toContain("never volunteered");
  });
});

describe("A-23 — cascade-only tables are explicitly swept", () => {
  const account = read("src/lib/account.server.ts");
  for (const t of [
    "understanding_revisions",
    "data_export_requests",
    "pair_reasoning_history",
  ]) {
    it(`sweeps ${t}`, () => expect(account).toContain(`"${t}"`));
  }
});

describe("protected P0/P1 behaviour still guarded", () => {
  it("no compatibility score language is reintroduced", () => {
    expect(read("src/lib/security.server.ts")).toContain("NO_NUMERICAL_REDUCTION");
  });
  it("legacy conversation surface still redirects to /athena", () => {
    expect(read("src/routes/_authenticated/conversations.tsx")).toContain("/athena");
  });
});
