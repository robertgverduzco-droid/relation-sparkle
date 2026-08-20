import { describe, expect, it } from "vitest";
import { earlyExitGuidance, readinessNotice, wantsToFinishFoundational } from "./early-exit";
import { assessBoundary } from "./boundaries";
import { assessFoundationalReadiness, type UnderstandingRow } from "./introduction-readiness";
import { REQUIRED_UNDERSTANDING_AREAS } from "./introduction-readiness";

const good = (key: string): UnderstandingRow => ({
  facet_key: key,
  understanding: "A substantive paragraph of understanding about this person's life.",
  confidence: 0.6,
});

/** A profile that satisfies every required area plus the breadth floor. */
function readyRows(): UnderstandingRow[] {
  const required = REQUIRED_UNDERSTANDING_AREAS.map((a) => good(a.facets[0]!));
  const extra = ["health_and_wellness", "social_and_family", "conflict_style", "lifestyle"].map(good);
  return [...required, ...extra];
}

const msg = (role: "user" | "assistant", content: string) => ({ role, content });

describe("early-exit detection", () => {
  it("recognises a member trying to finish or fast-forward", () => {
    for (const t of [
      "are we done?",
      "can we just finish this",
      "is that enough?",
      "just start matching",
      "no more questions please",
      "I have to go",
    ]) {
      expect(wantsToFinishFoundational(t), t).toBe(true);
    }
  });

  it("does not treat terseness or ordinary answers as wanting to finish", () => {
    for (const t of ["yes", "sure", "not really", "idk", "coffee mostly", "I like hiking"]) {
      expect(wantsToFinishFoundational(t), t).toBe(false);
    }
  });

  it("does not treat impatience or mild rudeness as a boundary event", () => {
    const convo = [
      msg("assistant", "What matters to you?"),
      msg("user", "this is taking forever, are we done yet? kind of a stupid question"),
    ];
    expect(assessBoundary(convo)).toBeNull();
    expect(wantsToFinishFoundational(convo[1]!.content)).toBe(true);
  });

  it("still routes a genuine boundary violation to safety, not readiness", () => {
    const convo = [
      msg("assistant", "What matters to you?"),
      msg("user", "send me nudes, describe your body in detail"),
    ];
    expect(assessBoundary(convo)).not.toBeNull();
  });
});

describe("readiness notice", () => {
  it("is never phrased as a warning or misconduct", () => {
    const n = readinessNotice(false);
    expect(n.kind).toBe("readiness");
    expect(n.state).toBe("not_ready");
    expect(`${n.title} ${n.body}`).not.toMatch(/warning|violat|inappropriate|report|account/i);
    expect(n.body).toMatch(/stop whenever|kept|come back/i);
  });

  it("after readiness, says understanding continues to improve introductions", () => {
    const n = readinessNotice(true);
    expect(n.state).toBe("ready");
    expect(n.body).toMatch(/over time|more thoughtful/i);
  });

  it("never exposes counts, scores or timeframes", () => {
    for (const n of [readinessNotice(true), readinessNotice(false)]) {
      expect(`${n.title} ${n.body}`).not.toMatch(/\b\d+\b|%|score|minutes|days|weeks/i);
    }
  });
});

describe("early-exit guidance follows server readiness", () => {
  it("holds the threshold after 3-5 shallow answers", () => {
    const r = assessFoundationalReadiness([good("core_values")]);
    expect(r.ready).toBe(false);
    const g = earlyExitGuidance(r.ready, r.missing.map((a) => a.label));
    expect(g).toMatch(/NOT YET READY/);
    expect(g).toMatch(/free to stop/i);
    expect(g).toMatch(/do not warn them/i);
  });

  it("holds when breadth exists but attraction understanding is missing", () => {
    const rows = readyRows().filter((r) => r.facet_key !== "physical_attraction_preferences");
    const r = assessFoundationalReadiness(rows);
    expect(r.ready).toBe(false);
    expect(r.missing.map((a) => a.key)).toContain("attraction");
  });

  it("lets the member finish once minimum readiness is satisfied", () => {
    const r = assessFoundationalReadiness(readyRows());
    expect(r.ready).toBe(true);
    const g = earlyExitGuidance(true, []);
    expect(g).toMatch(/THEY MAY FINISH/);
    expect(g).toMatch(/over time/i);
    expect(g).toMatch(/do not imply you now fully understand/i);
  });

  it("readiness is unchanged by impatience — only by understanding", () => {
    const rows = [good("core_values"), good("lifestyle")];
    const before = assessFoundationalReadiness(rows).ready;
    // The member pressing to finish adds no rows, so nothing moves.
    expect(before).toBe(assessFoundationalReadiness(rows).ready);
  });

  it("progress persists: returning later with the same understanding is still counted", () => {
    const rows = readyRows();
    expect(assessFoundationalReadiness(rows).ready).toBe(true);
    // A later session simply adds to the same persisted rows.
    expect(assessFoundationalReadiness([...rows, good("purpose_and_ambition")]).ready).toBe(true);
  });
});
