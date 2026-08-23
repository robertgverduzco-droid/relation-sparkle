// Athena University — retrieval contract.
//
// These tests run the lexical path only (no gateway in CI), which is the
// deterministic floor of the system: whatever the dense pass adds, retrieval
// must already be correct without it.

import { describe, it, expect } from "vitest";
import {
  EDUCATION_CHUNKS,
  MODE_POLICY,
  retrieveEducation,
  educationBlock,
  type RetrievalMode,
} from "./education-retrieval.server";

const MODES: RetrievalMode[] = ["conversation", "voice", "reflection", "pair", "meeting"];

describe("corpus", () => {
  it("indexes the whole educational corpus, not a synthesis of it", () => {
    expect(EDUCATION_CHUNKS.length).toBeGreaterThan(800);
    const docs = new Set(EDUCATION_CHUNKS.map((c) => c.doc));
    expect(docs.size).toBeGreaterThan(60);
    // Every college and the faculty layer are represented.
    for (const kind of ["university", "integration", "college", "faculty"]) {
      expect(EDUCATION_CHUNKS.some((c) => c.kind === kind)).toBe(true);
    }
  });
});

describe("relevance", () => {
  it("retrieves attachment/jealousy material for jealousy", async () => {
    const r = await retrieveEducation({
      mode: "conversation",
      current: "I get really jealous when she texts other people",
    });
    expect(r.chunks.length).toBeGreaterThan(0);
    expect(r.chunks.some((c) => /bowlby|perel|shakespeare|relationships/i.test(c.doc))).toBe(true);
  });

  it("maps bereavement language to loss and family-system material", async () => {
    const r = await retrieveEducation({
      mode: "conversation",
      current: "My dad died last year and I still feel it",
    });
    expect(r.chunks.length).toBeGreaterThan(0);
    expect(r.chunks.some((c) => /bowen|bowlby|wisdom|human-nature/i.test(c.doc))).toBe(true);
  });

  it("retrieves nothing for ordinary logistics", async () => {
    const r = await retrieveEducation({
      mode: "conversation",
      current: "I need to renew my car registration tomorrow and pick up dry cleaning",
    });
    expect(r.chunks).toHaveLength(0);
    expect(r.block).toBe("");
    expect(r.trace.empty).toBe(true);
  });

  it("retrieves nothing for small talk", async () => {
    const r = await retrieveEducation({
      mode: "conversation",
      current: "the weather is nice, went for a run this morning, made pasta",
    });
    expect(r.chunks).toHaveLength(0);
  });
});

describe("mode policy", () => {
  it("respects each mode's chunk and character budget", async () => {
    for (const mode of MODES) {
      const r = await retrieveEducation({
        mode,
        current: "I avoid conflict and just go quiet when things get hard between us",
      });
      expect(r.chunks.length).toBeLessThanOrEqual(MODE_POLICY[mode].maxChunks);
      const chars = r.chunks.reduce((n, c) => n + c.text.length, 0);
      expect(chars).toBeLessThanOrEqual(MODE_POLICY[mode].charBudget);
    }
  });

  it("keeps spoken mode tighter than written mode", () => {
    expect(MODE_POLICY.voice.charBudget).toBeLessThan(MODE_POLICY.conversation.charBudget);
    expect(MODE_POLICY.voice.maxChunks).toBeLessThanOrEqual(MODE_POLICY.conversation.maxChunks);
  });
});

describe("Faculty Principle", () => {
  it("never lets one document supply more than two chunks", async () => {
    for (const query of [
      "I avoid conflict and just go quiet",
      "we never talk about sex anymore",
      "both value family; she is direct in conflict, he withdraws",
    ]) {
      const r = await retrieveEducation({ mode: "pair", current: query });
      const perDoc = new Map<string, number>();
      for (const c of r.chunks) perDoc.set(c.doc, (perDoc.get(c.doc) ?? 0) + 1);
      for (const n of perDoc.values()) expect(n).toBeLessThanOrEqual(2);
    }
  });
});

describe("Non-Quotation Standard", () => {
  it("never sends document paths, faculty rosters, or citation cues to the model", async () => {
    const r = await retrieveEducation({
      mode: "conversation",
      current: "I avoid conflict and just go quiet",
    });
    expect(r.block).not.toMatch(/docs\/education/);
    expect(r.block).not.toMatch(/\.md/);
    expect(r.block).toMatch(/never narrated, never cited, never named/i);
  });

  it("renders nothing at all when nothing is retrieved", () => {
    expect(educationBlock([])).toBe("");
  });
});

describe("trace", () => {
  it("records provenance without carrying member words", async () => {
    const text = "I get really jealous when she texts other people";
    const r = await retrieveEducation({ mode: "conversation", current: text });
    const serialized = JSON.stringify(r.trace);
    expect(serialized).not.toContain("jealous when she texts");
    expect(r.trace.queryChars).toBeGreaterThan(0);
    expect(r.trace.retrieved.length).toBe(r.chunks.length);
    expect(r.trace.mode).toBe("conversation");
  });
});
