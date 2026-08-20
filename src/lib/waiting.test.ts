// ATHENA V1 — POST-FOUNDATIONAL WAITING EXPERIENCE.
//
// Binding rules under test: waiting is never empty and never fabricated.
// Candidate language appears only when runtime state supports it, counterpart
// privacy is absolute, no scores/counts/queues/countdowns/urgency ever appear,
// and minimum readiness is never treated as maximum matchability.
import { describe, it, expect } from "vitest";
import { pickDeepeningArea, waitingCopy, waitingGuidance, type WaitingState } from "./waiting";
import { REQUIRED_UNDERSTANDING_AREAS } from "./introduction-readiness";
import { FACET_KEYS } from "./facets";

const base = (over: Partial<WaitingState> = {}): WaitingState => ({
  phase: "looking",
  candidate: "none",
  earlyCommunity: false,
  holdKind: null,
  deepen: null,
  ...over,
});

const memberText = (s: WaitingState) => {
  const c = waitingCopy(s);
  return [c?.headline, c?.body, c?.note, c?.invitation].filter(Boolean).join(" ");
};

const allText = (s: WaitingState) => [memberText(s), waitingGuidance(s)].filter(Boolean).join(" ");

// Athena's understanding, deeply written.
const deepRows = FACET_KEYS.map((k) => ({
  facet_key: k,
  understanding: "A genuinely substantive understanding written in her own words.",
  confidence: 0.7,
}));

describe("Today — Looking state exists and is never empty", () => {
  it("foundationally ready with no candidate produces real copy", () => {
    const c = waitingCopy(base());
    expect(c).not.toBeNull();
    expect(c!.headline.length).toBeGreaterThan(0);
    expect(c!.body.length).toBeGreaterThan(0);
    expect(c!.note).toBeTruthy();
  });

  it("deeply understood member with no candidate still gets the Looking state", () => {
    const c = waitingCopy(base({ deepen: pickDeepeningArea(deepRows) }));
    expect(c!.headline).toMatch(/looking/i);
  });

  it("renders nothing when not ready, held, or an introduction exists", () => {
    expect(waitingCopy(base({ phase: "not_ready" }))).toBeNull();
    expect(waitingCopy(base({ phase: "held", holdKind: "relationship_focus" }))).toBeNull();
    expect(waitingCopy(base({ phase: "held", holdKind: "resting" }))).toBeNull();
    expect(waitingCopy(base({ phase: "held", holdKind: "paused" }))).toBeNull();
    expect(waitingCopy(base({ phase: "introduction_available" }))).toBeNull();
  });

  it("guidance is silent outside the looking phase", () => {
    for (const phase of ["not_ready", "held", "introduction_available"] as const) {
      expect(waitingGuidance(base({ phase }))).toBe("");
    }
  });
});

describe("no fabricated activity, scores, counts or urgency", () => {
  const states = [
    base(),
    base({ earlyCommunity: true }),
    base({ candidate: "unresolved_candidate" }),
    base({ candidate: "unresolved_candidate", earlyCommunity: true, deepen: { key: "lifestyle", label: "The shape of your days" } }),
  ];

  it("never quantifies people, matches or progress", () => {
    for (const s of states) {
      // Member-facing words only: guidance legitimately *forbids* these terms.
      expect(memberText(s)).not.toMatch(
        /\b\d+\s*(%|percent|matches?|candidates?|people|members?|days?|hours?|weeks?)\b|score|rating|percentage|out of ten|queue|position|countdown/i,
      );
    }
  });

  it("never promises a timeframe or manufactures scarcity or streaks", () => {
    for (const s of states) {
      expect(memberText(s)).not.toMatch(
        /\bhurry\b|\bby (tomorrow|next week)\b|hurry|act now|limited|running out|don't miss|streak|daily|every day|last chance/i,
      );
    }
  });

  it("never claims continuous background computation", () => {
    for (const s of states) {
      expect(allText(s)).not.toMatch(/searching right now|scanning|processing|analyz|crunching|working on it around the clock/i);
    }
  });

  it("never pressures the member to keep talking", () => {
    const text = allText(base());
    expect(text).toMatch(/no need|guarantees nothing|without pressure/i);
  });
});

describe("candidate-specific language is state-gated", () => {
  it("no candidate → Athena may not imply one exists, and is told so", () => {
    const s = base();
    expect(waitingCopy(s)!.headline).not.toMatch(/someone/i);
    expect(waitingGuidance(s)).toMatch(/no particular person|may not say or imply that there is/i);
  });

  it("real unresolved candidate → the honest 'may be someone' state is unlocked", () => {
    const s = base({ candidate: "unresolved_candidate" });
    expect(waitingCopy(s)!.headline).toMatch(/someone worth considering/i);
    expect(waitingGuidance(s)).toMatch(/unresolved information prevents/i);
  });

  it("counterpart privacy is absolute in the unresolved state", () => {
    const s = base({ candidate: "unresolved_candidate", deepen: { key: "boundaries", label: "Where your lines are" } });
    const text = allText(s);
    expect(text).toMatch(/never reveal or hint/i);
    // Never the forbidden framing: "someone requires X of you".
    expect(text).not.toMatch(/requires? (that )?you|someone needs you to|they want you to be/i);
    expect(waitingCopy(s)!.note).toMatch(/won't tell you anything about who/i);
  });
});

describe("minimum readiness ≠ maximum matchability", () => {
  it("a minimally understood member is offered the widest genuine gap first", () => {
    // Ready-but-thin: required areas thinly held, breadth short.
    const thin = REQUIRED_UNDERSTANDING_AREAS.map((a) => ({
      facet_key: a.facets[0],
      understanding: "Something substantive and specific about them here.",
      confidence: 0.4,
    }));
    const area = pickDeepeningArea(thin);
    expect(area).not.toBeNull();
    // The chosen area is genuinely not yet understood.
    expect(thin.some((r) => r.facet_key === area!.key && r.confidence >= 0.35)).toBe(false);
  });

  it("required areas are prioritised over incidental gaps", () => {
    const rows = FACET_KEYS.filter((k) => k !== "boundaries").map((k) => ({
      facet_key: k,
      understanding: "A genuinely substantive understanding written in her own words.",
      confidence: 0.7,
    }));
    expect(pickDeepeningArea(rows)?.key).toBe("boundaries");
  });

  it("a fully understood member is offered nothing to fix", () => {
    expect(pickDeepeningArea(deepRows)).toBeNull();
  });

  it("the optional invitation is one area at a time, never a checklist", () => {
    const c = waitingCopy(base({ deepen: { key: "lifestyle", label: "The shape of your days" } }));
    expect(c!.invitation).toBeTruthy();
    expect(c!.invitation!.split(/[;,]/).length).toBeLessThanOrEqual(2);
  });
});

describe("early community / low density", () => {
  it("is honest and configuration-driven, never a member count", () => {
    const c = waitingCopy(base({ earlyCommunity: true }));
    expect(c!.body).toMatch(/building this community/i);
    expect(c!.body).not.toMatch(/\d/);
    expect(waitingGuidance(base({ earlyCommunity: true }))).toMatch(/never give member counts/i);
  });

  it("normal density says nothing about community size", () => {
    expect(waitingCopy(base())!.body).not.toMatch(/community/i);
    expect(waitingGuidance(base())).not.toMatch(/EARLY COMMUNITY/);
  });
});

describe("ongoing conversation is not continued intake", () => {
  it("guidance forbids re-running the foundational interview", () => {
    expect(waitingGuidance(base())).toMatch(/not continued intake|do not re-run the foundational/i);
  });

  it("explains understanding may reduce uncertainty without promising a match", () => {
    const g = waitingGuidance(base());
    expect(g).toMatch(/more clearly you can recognise/i);
    expect(g).toMatch(/guarantees nothing|buys no priority/i);
  });

  it("no V2 concierge capability is described", () => {
    expect(allText(base({ earlyCommunity: true }))).not.toMatch(
      /restaurant|reservation|itinerary|travel|date idea|concierge|activity near/i,
    );
  });
});
