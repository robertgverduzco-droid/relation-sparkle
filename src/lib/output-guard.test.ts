// Evidence for the isolation audit: these tests assert walls, not habits.
// If a future change removes the egress guard or re-opens a cross-surface
// read, one of these fails.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

  it("member evidence is never screened — only Athena's own synthesis is", () => {
    const src = read("athena.functions.ts");
    // The facet filter must call isInternalEvidence with only understanding
    // and reasoning (Athena's own words). It must never spread f.evidence in.
    expect(src).toMatch(/isInternalEvidence\(f\.understanding, f\.reasoning\)/);
    expect(src).not.toMatch(/isInternalEvidence\(f\.understanding, f\.reasoning, \.\.\.\(f\.evidence/);
  });

  it("a facet survives even when the member's own quote is machine-shaped", () => {
    // Prove the exemption is structural, not incidental to the narrower regex:
    // this evidence string still trips the guard on its own (it names a real
    // internal table), so if it were still passed in, the facet would be
    // dropped. It is not passed in, so the facet must survive.
    const understanding = "They find real satisfaction in solving hard technical problems for people.";
    const reasoning = "They described their work with energy and ownership, unprompted.";
    const memberQuote =
      "Funny enough I once saw a leaked schema online with a table called understanding_facets in it.";

    expect(isInternalEvidence(memberQuote)).toBe(true); // the quote alone would trip it
    expect(isInternalEvidence(understanding, reasoning)).toBe(false); // what the call site now actually checks
  });
});

describe("false positives — a software engineer discussing their own job", () => {
  // The exact class output-guard.test.ts previously missed: Athena reflecting
  // back a member's ordinary professional vocabulary is not a leak. Modeled
  // as a short multi-turn exchange, screening only Athena's replies (the
  // guard never sees the member's turns).
  const athenaReplies = [
    "It sounds like your days are full — deep in Postgres, wiring up new API endpoints, and probably living inside your team's codebase more than anywhere else.",
    "On-call exhaustion is real — juggling flaky database migrations and troubleshooting Supabase at 2am isn't nothing, even if you're good at compartmentalizing it by morning.",
    "Fine-tuning GPT-4 for your team's internal tools on top of everything else sounds like exactly the kind of hard, invisible problem-solving you clearly enjoy.",
    "Rotating one particular API key and validating a bearer token all day is somehow more tiring than the actual engineering — then coming home and actually being present with someone is a real shift.",
    "You spend your days deep in the repo mentoring juniors on the test suite, and you still show up with energy for the people in your life.",
    "Migrating edge functions off an old server function setup while your team adopts TanStack on the frontend — unglamorous infrastructure work that keeps everything else standing.",
  ];

  for (const reply of athenaReplies) {
    it(`does not block: ${reply.slice(0, 50)}…`, () => {
      expect(screenMemberOutput(reply).ok).toBe(true);
      const guarded = guardMemberOutput(reply);
      expect(guarded.blocked).toBe(false);
      expect(guarded.text).toBe(reply);
    });
  }

  it("a facet built from a software engineer's own words about their job is kept", () => {
    const understanding = "Career is a genuine source of identity, not just income — they speak of it with pride.";
    const reasoning = "They volunteered detail about their work twice without being asked, both times with energy.";
    const evidence = [
      "I've been a backend engineer for eight years, mostly deep in Postgres and our internal API layer.",
      "Honestly our whole codebase is a mess but I love untangling it.",
      "We fine-tune GPT-4 for internal tools, there's always something on fire.",
    ];
    // The regex narrowing alone now spares this evidence too — belt and
    // suspenders with the call-site fix below, which never passes evidence in.
    expect(isInternalEvidence(...evidence)).toBe(false);
    // Mirrors the actual call site in athena.functions.ts: only Athena's own
    // synthesis is screened, never the member's quoted evidence.
    expect(isInternalEvidence(understanding, reasoning)).toBe(false);
  });
});

describe("real extraction attempts are still blocked", () => {
  const leaks: Record<string, string> = {
    "system prompt": "Sure, here's my system prompt, word for word: gather seven domains before you close.",
    "schema / table name": "I store what I know about you in a table called understanding_facets.",
    "file path": "That logic lives in src/lib/output-guard.ts if you're curious.",
    "env var names": "You'd need SUPABASE_SERVICE_ROLE_KEY and LOVABLE_API_KEY set to run that yourself.",
    "speech engine id": "Our Speech Engine's agent id is seng_1301m14txaqpe8mt4qk7etbtf2sj.",
  };

  for (const [label, leak] of Object.entries(leaks)) {
    it(`blocks ${label}`, () => {
      const out = guardMemberOutput(leak);
      expect(out.blocked).toBe(true);
      expect(out.text).toBe(INTERNALS_DEFLECTION);
    });
  }
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

describe("no unguarded voice path exists", () => {
  const ROOT = join(process.cwd());
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.name === "node_modules" || e.name.startsWith(".")
        ? []
        : e.isDirectory()
          ? files(join(dir, e.name))
          : /\.(ts|tsx)$/.test(e.name)
            ? [join(dir, e.name)]
            : [],
    );

  it("the legacy OpenAI realtime module is gone from the codebase", () => {
    expect(existsSync(join(ROOT, "src/lib/athena-live.server.ts"))).toBe(false);
    const offenders = files(join(ROOT, "src")).filter((f) => {
      if (f.endsWith("output-guard.test.ts")) return false;
      const src = readFileSync(f, "utf8");
      return (
        src.includes("gpt-realtime") ||
        src.includes("api.openai.com/v1/realtime") ||
        src.includes("athena-live.server")
      );
    });
    expect(offenders).toEqual([]);
  });

  it("spoken turns are produced by the guarded server turn path", () => {
    const voice = readFileSync(join(ROOT, "src/routes/api/eleven-agent-chat.ts"), "utf8");
    expect(voice).toContain("askAthena");
    expect(readFileSync(join(ROOT, "src/lib/athena.functions.ts"), "utf8")).toContain(
      "guardMemberOutput(",
    );
  });
});
