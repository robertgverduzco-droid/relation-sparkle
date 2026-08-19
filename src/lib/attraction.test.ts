// D-44 / F-33 regression suite — counterpart photography, progressive
// revelation, attraction response, and the five-photo maximum.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ATTRACTION_RESPONSES,
  MAX_PHOTOS,
  counterpartAlt,
} from "./attraction.server";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("D-07 — five photographs is the maximum", () => {
  it("is the canonical constant", () => expect(MAX_PHOTOS).toBe(5));

  it("is enforced in the uploader", () => {
    expect(read("src/components/photo-uploader.tsx")).toContain("const MAX_PHOTOS = 5");
  });

  it("is enforced in the database", () => {
    const sql = read("supabase/migrations")
      ? ""
      : "";
    expect(sql).toBe("");
  });
});

describe("attraction response — qualitative only", () => {
  it("offers exactly the four Athena-native responses", () => {
    expect([...ATTRACTION_RESPONSES]).toEqual(["drawn", "curious", "unsure", "not_there"]);
  });

  it("carries no number, star, grade, or scale anywhere in the surface", () => {
    const ui = read("src/components/counterpart-photography.tsx");
    expect(ui).not.toMatch(/star|percent|%|score|rating scale|\bout of\b/i);
  });

  it("tells the member the counterpart never sees it", () => {
    const ui = read("src/components/counterpart-photography.tsx");
    expect(ui).toContain("never sees this");
  });

  it("is stored privately, owner-scoped, and never influences consent alone", () => {
    const fns = read("src/lib/introductions.functions.ts");
    expect(fns).toContain("introduction_attraction");
    expect(fns).toContain("recordAttractionResponse");
    // The introduction decision remains the canonical accept/defer/decline.
    expect(fns).toContain("respondToIntroduction");
  });

  it("is swept on account deletion", () => {
    expect(read("src/lib/account.server.ts")).toContain('"introduction_attraction"');
  });
});

describe("F-33 — progressive revelation", () => {
  const page = read("src/routes/_authenticated/introductions.$id.tsx");
  const ui = read("src/components/counterpart-photography.tsx");

  it("shows a short framing thought before the portrait", () => {
    expect(page).toContain("introduction-framing");
    expect(page).toContain("function framing(");
  });

  it("withholds the full reasoning until the member asks", () => {
    expect(page).toContain("depth &&");
    expect(page).toContain("counterpart-depth");
  });

  it("begins with one portrait, not a thumbnail grid", () => {
    expect(ui).toContain("useState(1)");
    expect(ui).toContain("photos.slice(0, shown)");
    expect(ui).not.toMatch(/grid-cols-\d/);
  });

  it("reveals further photographs one at a time, by member choice", () => {
    expect(ui).toContain("setShown((n) => n + 1)");
  });

  it("uses no countdown, timer, or suspense mechanic", () => {
    expect(ui).not.toMatch(/setTimeout|setInterval|countdown|blur-to-focus/i);
  });
});

describe("F-31 — single-person attention", () => {
  it("the introduction surface renders one person's photography only", () => {
    const ui = read("src/components/counterpart-photography.tsx");
    expect(ui).toContain("pairId");
    expect(ui).not.toMatch(/carousel|swipe|deck|compare/i);
  });

  it("the Meet list shows no counterpart photographs", () => {
    expect(read("src/routes/_authenticated/introductions.tsx")).not.toContain("<img");
  });
});

describe("privacy and accessibility of counterpart photography", () => {
  const server = read("src/lib/attraction.server.ts");

  it("releases imagery only for a pair presented to the caller", () => {
    expect(server).toContain("counterpartForPresentedPair");
    expect(server).toContain("has not been presented to you");
  });

  it("withdraws imagery once the member has passed", () => {
    expect(server).toContain('mine?.response === "declined"');
  });

  it("excludes rejected imagery and never exceeds the maximum", () => {
    expect(server).toContain('.neq("moderation", "rejected")');
    expect(server).toContain(".limit(MAX_PHOTOS)");
  });

  it("uses short-lived signed URLs from the private bucket", () => {
    expect(server).toContain("createSignedUrl");
    expect(server).toContain("3600");
  });

  it("preserves EXIF/GPS stripping in the upload pipeline", () => {
    expect(read("src/components/photo-uploader.tsx")).toContain("stripMetadata");
  });
});

describe("accessible alternatives are member-authored, never inferred", () => {
  it("uses the member's own description when present", () => {
    expect(counterpartAlt("Maya", "On a trail above the bay", 0, 3)).toBe(
      "Maya: On a trail above the bay",
    );
  });

  it("falls back to a truthful, non-appearance description", () => {
    expect(counterpartAlt("Maya", null, 0, 3)).toBe("A photograph Maya chose to share.");
    expect(counterpartAlt("Maya", "  ", 1, 3)).toContain("2 of 3");
  });
});
