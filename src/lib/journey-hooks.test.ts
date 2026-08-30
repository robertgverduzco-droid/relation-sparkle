// A-28 — journey-spine test-hook contract.
//
// The authenticated end-to-end scaffolding (e2e/authenticated_journey.py)
// depends on these hooks being stable. Source-scanning so a refactor cannot
// silently remove them, and so the contract's privacy rules stay enforced.
//
//   bunx vitest run
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const SPINE: Array<[string, string[]]> = [
  [
    "src/routes/_authenticated/today.tsx",
    ["today-screen", "today-link-athena", "today-link-living-profile", "today-link-understanding"],
  ],
  [
    "src/routes/_authenticated/athena.tsx",
    ["athena-screen", "athena-transcript", "athena-input", "athena-send", "athena-record"],
  ],
  [
    "src/routes/_authenticated/profile.tsx",
    [
      "profile-screen",
      "profile-review-link",
      "profile-pause-toggle",
      "profile-understanding-link",
      "profile-membership-link",
      "profile-sign-out",
    ],
  ],
  ["src/routes/_authenticated/profile.review.tsx", ["profile-review-screen"]],
  [
    "src/routes/_authenticated/understanding.tsx",
    [
      "understanding-screen",
      "understanding-facet",
      "understanding-revise-open",
      "understanding-revision-statement",
      "understanding-revision-submit",
    ],
  ],
  [
    "src/routes/_authenticated/membership.tsx",
    ["membership-screen", "membership-plan", "membership-restore"],
  ],
  [
    "src/routes/_authenticated/introductions.tsx",
    [
      "introductions-screen",
      "introduction-card",
      "introduction-detail-link",
    ],
  ],
  [
    "src/routes/_authenticated/introductions.$id.tsx",
    [
      "introduction-detail",
      "introduction-accept",
      "introduction-defer",
      "introduction-decline",
    ],
  ],
  ["src/routes/_authenticated/connections.tsx", ["connections-screen", "connection-card"]],
  ["src/routes/_authenticated/messages.tsx", ["messages-screen", "message-thread-link"]],
  [
    "src/components/reflection-flow.tsx",
    ["reflection-flow", "reflection-feeling", "reflection-decision-", "reflection-submit"],
  ],
  [
    "src/components/focus-mode-card.tsx",
    ["relationship-focus", "relationship-focus-opt-in", "relationship-focus-end"],
  ],
  ["src/components/ending-choice-card.tsx", ["ending-choice", "ending-path-"]],
  [
    "src/components/device-safety-panel.tsx",
    [
      "privacy-controls",
      "privacy-export",
      "privacy-delete-account",
      "privacy-sign-out-everywhere",
      "step-up-form",
      "step-up-password",
      "step-up-confirm",
    ],
  ],
  ["src/components/mobile-tab-bar.tsx", ["tab-"]],
];

describe("A-28 — journey-spine hooks are present", () => {
  for (const [file, hooks] of SPINE) {
    const src = read(file);
    for (const hook of hooks) {
      it(`${file} exposes ${hook}`, () => {
        expect(src).toContain(hook);
      });
    }
  }
});

describe("A-28 — hook contract stays narrow", () => {
  it("adds no test hooks to generic UI primitives", () => {
    const primitives = [
      "src/components/ui/button.tsx",
      "src/components/ui/input.tsx",
      "src/components/ui/card.tsx",
      "src/components/ui/dialog.tsx",
    ];
    for (const p of primitives) {
      expect(read(p)).not.toContain("data-testid");
    }
  });

  it("keeps member information and Athena language out of hook names", () => {
    const forbidden = /data-testid="[^"]*(email|name|phone|photo-url|athena-says|copy-)/i;
    for (const [file] of SPINE) {
      expect(read(file)).not.toMatch(forbidden);
    }
  });
});
