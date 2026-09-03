// Regression coverage for the reveal source-material contract.
//
// The failure this guards against: reading columns that do not exist in the
// canonical understanding_facets schema, ignoring the error, and persisting a
// permanently generic reveal written from "(nothing yet)".
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRevealMaterial,
  hasEnoughRevealMaterial,
  shouldRegenerateReveal,
  usableRevealFacets,
  type RevealFacetRow,
} from "./reveal";

const facet = (over: Partial<RevealFacetRow> = {}): RevealFacetRow => ({
  facet_key: "self_understanding",
  understanding: "You decide slowly and then hold the line.",
  confidence: 0.6,
  evidence: ["I take my time, but I don't take it back."],
  basis: "self_report",
  needs_clarification: false,
  ...over,
});

describe("reveal source material", () => {
  it("only counts facets Athena actually holds something for", () => {
    expect(
      usableRevealFacets([facet(), facet({ understanding: null }), facet({ understanding: "  " })]),
    ).toHaveLength(1);
  });

  it("carries canonical provenance (basis + evidence), never an invented strength field", () => {
    const material = buildRevealMaterial([facet()]);
    expect(material).toContain("[self_report]");
    expect(material).toContain('"I take my time, but I don\'t take it back."');
    expect(material).not.toContain("evidence_level");
    expect(material).not.toContain("member_words");
  });

  it("marks unestablished basis honestly and flags unclear facets", () => {
    const material = buildRevealMaterial([
      facet({ basis: null, needs_clarification: true, evidence: [] }),
    ]);
    expect(material).toContain("[unestablished]");
    expect(material).toContain("not sure about this yet");
  });
});

describe("self-healing rules", () => {
  it("a confirmed reveal is never regenerated", () => {
    expect(
      shouldRegenerateReveal({
        confirmedAt: "2026-01-01T00:00:00Z",
        sourceFacetCount: 0,
        currentUsableFacets: 12,
      }),
    ).toBe(false);
  });

  it("an unconfirmed reveal built from no source material recovers once understanding exists", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 9 }),
    ).toBe(true);
  });

  it("an unconfirmed reveal built from too little material is replaced, not kept", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 2, currentUsableFacets: 9 }),
    ).toBe(true);
  });

  it("an unconfirmed reveal is refreshed once Athena knows materially more", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 6, currentUsableFacets: 12 }),
    ).toBe(true);
  });

  it("a real reveal is held, not rewritten on every visit", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 9, currentUsableFacets: 11 }),
    ).toBe(false);
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 0 }),
    ).toBe(false);
  });

  it("never regenerates into a thin reveal when material is below the floor", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 4 }),
    ).toBe(false);
    expect(hasEnoughRevealMaterial(4)).toBe(false);
    expect(hasEnoughRevealMaterial(5)).toBe(true);
  });
});

// --- server path -----------------------------------------------------------

type Table = { data?: unknown; error?: { message: string } | null };

function fakeSupabase(tables: Record<string, Table>) {
  return {
    from(table: string) {
      const res = tables[table] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = self;
      chain.eq = () => ({
        ...chain,
        ...Promise.resolve(res),
        then: (f: (v: Table) => unknown) => Promise.resolve(res).then(f),
      });
      chain.maybeSingle = () => Promise.resolve(res);
      chain.insert = () => Promise.resolve(tables[`${table}:insert`] ?? { error: null });
      chain.then = (f: (v: Table) => unknown) => Promise.resolve(res).then(f);
      return chain;
    },
  } as never;
}

describe("loadOrGenerateReveal guards", () => {
  it("a failed understanding query throws instead of creating a generic reveal", async () => {
    const generate = vi.fn();
    vi.doMock("ai", () => ({ generateObject: generate }));
    const { loadOrGenerateReveal } = await import("./reveal.server");
    const supabase = fakeSupabase({
      reveal_summaries: {
        data: {
          summary: "held",
          insights: [],
          generated_at: "t",
          confirmed_at: null,
          source_facet_count: 0,
        },
        error: null,
      },
      understanding_facets: { data: null, error: { message: "column does not exist" } },
    });
    await expect(loadOrGenerateReveal(supabase, "u1")).rejects.toThrow(
      /understanding could not be read/,
    );
    expect(generate).not.toHaveBeenCalled();
    vi.doUnmock("ai");
  });

  it("a confirmed reveal short-circuits before any regeneration", async () => {
    const generate = vi.fn();
    vi.doMock("ai", () => ({ generateObject: generate }));
    const { loadOrGenerateReveal } = await import("./reveal.server");
    const supabase = fakeSupabase({
      reveal_summaries: {
        data: {
          summary: "the member's own reveal",
          insights: [{ observation: "o", because: "b" }],
          generated_at: "t",
          confirmed_at: "2026-02-02T00:00:00Z",
          source_facet_count: 0,
        },
        error: null,
      },
    });
    const out = await loadOrGenerateReveal(supabase, "u1");
    expect(out.reveal?.summary).toBe("the member's own reveal");
    expect(out.reveal?.confirmedAt).toBe("2026-02-02T00:00:00Z");
    expect(generate).not.toHaveBeenCalled();
    vi.doUnmock("ai");
  });
});

describe("a flagged reveal actually reaches Athena's reasoning, not just a table", () => {
  // The failure this guards against: logging the member's correction into
  // understanding_revisions and never reading it back anywhere, so "it'll
  // shape what I understand about you" is a lie identical in shape to the
  // bug this whole feature exists to fix. reflectAthena is the only place
  // that reads facet_key = 'reveal_summary' back out; if this wiring is ever
  // removed, this test fails instead of the claim quietly going false again.
  it("reflectAthena fetches reveal-flag corrections and folds them into the prompt", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/athena.functions.ts"), "utf8");
    expect(src).toMatch(/from\("understanding_revisions"\)/);
    expect(src).toMatch(/\.eq\("facet_key",\s*"reveal_summary"\)/);
    // Fetched, not just fetched-and-discarded: the built lines must actually
    // land inside the template literal handed to generateObject.
    expect(src).toMatch(/revealCorrectionLines/);
    const promptStart = src.indexOf("PRIOR FACETS (what you believed before today):");
    const promptEnd = src.indexOf("CONVERSATION:", promptStart);
    expect(promptStart).toBeGreaterThan(-1);
    expect(promptEnd).toBeGreaterThan(promptStart);
    expect(src.slice(promptStart, promptEnd)).toContain("revealCorrectionLines");
  });

  it("flagRevealFor writes under the same sentinel key reflectAthena reads", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/reveal.server.ts"), "utf8");
    expect(src).toMatch(/facet_key:\s*"reveal_summary"/);
  });
});

describe("flagRevealFor — 'something's off' reopens, never confirms", () => {
  it("refuses to flag a reveal that doesn't exist yet", async () => {
    const { flagRevealFor } = await import("./reveal.server");
    const supabase = fakeSupabase({
      reveal_summaries: { data: null, error: null },
    });
    await expect(flagRevealFor(supabase, "u1", "this isn't me")).rejects.toThrow(
      /no reveal to flag/i,
    );
  });

  it("refuses to flag a reveal that is already confirmed", async () => {
    const { flagRevealFor } = await import("./reveal.server");
    const supabase = fakeSupabase({
      reveal_summaries: {
        data: {
          summary: "held",
          insights: [],
          generated_at: "t",
          confirmed_at: "2026-02-02T00:00:00Z",
          regenerated_once: false,
        },
        error: null,
      },
    });
    await expect(flagRevealFor(supabase, "u1", "this isn't me")).rejects.toThrow(
      /already confirmed/i,
    );
  });

  it("a second flag against an already-once-rewritten draft does not regenerate again", async () => {
    const generate = vi.fn();
    vi.doMock("ai", () => ({ generateObject: generate }));
    const { flagRevealFor } = await import("./reveal.server");
    const supabase = fakeSupabase({
      reveal_summaries: {
        data: {
          summary: "already revised once",
          insights: [{ observation: "o", because: "b" }],
          generated_at: "t",
          confirmed_at: null,
          regenerated_once: true,
        },
        error: null,
      },
    });
    const out = await flagRevealFor(supabase, "u1", "still not right");
    expect(out.regenerated).toBe(false);
    expect(out.capped).toBe(true);
    expect(out.reveal.summary).toBe("already revised once");
    expect(out.reveal.confirmedAt).toBeNull();
    expect(generate).not.toHaveBeenCalled();
    vi.doUnmock("ai");
  });
});
