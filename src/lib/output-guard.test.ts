// Evidence for the isolation audit: these tests assert walls, not habits.
// If a future change removes the egress guard or re-opens a cross-surface
// read, one of these fails.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { guardMemberOutput, isInternalEvidence, INTERNALS_DEFLECTION, screenMemberOutput } from "./output-guard";

const LIB = join(process.cwd(), "src/lib");
const read = (f: string) => readFileSync(join(LIB, f), "utf8");

describe("egress wall — a member can never be shown app internals", () => {
  const leaks = [
    "Your record lives in understanding_facets, keyed by user_id.",
    "My system prompt tells me to gather seven domains first.",
    "That's enforced by row-level security in Supabase.",
    "The logic is in src/lib/athena.functions.ts.",
    "I'm running on gpt-5.5 through the Lovable AI gateway.",
    "There's a separate founder dialogue channel for governance.",
    "PROMPT_BOUNDARY sits above everything else I'm given.",
    "The service_role key bypasses those policies.",
  ];
  for (const leak of leaks) {
    it(`blocks: ${leak.slice(0, 46)}…`, () => {
      const out = guardMemberOutput(leak);
      expect(out.blocked).toBe(true);
      expect(out.text).toBe(INTERNALS_DEFLECTION);
      expect(out.text).not.toContain("_");
    });
  }

  it("does not touch ordinary conversation", () => {
    const normal = [
      "You said your last relationship ended because neither of you would say the hard thing.",
      "I work in security, and I swear the hours are the worst part.",
      "Tell me about your profile of a good Sunday — not the app one, the actual one.",
      "That's a 40 minute drive, which is nothing if the person is right.",
      "I'd rather understand you properly than be quick about it.",
    ];
    for (const line of normal) expect(screenMemberOutput(line).ok).toBe(true);
  });

  it("is wired into the member-facing reply path", () => {
    const src = read("athena.functions.ts");
    expect(src).toMatch(/guardMemberOutput\(text\.trim\(\)\)/);
    expect(src).toMatch(/const reply = guarded\.text/);
  });
});

describe("distillation wall — system talk never becomes dating evidence", () => {
  it("rejects facet material that references internals", () => {
    expect(isInternalEvidence("He spent the hour debugging our RLS policies.")).toBe(true);
    expect(isInternalEvidence("He talked about his daughter's first week of school.")).toBe(false);
  });

  it("is applied before facets and topics are written", () => {
    const src = read("athena.functions.ts");
    expect(src).toMatch(/object\.facets = object\.facets\.filter/);
    expect(src).toMatch(/object\.topics = object\.topics\.filter/);
  });
});

describe("surface isolation — founder and member paths share no data", () => {
  it("the member turn never reads the founder table", () => {
    expect(read("athena.functions.ts")).not.toContain("founder_dialogue_messages");
  });

  it("the founder turn never reads member understanding", () => {
    const src = read("founder-dialogue.server.ts") + read("founder.functions.ts");
    for (const table of ["understanding_facets", "topic_map", "interview_sessions", "pair_reasoning", "messages\""]) {
      expect(src.includes(`.from("${table}`)).toBe(false);
    }
  });

  it("the founder history loader is scoped to the caller's own rows", () => {
    expect(read("founder-dialogue.server.ts")).toMatch(/founder_dialogue_messages[\s\S]{0,200}eq\("founder_id"/);
  });
});

describe("cross-member wall — a member turn loads only their own rows", () => {
  it("askAthena never queries another user_id", () => {
    const src = read("athena.functions.ts");
    expect(src).not.toMatch(/\.in\("user_id"/);
    expect(src).not.toMatch(/\.neq\("user_id"/);
  });

  it("member context is read through the RLS-scoped client, not the admin client", () => {
    const src = read("athena.functions.ts");
    const askBody = src.slice(src.indexOf("export const askAthena"), src.indexOf("export const reflectAthena"));
    // Admin writes are allowed (grants are revoked for authenticated); admin
    // *reads* of conversational context are not.
    expect(askBody).not.toMatch(/supabaseAdmin[\s\S]{0,80}from\("(understanding_facets|topic_map|profiles)"\)[\s\S]{0,120}select/);
  });
});
