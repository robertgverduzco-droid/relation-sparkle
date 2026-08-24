import { describe, expect, it } from "vitest";
import {
  EMPTY_VECTOR,
  rankByRelationalFit,
  relationalCompatibility,
  type RelationalVector,
} from "./relational-scoring";

function vec(overrides: Partial<RelationalVector>): RelationalVector {
  return { ...EMPTY_VECTOR, ...overrides };
}

describe("attachment fit — ordering matches Tatkin's core claim", () => {
  const bothSecure = relationalCompatibility(
    vec({ secure: 1, anxious: 0, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
    vec({ secure: 1, anxious: 0, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
  ).attachment.score;

  const secureWithAnxious = relationalCompatibility(
    vec({ secure: 1, anxious: 0, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
    vec({ secure: 0, anxious: 1, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
  ).attachment.score;

  const bothAnxious = relationalCompatibility(
    vec({ secure: 0, anxious: 1, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
    vec({ secure: 0, anxious: 1, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
  ).attachment.score;

  const bothAvoidant = relationalCompatibility(
    vec({ secure: 0, anxious: 0, avoidant: 1, disorganized: 0, attachmentCoverage: 1 }),
    vec({ secure: 0, anxious: 0, avoidant: 1, disorganized: 0, attachmentCoverage: 1 }),
  ).attachment.score;

  const anxiousAvoidant = relationalCompatibility(
    vec({ secure: 0, anxious: 1, avoidant: 0, disorganized: 0, attachmentCoverage: 1 }),
    vec({ secure: 0, anxious: 0, avoidant: 1, disorganized: 0, attachmentCoverage: 1 }),
  ).attachment.score;

  it("secure+secure is the best pairing", () => {
    expect(bothSecure).toBeGreaterThan(secureWithAnxious);
  });

  it("secure+anxious beats double-insecure of either same-direction kind", () => {
    expect(secureWithAnxious).toBeGreaterThan(bothAnxious);
    expect(secureWithAnxious).toBeGreaterThan(bothAvoidant);
  });

  it("the anxious/avoidant pursue-withdraw pairing is the worst of all", () => {
    expect(anxiousAvoidant).toBeLessThan(bothAnxious);
    expect(anxiousAvoidant).toBeLessThan(bothAvoidant);
    expect(anxiousAvoidant).toBeLessThan(secureWithAnxious);
  });

  it("same-direction double-insecurity (anxious/anxious vs avoidant/avoidant) score similarly", () => {
    expect(Math.abs(bothAnxious - bothAvoidant)).toBeLessThan(0.01);
  });

  it("never drops to zero or below, even for the worst pairing", () => {
    expect(anxiousAvoidant).toBeGreaterThan(0);
  });
});

describe("temperament fit — ordering matches complementary-contrast intent", () => {
  it("moderate difference scores higher than identical", () => {
    const identical = relationalCompatibility(
      vec({ novelty: 0.5, structure: 0.5, drive: 0.5, connection: 0.5, temperamentCoverage: 1 }),
      vec({ novelty: 0.5, structure: 0.5, drive: 0.5, connection: 0.5, temperamentCoverage: 1 }),
    ).temperament.score;
    const moderate = relationalCompatibility(
      vec({ novelty: 0.25, structure: 0.25, drive: 0.25, connection: 0.25, temperamentCoverage: 1 }),
      vec({ novelty: 0.75, structure: 0.75, drive: 0.75, connection: 0.75, temperamentCoverage: 1 }),
    ).temperament.score;
    expect(moderate).toBeGreaterThan(identical);
  });

  it("moderate difference scores higher than maximally opposed", () => {
    const maximallyOpposed = relationalCompatibility(
      vec({ novelty: 0, structure: 0, drive: 0, connection: 0, temperamentCoverage: 1 }),
      vec({ novelty: 1, structure: 1, drive: 1, connection: 1, temperamentCoverage: 1 }),
    ).temperament.score;
    const moderate = relationalCompatibility(
      vec({ novelty: 0.25, structure: 0.25, drive: 0.25, connection: 0.25, temperamentCoverage: 1 }),
      vec({ novelty: 0.75, structure: 0.75, drive: 0.75, connection: 0.75, temperamentCoverage: 1 }),
    ).temperament.score;
    expect(moderate).toBeGreaterThan(maximallyOpposed);
  });

  it("identical and maximally-opposed score about the same (both are the weak ends)", () => {
    const identical = relationalCompatibility(
      vec({ novelty: 0.5, structure: 0.5, drive: 0.5, connection: 0.5, temperamentCoverage: 1 }),
      vec({ novelty: 0.5, structure: 0.5, drive: 0.5, connection: 0.5, temperamentCoverage: 1 }),
    ).temperament.score;
    const maximallyOpposed = relationalCompatibility(
      vec({ novelty: 0, structure: 0, drive: 0, connection: 0, temperamentCoverage: 1 }),
      vec({ novelty: 1, structure: 1, drive: 1, connection: 1, temperamentCoverage: 1 }),
    ).temperament.score;
    expect(Math.abs(identical - maximallyOpposed)).toBeLessThan(0.01);
  });
});

describe("weighting — attachment matters more than temperament", () => {
  it("a bad attachment fit drags the combined score down more than a bad temperament fit", () => {
    const badAttachmentGoodTemperament = relationalCompatibility(
      vec({
        novelty: 0.25,
        structure: 0.25,
        drive: 0.25,
        connection: 0.25,
        temperamentCoverage: 1,
        secure: 0,
        anxious: 1,
        avoidant: 0,
        attachmentCoverage: 1,
      }),
      vec({
        novelty: 0.75,
        structure: 0.75,
        drive: 0.75,
        connection: 0.75,
        temperamentCoverage: 1,
        secure: 0,
        anxious: 0,
        avoidant: 1,
        attachmentCoverage: 1,
      }),
    ).score;

    const goodAttachmentBadTemperament = relationalCompatibility(
      vec({
        novelty: 0.5,
        structure: 0.5,
        drive: 0.5,
        connection: 0.5,
        temperamentCoverage: 1,
        secure: 1,
        anxious: 0,
        avoidant: 0,
        attachmentCoverage: 1,
      }),
      vec({
        novelty: 0.5,
        structure: 0.5,
        drive: 0.5,
        connection: 0.5,
        temperamentCoverage: 1,
        secure: 1,
        anxious: 0,
        avoidant: 0,
        attachmentCoverage: 1,
      }),
    ).score;

    expect(goodAttachmentBadTemperament).toBeGreaterThan(badAttachmentGoodTemperament);
  });
});

describe("confidence — thin data is never hidden", () => {
  it("two empty vectors still produce a valid score, with near-zero confidence", () => {
    const result = relationalCompatibility(EMPTY_VECTOR, EMPTY_VECTOR);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeLessThan(0.2);
  });

  it("confidence reflects the lower-coverage side of the pair, not the higher", () => {
    const result = relationalCompatibility(
      vec({ temperamentCoverage: 1, attachmentCoverage: 1 }),
      vec({ temperamentCoverage: 0.1, attachmentCoverage: 0.1 }),
    );
    expect(result.confidence).toBeLessThan(0.2);
  });
});

describe("rankByRelationalFit", () => {
  it("orders candidates highest-score first", () => {
    const self = vec({ secure: 1, temperamentCoverage: 1, attachmentCoverage: 1 });
    const ranked = rankByRelationalFit(self, [
      { id: "b", vector: vec({ secure: 0, anxious: 1, avoidant: 1, attachmentCoverage: 1 }), item: "B" },
      { id: "a", vector: vec({ secure: 1, attachmentCoverage: 1 }), item: "A" },
      { id: "c", vector: vec({ secure: 0, anxious: 1, attachmentCoverage: 1 }), item: "C" },
    ]);
    expect(ranked.map((r) => r.item)).toEqual(["A", "C", "B"]);
  });

  it("breaks true ties by id, never by anything content-derived", () => {
    const self = vec({});
    const ranked = rankByRelationalFit(self, [
      { id: "zzz", vector: EMPTY_VECTOR, item: "Z" },
      { id: "aaa", vector: EMPTY_VECTOR, item: "A" },
    ]);
    expect(ranked.map((r) => r.item)).toEqual(["A", "Z"]);
  });
});
