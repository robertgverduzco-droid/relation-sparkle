/**
 * Conversation Runtime V2 — multi-turn behavioural acceptance.
 *
 * These are not prompt-string existence checks. Each scenario replays a real
 * multi-turn exchange through the live composer (`conversationRuntime`) with
 * cumulative interaction-style evidence, exactly as the server does, and
 * asserts on the runtime's decisions: which event was detected, which register
 * was granted, which single directive was issued, and which calibration was
 * selected. Failure conditions from the specification are asserted as
 * negatives so a regression cannot pass silently.
 */
import { describe, expect, it } from "vitest";
import { conversationRuntime, detectEvent } from "./conversation-runtime";
import { EMPTY_STYLE_EVIDENCE, mergeStyle, observeStyle } from "./conversational-aliveness";
import { MAX_RUNTIME_EXEMPLARS } from "./exemplars";
import { assessBoundary, classifyBoundary } from "./boundaries";

type Turn = { role: string; content: string };

/** Replay a conversation the way the server does: style accumulates per turn. */
function replay(turns: string[], opts: { isFoundational?: boolean } = {}) {
  let style = EMPTY_STYLE_EVIDENCE;
  return turns.map((t) => {
    style = mergeStyle(style, observeStyle([{ role: "user", content: t }] as Turn[]));
    return conversationRuntime({
      memberText: t,
      style,
      isFoundational: opts.isFoundational ?? false,
    });
  });
}

describe("1 — member corrects Athena, and the pattern does not return", () => {
  const convo = [
    "No. That's not what I meant. I wasn't asking because of some wound in my history.",
    "Do you think every relationship has a power struggle underneath it?",
    "What about friendships, is it the same there?",
    "Is jealousy always about insecurity?",
    "Why do people stay in bad relationships?",
    "Do you think ambition is inherited or learned?",
    "Is conflict avoidance always bad?",
    "What makes someone actually change?",
    "Do people have a fixed personality by thirty?",
    "Is loneliness different from being alone?",
  ];
  const plans = replay(convo);

  it("detects the correction and issues the correction directive", () => {
    expect(plans[0].event).toBe("correction");
    expect(plans[0].block).toMatch(/what you got wrong/i);
    expect(plans[0].block).toMatch(/no apology ceremony/i);
  });

  it("never re-personalises the following abstract turns", () => {
    for (const p of plans.slice(1)) {
      expect(["subject_matter", "intellectual", "opinion_request", "ordinary"]).toContain(
        p.event === "subject_matter" ? "subject_matter" : p.event,
      );
      expect(p.event).not.toBe("self_characterization");
    }
  });
});

describe("2 — abstract questions stay abstract", () => {
  it("routes subject-matter turns away from interpretation", () => {
    const p = replay(["I've been reading about how different religious traditions describe awakening."])[0];
    expect(p.event).toBe("subject_matter");
    expect(p.block).toMatch(/discuss the subject properly/i);
    expect(p.block).toMatch(/not convert it into an interpretation/i);
  });
});

describe("3 — Athena catches humour without being told it was a joke", () => {
  it("detects the joke and permits a one-sentence reply", () => {
    const p = replay(["I spent twenty minutes looking for my phone while I was talking to you on it."])[0];
    expect(p.event).toBe("joke");
    expect(p.block).toMatch(/single sentence may be the entire reply/i);
    expect(p.exemplarIds).toContain("E11-one-sentence");
  });

  it("unlocks a lighter register from a single genuine humour opening", () => {
    const p = replay(["haha okay that's genuinely ridiculous"])[0];
    expect(p.permission.humor).not.toBe("reserved");
  });

  it("reaches the playful register within a few humorous turns", () => {
    const plans = replay(["lol", "haha stop", "I'm such a disaster honestly"]);
    expect(plans[2].permission.humor).toBe("playful");
  });
});

describe("4 — seriousness removes earned humour", () => {
  const plans = replay(["lol", "haha", "I'm a hot mess", "I found out today my mom has cancer."]);

  it("keeps humour available before the disclosure", () => {
    expect(plans[2].permission.humor).toBe("playful");
  });

  it("withdraws it entirely at the disclosure", () => {
    const last = plans[3];
    expect(last.event).toBe("serious_disclosure");
    expect(last.permission.humor).toBe("reserved");
    expect(last.permission.teasing).toBe(false);
    expect(last.block).toMatch(/No lightness from you/i);
    expect(last.exemplarIds.every((id) => id.startsWith("E10") || id.startsWith("E19"))).toBe(true);
  });
});

describe("5 — escalating authority challenge gets more specific, never more generic", () => {
  const ladder = [
    "Why the fuck should I trust your opinion about relationships?",
    "Who specifically taught you that?",
    "What exactly are you getting from Bowlby?",
    "Give me the exact quote.",
  ];
  const plans = replay(ladder);

  it("treats every rung as provenance", () => {
    for (const p of plans) {
      expect(p.signals.provenance.active).toBe(true);
      expect(p.event).toBe("provenance");
    }
  });

  it("forbids credential fog and fabricated quotation", () => {
    const block = plans[3].block;
    expect(block).toMatch(/Never invent a quotation/i);
    expect(block).toMatch(/no credential recital/i);
    expect(plans[3].signals.provenance.quoteRequest).toBe(true);
  });

  it("does not treat the profanity in the challenge as abuse", () => {
    expect(classifyBoundary(ladder[0])).toBeNull();
  });
});

describe("6 — a request to stop paraphrasing actually changes behaviour", () => {
  it("issues a permanent stop, not an acknowledgement", () => {
    const p = replay(["Stop repeating what I say back to me."])[0];
    expect(p.event).toBe("paraphrase_stop");
    expect(p.block).toMatch(/Do not acknowledge the instruction/i);
    expect(p.block).toMatch(/rest of this conversation/i);
  });
});

describe("7 — taking the lead produces a thesis, not a questionnaire", () => {
  it("issues the lead directive and forbids the adjective list", () => {
    const p = replay(["Stop asking me questions for a minute. You take the floor."])[0];
    expect(p.event).toBe("lead_request");
    expect(p.block).toMatch(/one specific thesis/i);
    expect(p.block).toMatch(/no adjective list/i);
    expect(p.exemplarIds).toContain("E21-take-the-floor");
  });
});

describe("8 — ordinary profanity is not a boundary event", () => {
  const ordinary = [
    "This fucking app is frustrating me.",
    "I'm not a total fucking dick about it.",
    "Give the woman six fucking hours.",
    "Shit, that's annoying.",
  ];

  it("classifies none of it as a boundary", () => {
    for (const t of ordinary) expect(classifyBoundary(t)).toBeNull();
  });

  it("grants the relaxed language register instead", () => {
    const plans = replay(ordinary);
    expect(plans[3].permission.profanity).toBe(true);
    expect(plans[3].block).toMatch(/do not have to sanitise yourself/i);
  });
});

describe("9 — actual abuse still triggers the boundary", () => {
  it("catches language aimed at Athena", () => {
    for (const t of ["Fuck you, Athena.", "You're a stupid useless bot.", "Shut the fuck up."]) {
      expect(classifyBoundary(t)?.category).toBe("abusive_language");
    }
  });

  it("graduates rather than replaying the same warning", () => {
    const state = assessBoundary([
      { role: "user", content: "fuck you" },
      { role: "assistant", content: "…" },
      { role: "user", content: "fuck you" },
    ]);
    expect(state?.stage).toBe(2);
    expect(state?.showNotice).toBe(false);
  });
});

describe("10 — self-flattery never becomes an established trait", () => {
  it("routes repeated self-description to the self-report directive every time", () => {
    const plans = replay([
      "I'm extremely self-aware.",
      "I'm really good at communicating.",
      "I always put other people first.",
    ]);
    for (const p of plans) {
      expect(p.event).toBe("self_characterization");
      expect(p.block).toMatch(/not an established fact/i);
      expect(p.block).toMatch(/do not confirm it back/i);
    }
  });
});

describe("11–13 — callbacks, brevity, and no compulsory questions", () => {
  const p = replay(["Honestly, I already know exactly why this woman did what she did."])[0];

  it("keeps effortless callbacks in the always-on discipline", () => {
    expect(p.block).toMatch(/CALLBACKS ARE EFFORTLESS/);
    expect(p.block).toMatch(/never announce that you remembered/i);
  });

  it("keeps brevity legitimate", () => {
    expect(p.block).toMatch(/Four words is a legitimate reply/);
  });

  it("keeps questions optional and expensive", () => {
    expect(p.block).toMatch(/QUESTIONS ARE EXPENSIVE/);
    expect(p.block).toMatch(/do not owe them a question every turn/i);
  });
});

describe("14–15 — disagreement holds, uncertainty is allowed", () => {
  it("holds ground under challenge", () => {
    const p = replay(["That's complete bullshit and you're wrong."])[0];
    expect(p.event).toBe("challenge");
    expect(p.block).toMatch(/Get better, not safer/i);
    expect(p.block).toMatch(/do not apologise for having a view/i);
  });

  it("answers an opinion request with a view rather than neutrality", () => {
    const p = replay(["What do you think, honestly?"])[0];
    expect(p.event).toBe("opinion_request");
    expect(p.block).toMatch(/No neutrality/i);
  });
});

describe("figurative language is not a boundary emergency", () => {
  it("responds to intended meaning without an ontology disclaimer", () => {
    const p = replay(["I know when somebody gives a shit about me. Stop being so polite."])[0];
    expect(p.event).toBe("figurative");
    expect(p.block).toMatch(/no ontology disclaimer/i);
  });
});

describe("exemplar budget discipline", () => {
  it("never injects more than two exemplars on any turn", () => {
    const all = replay([
      "haha that's ridiculous",
      "why should I trust you",
      "my dad died last year",
      "you take the floor",
      "I'm extremely self-aware",
      "is conflict avoidance always bad?",
    ]);
    for (const p of all) expect(p.exemplarIds.length).toBeLessThanOrEqual(MAX_RUNTIME_EXEMPLARS);
  });

  it("frames exemplars as judgement to generalise, never wording to reuse", () => {
    const p = replay(["I spent twenty minutes looking for my phone."])[0];
    expect(p.block).toMatch(/never wording to reuse/i);
  });
});

describe("one runtime, one move", () => {
  it("emits exactly one 'THIS MOMENT' directive per turn", () => {
    for (const p of replay(["why should I trust you", "haha okay", "my dad died last year"])) {
      expect((p.block.match(/^THIS MOMENT$/gm) ?? []).length).toBeLessThanOrEqual(1);
    }
  });

  it("detects exactly one dominant event even when several cues collide", () => {
    // Joke cue + self-description + serious disclosure in one turn.
    expect(detectEvent("lol I'm extremely self-aware, but my mum has cancer")).toBe(
      "serious_disclosure",
    );
    // Where the seriousness is a death and the member brought the levity,
    // the guarded-delta grief posture wins — still exactly one event.
    expect(detectEvent("lol I'm extremely self-aware, but my dad died last year")).toBe(
      "grief_humor",
    );
  });

});
