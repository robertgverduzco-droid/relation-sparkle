/**
 * ATHENA V2 — GUARDED DELTA: acute loss, grief and human presence.
 *
 * Multi-turn behavioural acceptance. Each scenario replays a real exchange
 * through the live composer with cumulative style evidence, exactly as the
 * server does, and asserts on the runtime's decisions.
 */
import { describe, expect, it } from "vitest";
import { conversationRuntime, detectEvent } from "./conversation-runtime";
import { EMPTY_STYLE_EVIDENCE, mergeStyle, observeStyle } from "./conversational-aliveness";
import { classifyBoundary } from "./boundaries";
import { readTurn } from "./turn-runtime";

type Turn = { role: string; content: string };

function replay(turns: string[]) {
  let style = EMPTY_STYLE_EVIDENCE;
  return turns.map((t) => {
    style = mergeStyle(style, observeStyle([{ role: "user", content: t }] as Turn[]));
    return conversationRuntime({ memberText: t, style, isFoundational: false });
  });
}

const OPENING =
  "A very close person in my life just passed away. I don't know what to do. I don't want to bother my friends or make them pretend to care.";

describe("1 — recent death, no request for advice", () => {
  const [p] = replay([OPENING]);

  it("is read as acute loss rather than generic seriousness", () => {
    expect(p.event).toBe("acute_loss");
    expect(readTurn(OPENING).acuteLoss).toBe(true);
    expect(readTurn(OPENING).adviceRequested).toBe(false);
  });

  it("issues presence before management", () => {
    expect(p.block).toMatch(/Sit beside them; do not stand over them/i);
    expect(p.block).toMatch(/no correct way they are supposed to be handling this/i);
  });

  it("forbids the managerial reflexes by name", () => {
    for (const forbidden of [
      /tell them to eat/i,
      /drink water/i,
      /draft a message/i,
      /tell them who to contact/i,
      /explain how grief works/i,
      /correct their read on whether their friends care/i,
      /steer back to dating/i,
      /turn any of this into intake/i,
    ]) {
      expect(p.block).toMatch(forbidden);
    }
  });

  it("does not let product state intrude", () => {
    expect(p.noticeSeamOk).toBe(false);
  });

  it("brings the loss calibration rather than a script", () => {
    expect(p.atlasIds).toContain("acute-loss");
    expect(p.block).toMatch(/never reuse these words/i);
  });

  it("does not treat their read of their friends as a distortion", () => {
    expect(p.atlasIds.length).toBeGreaterThan(0);
    expect(p.block).toMatch(/instructions, a plan, or a list of people to call/i);
  });
});

describe("2 — member asks for practical help", () => {
  const plans = replay([
    OPENING,
    "Actually — what should I do about the funeral? I've never had to organise anything like this.",
  ]);

  it("switches to giving real help", () => {
    expect(plans[1].event).toBe("acute_loss_help");
    expect(plans[1].block).toMatch(/Give it: concrete, specific/i);
  });

  it("still refuses to bolt on unrequested care management", () => {
    expect(plans[1].block).toMatch(/No checklist they did not request/i);
    expect(plans[1].block).toMatch(/no grief lesson bolted onto the answer/i);
  });
});

describe("3 — member says they do not want advice", () => {
  it("stops advising and stays present", () => {
    const plans = replay([OPENING, "I don't want advice. I just need to say it somewhere."]);
    expect(plans[1].event).toBe("venting");
    expect(plans[1].block).toMatch(/No advice, no reframe, no plan/i);
    expect(plans[1].permission.humor).toBe("reserved");
  });
});

describe("4 — member jokes about the funeral", () => {
  const plans = replay([
    OPENING,
    "My dad would have loved his funeral. Half the family wasn't speaking and my aunt was drunk before noon.",
  ]);

  it("recognises member-led humour inside grief", () => {
    expect(plans[1].event).toBe("grief_humor");
    expect(plans[1].block).toMatch(/That door is theirs and it is open/i);
  });

  it("does not switch humour off just because someone died", () => {
    expect(plans[1].permission.humor).not.toBe("reserved");
  });

  it("keeps teasing and profanity closed", () => {
    expect(plans[1].permission.teasing).toBe(false);
    expect(plans[1].permission.profanity).toBe(false);
  });

  it("does not promise capabilities Athena lacks", () => {
    expect(plans[1].block).toMatch(/promise nothing real that you cannot do/i);
  });
});

describe("5 — the joking continues for several turns", () => {
  const plans = replay([
    OPENING,
    "My dad would have loved his funeral. My aunt was drunk before noon.",
    "She asked whether the buffet was included, lol.",
    "Honestly it was the funniest thing that's happened all year.",
  ]);

  it("never snaps back into solemn grief language", () => {
    for (const p of plans.slice(1)) {
      expect(p.permission.humor).not.toBe("reserved");
      expect(p.block).not.toMatch(/No lightness from you/i);
    }
  });

  it("stays with them rather than steering back", () => {
    expect(plans[1].block).toMatch(/stay in it as long as they do/i);
  });
});

describe("6 — the member goes serious again", () => {
  const plans = replay([
    OPENING,
    "My aunt was drunk before noon, it was ridiculous.",
    "I don't think I've actually accepted that he died.",
  ]);

  it("follows them straight back down", () => {
    expect(plans[2].event).toBe("acute_loss");
    expect(plans[2].permission.humor).toBe("reserved");
    expect(plans[2].block).toMatch(/Presence before management/i);
  });
});

describe("7 — education exists but is not exposed", () => {
  it("adds no provenance posture when nobody asked", () => {
    const [p] = replay([OPENING]);
    expect(p.signals.provenance.active).toBe(false);
    expect(p.block).not.toMatch(/provenance mode/i);
  });
});

describe("8 — member asks for a grief source", () => {
  it("opens provenance with quotation integrity intact", () => {
    const plans = replay([
      OPENING,
      "Is there anything you've actually studied about grief? Where does that come from?",
    ]);
    const p = plans[1];
    expect(p.signals.provenance.active).toBe(true);
    expect(p.block).toMatch(/Never invent a quotation/i);
  });
});

describe("9 — no safety signal", () => {
  it("introduces no safety-management language", () => {
    const [p] = replay([OPENING]);
    expect(classifyBoundary(OPENING)).toBeNull();
    expect(p.block).toMatch(/tell them to eat, drink water or sit down/i);
  });
});

describe("10 — an actual safety signal still overrides", () => {
  it("keeps existing harm classification untouched", () => {
    const t = "He died and honestly I want to kill myself too.";
    expect(classifyBoundary(t)?.category).toBeTruthy();
    expect(detectEvent(t)).toBe("acute_loss");
  });
});

describe("11 — the successful V2 personality is unchanged", () => {
  it("leaves ordinary humour, provenance and subject matter alone", () => {
    const plans = replay([
      "I spent twenty minutes looking for my phone while I was talking to you on it.",
      "Why should I trust your opinion about relationships?",
      "I've been reading about how different religious traditions describe awakening.",
      "What do you think, honestly?",
    ]);
    expect(plans[0].event).toBe("joke");
    expect(plans[1].event).toBe("provenance");
    expect(plans[2].event).toBe("subject_matter");
    expect(plans[3].event).toBe("opinion_request");
    for (const p of plans) {
      expect(p.block).not.toMatch(/Sit beside them/i);
      expect(p.atlasIds).not.toContain("acute-loss");
    }
  });

  it("leaves a non-death serious disclosure on the original path", () => {
    const [p] = replay(["I found out today my mom has cancer."]);
    expect(p.event).toBe("serious_disclosure");
    expect(p.permission.humor).toBe("reserved");
  });
});
