import { describe, expect, it } from "vitest";
import {
  askedLedgerBlock,
  askedQuestions,
  buildAskedLedger,
  mergeTranscripts,
  questionKey,
  questionsIn,
} from "./asked-ledger";

describe("asked-ledger", () => {
  it("extracts only interrogative sentences from Athena's turns", () => {
    expect(questionsIn("That sounds hard. What does an ordinary week look like?")).toEqual([
      "What does an ordinary week look like?",
    ]);
    expect(questionsIn("I hear you.")).toEqual([]);
  });

  it("collapses rewordings of the same question", () => {
    expect(questionKey("What does an ordinary week look like?")).toBe(
      questionKey("Tell me — what does an ordinary week look like for you?"),
    );
  });

  it("keeps questions that were dropped from the request's transcript", () => {
    const stored = [
      { role: "assistant", content: "What does an ordinary week look like?" },
      { role: "user", content: "Busy." },
    ];
    const live = [{ role: "user", content: "Anyway." }];
    const { questions, block } = buildAskedLedger(stored, live);
    expect(questions).toHaveLength(1);
    expect(block).toContain("ordinary week");
  });

  it("does not record what the member said", () => {
    const block = askedLedgerBlock(
      askedQuestions([
        { role: "user", content: "Is that a secret?" },
        { role: "assistant", content: "Who do you turn to first?" },
      ]),
    );
    expect(block).not.toContain("secret");
    expect(block).toContain("Who do you turn to first?");
  });

  it("is empty before anything has been asked", () => {
    expect(buildAskedLedger([], []).block).toBe("");
  });

  it("de-duplicates across merged transcripts", () => {
    const m = mergeTranscripts(
      [{ role: "assistant", content: "What matters most to you?" }],
      [{ role: "assistant", content: "What matters most to you?" }],
    );
    expect(m).toHaveLength(1);
  });
});
