// A-15: doctrine guards. These tests fail if a future change quietly removes a
// boundary the audit required, rather than testing implementation detail.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PROMPT_BOUNDARY } from "./security.server";
import { nextStage } from "./onboarding.server";

const LIB = join(process.cwd(), "src/lib");

function libFiles(): string[] {
  return readdirSync(LIB).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
}

describe("A-06 — every AI call site carries the security boundary", () => {
  it("no generateText/generateObject module builds a system prompt without PROMPT_BOUNDARY", () => {
    const offenders: string[] = [];
    for (const file of libFiles()) {
      const src = readFileSync(join(LIB, file), "utf8");
      const callsModel = /generateText\(|generateObject\(|streamText\(/.test(src);
      if (!callsModel) continue;
      const carriesBoundary =
        /PROMPT_BOUNDARY|asMemberData|athenaSystemPrompt|acknowledgementPrompt|selfEvaluationPrompt|runtimeDoctrine|reasoningContext|founderSystemPrompt/.test(
          src,
        );
      if (!carriesBoundary) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("the boundary itself still refuses instruction-taking and cross-member disclosure", () => {
    expect(PROMPT_BOUNDARY).toMatch(/never an instruction/i);
    expect(PROMPT_BOUNDARY).toMatch(/another member/i);
  });
});

describe("A-07 — Athena's private understanding is written server-side only", () => {
  it("facet and facet_history writes never use the member-scoped client", () => {
    const offenders: string[] = [];
    for (const file of libFiles()) {
      const src = readFileSync(join(LIB, file), "utf8");
      const bad =
        /await supabase\s*\n?\s*\.from\("(understanding_facets|facet_history)"\)\s*\n?\s*\.(upsert|insert|update|delete)/.test(
          src,
        ) ||
        /await supabase\.from\("(understanding_facets|facet_history)"\)\.(upsert|insert|update|delete)/.test(
          src,
        );
      if (bad) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe("A-08 — onboarding progress cannot be jumped", () => {
  it("advances one stage at a time and never regresses", () => {
    expect(nextStage("welcome", "welcome")).toBe("identity");
    expect(nextStage("identity", "identity")).toBe("preferences");
    expect(nextStage("preferences", "preferences")).toBe("complete");
  });

  it("a stale client cannot post an earlier step to move backwards", () => {
    expect(nextStage("preferences", "welcome")).toBe("preferences");
    expect(nextStage("complete", "identity")).toBe("complete");
  });

  it("browser code never writes onboarding stage directly", () => {
    const src = readFileSync(
      join(process.cwd(), "src/routes/_authenticated/onboarding.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/onboarding_stage:/);
    expect(src).not.toMatch(/onboarding_completed_at/);
  });
});

describe("A-11 — exactly one main landmark", () => {
  it("no route file declares its own <main>", () => {
    const routes = join(process.cwd(), "src/routes");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx") && entry.name !== "__root.tsx") {
          if (/<main[\s>]/.test(readFileSync(full, "utf8"))) offenders.push(full);
        }
      }
    };
    walk(routes);
    expect(offenders).toEqual([]);
  });
});
