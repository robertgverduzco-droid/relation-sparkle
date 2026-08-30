// Focused regression coverage for the introductions list → detail routing refactor.
//
// The summary cards on /introductions should route to the detail page; response
// actions belong only on the detail page. Source-scanning keeps this a fast unit
// test and avoids brittle DOM coupling.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("introductions list surface routes to detail only", () => {
  const listSrc = read("src/routes/_authenticated/introductions.tsx");

  it("no longer exposes in-card response actions", () => {
    expect(listSrc).not.toContain('data-testid="introduction-accept"');
    expect(listSrc).not.toContain('data-testid="introduction-defer"');
    expect(listSrc).not.toContain('data-testid="introduction-decline"');
  });

  it("keeps a single route to the detail page", () => {
    expect(listSrc).toContain('data-testid="introduction-detail-link"');
    expect(listSrc).toContain('to="/introductions/$id"');
  });
});

describe("introductions detail surface keeps response actions", () => {
  const detailSrc = read("src/routes/_authenticated/introductions.$id.tsx");

  it("exposes accept, defer, and decline actions", () => {
    expect(detailSrc).toContain('data-testid="introduction-accept"');
    expect(detailSrc).toContain('data-testid="introduction-defer"');
    expect(detailSrc).toContain('data-testid="introduction-decline"');
  });
});
