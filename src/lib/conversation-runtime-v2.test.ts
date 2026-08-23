import { describe, expect, it } from "vitest";
import {
  detectProvenanceIntent,
  readTurn,
  turnRuntimeGuidance,
  TURN_RUNTIME_V2,
  PROVENANCE_POSTURE,
} from "./turn-runtime";
import {
  educationInventory,
  inventoryBlock,
  provenanceContext,
  verifiedQuotations,
} from "./provenance.server";

const quiet = {
  active: false,
  sourceRequest: false,
  credentialChallenge: false,
  inventoryRequest: false,
  quoteRequest: false,
};

describe("turn reading", () => {
  it("detects a source request", () => {
    for (const t of [
      "where did you get that?",
      "What is that based on?",
      "how do you know that",
      "which research says so",
    ]) {
      expect(detectProvenanceIntent(t).sourceRequest, t).toBe(true);
    }
  });

  it("detects a credential challenge", () => {
    for (const t of [
      "you're just an AI",
      "why should I trust you",
      "are you even qualified to say that",
      "what makes you an expert",
    ]) {
      expect(detectProvenanceIntent(t).credentialChallenge, t).toBe(true);
    }
  });

  it("detects an education inventory request", () => {
    expect(detectProvenanceIntent("what have you studied?").inventoryRequest).toBe(true);
    expect(detectProvenanceIntent("tell me about Athena University").inventoryRequest).toBe(true);
  });

  it("detects a quotation request", () => {
    expect(detectProvenanceIntent("can you quote him exactly").quoteRequest).toBe(true);
  });

  it("leaves ordinary conversation alone", () => {
    for (const t of [
      "my brother is getting married in June",
      "I made a terrible risotto last night",
      "work has been heavy this week",
    ]) {
      expect(detectProvenanceIntent(t).active, t).toBe(false);
    }
  });

  it("separates challenge from provenance", () => {
    const s = readTurn("that's completely wrong, I never said that");
    expect(s.challenged).toBe(true);
    expect(s.provenance.active).toBe(false);
  });

  it("notices subject-matter turns so they are not psychologised", () => {
    expect(readTurn("have you seen the new Villeneuve movie?").subjectMatter).toBe(true);
  });
});

describe("turn runtime guidance", () => {
  it("is always present and never leaks provenance posture", () => {
    const g = turnRuntimeGuidance(readTurn("I moved house last month"));
    expect(g).toContain(TURN_RUNTIME_V2);
    expect(g).not.toContain(PROVENANCE_POSTURE);
  });

  it("adds provenance posture only when asked", () => {
    const g = turnRuntimeGuidance(readTurn("where are you getting that from?"));
    expect(g).toContain(PROVENANCE_POSTURE);
  });

  it("adds a hold-your-ground block when challenged", () => {
    expect(turnRuntimeGuidance(readTurn("you're wrong about that"))).toContain(
      "THEY ARE PUSHING BACK",
    );
  });
});

describe("education inventory", () => {
  const inv = educationInventory();

  it("reports the real curriculum", () => {
    expect(inv.colleges.length).toBeGreaterThanOrEqual(7);
    expect(inv.facultyCount).toBeGreaterThanOrEqual(30);
    expect(inv.documentCount).toBeGreaterThan(50);
  });

  it("places faculty in their own college", () => {
    const humanNature = inv.colleges.find((c) => /Human Nature/i.test(c.name));
    expect(humanNature?.faculty).toContain("Carl Jung");
    expect(humanNature?.faculty).toContain("Viktor Frankl");
    const relationships = inv.colleges.find((c) => /Relationships/i.test(c.name));
    expect(relationships?.faculty).toContain("Esther Perel");
  });

  it("renders an inventory block that refuses inflation", () => {
    const block = inventoryBlock();
    expect(block).toContain("Athena University");
    expect(block).toContain("College of Human Nature");
    expect(block).toMatch(/not a degree, not a licence/i);
  });
});

describe("quotation integrity", () => {
  it("finds verbatim wording only where it exists", () => {
    expect(verifiedQuotations("He wrote that people change slowly.")).toHaveLength(0);
    expect(
      verifiedQuotations('One line reads: "the privilege of a lifetime is being who you are".'),
    ).toEqual(["the privilege of a lifetime is being who you are"]);
  });
});

describe("provenance retrieval", () => {
  it("returns nothing when nobody asked", async () => {
    const r = await provenanceContext({ intent: quiet, memberText: "we argue about dishes" });
    expect(r.block).toBe("");
    expect(r.sources).toHaveLength(0);
  });

  it("answers a credential challenge with the real inventory", async () => {
    const r = await provenanceContext({
      intent: { ...quiet, active: true, credentialChallenge: true },
      memberText: "you're just an AI, why should I trust anything you say about my marriage",
    });
    expect(r.block).toContain("Athena University");
    expect(r.block).toContain("College of");
  });

  it("attaches scholar and college metadata to retrieved material", async () => {
    const r = await provenanceContext({
      intent: { ...quiet, active: true, sourceRequest: true },
      memberText:
        "where did that come from? you said something about how we withdraw when we argue and never repair it afterwards",
    });
    expect(r.block).toContain("PROVENANCE MATERIAL");
    expect(r.block).toMatch(/Document: /);
    // Everything offered is marked either quotable-verbatim or paraphrase.
    expect(r.block).toMatch(/Verbatim wording available|No verbatim wording available/);
  });

  it("never presents synthesis as a scholar's own wording", async () => {
    const r = await provenanceContext({
      intent: { ...quiet, active: true, sourceRequest: true, quoteRequest: true },
      memberText: "what exactly did he say? quote it for me — about grief and meaning",
    });
    if (r.block) expect(r.block).toContain("not the scholar's own wording");
  });
});

describe("hostile and skeptical multi-turn regression", () => {
  const turns: { member: string; expect: (g: string) => void }[] = [
    {
      member: "I think most therapy is nonsense honestly",
      expect: (g) => expect(g).not.toContain("PROVENANCE"),
    },
    {
      member: "and you're an algorithm, why should I trust you",
      expect: (g) => expect(g).toContain(PROVENANCE_POSTURE),
    },
    {
      member: "fine — what have you actually studied then?",
      expect: (g) => expect(g).toContain(PROVENANCE_POSTURE),
    },
    {
      member: "that's wrong, I never said I avoid conflict",
      expect: (g) => expect(g).toContain("THEY ARE PUSHING BACK"),
    },
    {
      member: "anyway, we watched a terrible film last night",
      expect: (g) => {
        expect(g).not.toContain(PROVENANCE_POSTURE);
        expect(g).not.toContain("THEY ARE PUSHING BACK");
      },
    },
  ];

  it("shifts posture per turn and returns to ordinary conversation", () => {
    for (const t of turns) t.expect(turnRuntimeGuidance(readTurn(t.member)));
  });
});
