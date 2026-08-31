// Regression coverage for the reveal source-material contract.
//
// The failure this guards against: reading columns that do not exist in the
// canonical understanding_facets schema, ignoring the error, and persisting a
// permanently generic reveal written from "(nothing yet)".
import { describe, expect, it, vi } from "vitest";
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
    expect(usableRevealFacets([facet(), facet({ understanding: null }), facet({ understanding: "  " })])).toHaveLength(1);
  });

  it("carries canonical provenance (basis + evidence), never an invented strength field", () => {
    const material = buildRevealMaterial([facet()]);
    expect(material).toContain("[self_report]");
    expect(material).toContain('"I take my time, but I don\'t take it back."');
    expect(material).not.toContain("evidence_level");
    expect(material).not.toContain("member_words");
  });

  it("marks unestablished basis honestly and flags unclear facets", () => {
    const material = buildRevealMaterial([facet({ basis: null, needs_clarification: true, evidence: [] })]);
    expect(material).toContain("[unestablished]");
    expect(material).toContain("not sure about this yet");
  });
});

describe("self-healing rules", () => {
  it("a confirmed reveal is never regenerated", () => {
    expect(
      shouldRegenerateReveal({ confirmedAt: "2026-01-01T00:00:00Z", sourceFacetCount: 0, currentUsableFacets: 12 }),
    ).toBe(false);
  });

  it("an unconfirmed reveal built from no source material recovers once understanding exists", () => {
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 9 })).toBe(true);
  });

  it("an unconfirmed reveal built from too little material is replaced, not kept", () => {
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 2, currentUsableFacets: 9 })).toBe(true);
  });

  it("an unconfirmed reveal is refreshed once Athena knows materially more", () => {
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 6, currentUsableFacets: 12 })).toBe(true);
  });

  it("a real reveal is held, not rewritten on every visit", () => {
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 9, currentUsableFacets: 11 })).toBe(false);
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 0 })).toBe(false);
  });

  it("never regenerates into a thin reveal when material is below the floor", () => {
    expect(shouldRegenerateReveal({ confirmedAt: null, sourceFacetCount: 0, currentUsableFacets: 4 })).toBe(false);
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
      chain.eq = () => ({ ...chain, ...Promise.resolve(res), then: (f: (v: Table) => unknown) => Promise.resolve(res).then(f) });
      chain.maybeSingle = () => Promise.resolve(res);
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
        data: { summary: "held", insights: [], generated_at: "t", confirmed_at: null, source_facet_count: 0 },
        error: null,
      },
      understanding_facets: { data: null, error: { message: "column does not exist" } },
    });
    await expect(loadOrGenerateReveal(supabase, "u1")).rejects.toThrow(/understanding could not be read/);
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
