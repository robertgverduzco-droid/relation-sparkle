import { describe, it, expect } from "vitest";
import {
  observeStyle,
  mergeStyle,
  derivePermission,
  detectSeriousContext,
  alivenessGuidance,
  ANALYTICAL_REGISTER_GUARD,
  ALIVENESS_CORE,
  EMPTY_STYLE_EVIDENCE,
  type StyleEvidence,
} from "./conversational-aliveness";

const user = (content: string) => ({ role: "user", content });
const turns = (n: number, content: string) => Array.from({ length: n }, () => user(content));

describe("style observation", () => {
  it("counts only member turns", () => {
    const e = observeStyle([user("haha that's ridiculous"), { role: "assistant", content: "lol joke" }]);
    expect(e.memberTurns).toBe(1);
    expect(e.humorTurns).toBe(1);
  });

  it("ignores empty turns", () => {
    expect(observeStyle([user("   ")]).memberTurns).toBe(0);
  });

  it("detects each signal", () => {
    const e = observeStyle([
      user("that's fucking wild"),
      user("lol"),
      user("you're brutal"),
      user("I'm such a mess"),
      user("just be honest with me"),
    ]);
    expect(e.profanityTurns).toBe(1);
    expect(e.humorTurns).toBe(1);
    expect(e.teasingTurns).toBe(1);
    expect(e.selfDeprecationTurns).toBe(1);
    expect(e.directnessTurns).toBe(1);
  });

  it("accumulates across conversations", () => {
    const a = observeStyle(turns(3, "haha"));
    const b = observeStyle(turns(2, "lol"));
    expect(mergeStyle(a, b).humorTurns).toBe(5);
    expect(mergeStyle(a, b).memberTurns).toBe(5);
  });
});

describe("permission is earned, cumulative and conservative", () => {
  it("grants nothing at the start", () => {
    const p = derivePermission(EMPTY_STYLE_EVIDENCE);
    expect(p.humor).toBe("reserved");
    expect(p.profanity).toBe(false);
    expect(p.teasing).toBe(false);
    expect(p.directness).toBe(false);
  });

  // V2 mechanical fix: register unlocks from real evidence, not from
  // conversation length. Ordinary member profanity is not abuse and does not
  // require a long apprenticeship before Athena stops sounding corporate.
  it("grants the relaxed language register from genuine member profanity", () => {
    expect(
      derivePermission({ ...EMPTY_STYLE_EVIDENCE, profanityTurns: 1, memberTurns: 2 }).profanity,
    ).toBe(true);
    expect(derivePermission(EMPTY_STYLE_EVIDENCE).profanity).toBe(false);
  });

  it("moves humour through reserved -> natural -> playful on evidence alone", () => {
    expect(derivePermission(EMPTY_STYLE_EVIDENCE).humor).toBe("reserved");
    expect(derivePermission({ ...EMPTY_STYLE_EVIDENCE, humorTurns: 1, memberTurns: 2 }).humor).toBe(
      "natural",
    );
    expect(derivePermission({ ...EMPTY_STYLE_EVIDENCE, humorTurns: 3, memberTurns: 4 }).humor).toBe(
      "playful",
    );
  });

  it("still requires an invitation before teasing", () => {
    expect(
      derivePermission({ ...EMPTY_STYLE_EVIDENCE, humorTurns: 3, memberTurns: 6 }).teasing,
    ).toBe(false);
    expect(
      derivePermission({ ...EMPTY_STYLE_EVIDENCE, teasingTurns: 1, memberTurns: 4 }).teasing,
    ).toBe(true);
  });

  it("is cumulative across sessions, not per-session", () => {
    const prior: StyleEvidence = { ...EMPTY_STYLE_EVIDENCE, humorTurns: 2, memberTurns: 9 };
    const now = observeStyle([user("haha stop")]);
    expect(derivePermission(mergeStyle(prior, now)).humor).toBe("playful");
  });
});

describe("serious moments override earned playfulness", () => {
  it("detects serious material", () => {
    expect(detectSeriousContext("my father died last spring")).toBe(true);
    expect(detectSeriousContext("we went hiking on saturday")).toBe(false);
  });

  it("suppresses humour, profanity and teasing", () => {
    const earned: StyleEvidence = {
      profanityTurns: 9,
      humorTurns: 9,
      teasingTurns: 9,
      selfDeprecationTurns: 0,
      directnessTurns: 4,
      memberTurns: 40,
    };
    const p = derivePermission(earned, true);
    expect(p.humor).toBe("reserved");
    expect(p.profanity).toBe(false);
    expect(p.teasing).toBe(false);
    expect(p.seriousMoment).toBe(true);
    // Directness is a preference for straight talk, not playfulness.
    expect(p.directness).toBe(true);
  });
});

describe("guidance composition", () => {
  it("always carries the rhythm correction and forbids reflex paraphrase", () => {
    const g = alivenessGuidance({
      permission: derivePermission(EMPTY_STYLE_EVIDENCE),
      isFoundational: true,
    });
    expect(g).toContain(ALIVENESS_CORE);
    expect(g).toMatch(/What I'm hearing is/);
    expect(g).toMatch(/do not owe them a question every turn/);
    expect(g).toMatch(/never a questionnaire/i);
  });

  it("never invites profanity without evidence", () => {
    const g = alivenessGuidance({
      permission: derivePermission(EMPTY_STYLE_EVIDENCE),
      isFoundational: false,
    });
    expect(g).toMatch(/do not introduce profanity/);
    expect(g).not.toMatch(/TEASING/);
  });

  it("adds teasing and language blocks once earned", () => {
    const p = derivePermission({
      profanityTurns: 4,
      humorTurns: 6,
      teasingTurns: 3,
      selfDeprecationTurns: 0,
      directnessTurns: 2,
      memberTurns: 20,
    });
    const g = alivenessGuidance({ permission: p, isFoundational: false });
    expect(g).toMatch(/TEASING/);
    expect(g).toMatch(/less of it than they do/);
    expect(g).toMatch(/DIRECTNESS/);
  });

  it("sets playfulness down in a serious moment", () => {
    const g = alivenessGuidance({
      permission: derivePermission(
        { profanityTurns: 5, humorTurns: 8, teasingTurns: 5, selfDeprecationTurns: 0, directnessTurns: 0, memberTurns: 30 },
        true,
      ),
      isFoundational: false,
    });
    expect(g).toMatch(/THIS MOMENT IS SERIOUS/);
    expect(g).not.toMatch(/TEASING\n/);
  });

  it("never engineers return visits", () => {
    const g = alivenessGuidance({
      permission: derivePermission(EMPTY_STYLE_EVIDENCE),
      isFoundational: false,
    });
    expect(g).toMatch(/never use guilt, longing, exclusivity/);
  });
});

describe("analytical firewall", () => {
  it("keeps private reasoning free of conversational register", () => {
    expect(ANALYTICAL_REGISTER_GUARD).toMatch(/no humour, no profanity, no teasing/);
    expect(ANALYTICAL_REGISTER_GUARD).toMatch(/never affects how favourably they are assessed/);
  });
});
