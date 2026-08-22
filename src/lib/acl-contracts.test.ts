// ACL CONTRACT REGRESSION SUITE
//
// The V1 stabilization revoked broad PostgREST write privileges from the
// `authenticated` role. Security tightening is only correct if every
// legitimate member action still has a trusted write path. This suite is the
// standing guard on both halves of that contract:
//
//   (a) no member-scoped (RLS) client writes to a table the live grants make
//       SELECT-only — such a write fails at runtime, silently breaking a real
//       member action;
//   (b) system-owned tables are never re-opened to the client to make code
//       work; the manifest itself is asserted to keep them closed.
//
//   bunx vitest run src/lib/acl-contracts.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUTHENTICATED_ACL, memberMayWrite } from "./acl-manifest";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !p.endsWith(".test.ts") && !p.endsWith(".test.tsx")) out.push(p);
  }
  return out;
}

type Write = {
  file: string;
  line: number;
  receiver: string;
  table: string;
  op: string;
  privileged: boolean;
};

const WRITE_RE = /(\w+)\s*\n?\s*\.from\("([a-z_]+)"\)\s*\n?\s*\.(insert|update|upsert|delete)\b/g;

function collectWrites(): Write[] {
  const found: Write[] = [];
  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(WRITE_RE)) {
      found.push({
        file: file.slice(SRC.length + 1),
        line: text.slice(0, m.index).split("\n").length,
        receiver: m[1]!,
        table: m[2]!,
        op: m[3]!,
        privileged: isPrivileged(m[1]!, text),
      });
    }
  }
  return found;
}

/** A privileged writer: the service-role client, or a local alias of it. */
const PRIVILEGED_NAME = /admin|writer|service/i;

/**
 * Server helpers commonly narrow the service-role client into a local name
 * (`const supabase = supabaseAdmin as SupabaseClient`). Resolve those aliases
 * per file so the scanner judges the actual privilege, not the variable name.
 */
function privilegedNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*(?:await\s+)?supabaseAdmin\b/g)) {
    names.add(m[1]!);
  }
  return names;
}

function isPrivileged(receiver: string, text: string): boolean {
  return PRIVILEGED_NAME.test(receiver) || privilegedNames(text).has(receiver);
}

const writes = collectWrites();

describe("ACL contract: the code cannot write what the grants forbid", () => {
  it("finds database writes to analyse (guards against a broken scanner)", () => {
    expect(writes.length).toBeGreaterThan(50);
  });

  it("never issues a member-scoped write against a table the member cannot write", () => {
    const violations = writes
      .filter((w) => !w.privileged)
      .filter((w) => {
        const op = w.op === "upsert" ? "insert" : w.op;
        return !memberMayWrite(w.table, op as "insert" | "update" | "delete");
      })
      .map((w) => `${w.file}:${w.line} ${w.receiver}.from("${w.table}").${w.op}`);

    expect(violations).toEqual([]);
  });

  it("keeps every system-owned relational/state table closed to client writes", () => {
    // Widening any of these to `authenticated` would let a member rewrite
    // participant identity, platform status, or Athena-derived understanding.
    const systemOwned = [
      "connections",
      "relationship_focus",
      "member_transitions",
      "member_readiness",
      "post_meeting_reflections",
      "reflection_submissions",
      "partner_perception",
      "introduction_responses",
      "introduction_feedback",
      "introduction_attraction",
      "notifications",
      "pair_reasoning",
      "pair_reasoning_history",
      "topic_map",
      "user_intelligence",
      "understanding_facets",
      "facet_history",
      "safety_flags",
      "membership_entitlements",
      "entitlement_events",
      "admin_audit_log",
      "user_roles",
    ];
    for (const t of systemOwned) {
      expect(
        [t, AUTHENTICATED_ACL[t]?.insert.length, AUTHENTICATED_ACL[t]?.update.length, AUTHENTICATED_ACL[t]?.delete],
      ).toEqual([t, 0, 0, false]);
    }
  });

  it("keeps member-writable columns narrow on the surfaces that stay open", () => {
    // A member owns their own words and their own preferences — never
    // membership, status, moderation verdicts or system timestamps.
    expect(AUTHENTICATED_ACL["conversations"]!.update).toEqual(["hidden_by"]);
    expect(AUTHENTICATED_ACL["messages"]!.update).toEqual(["read_at"]);
    expect(AUTHENTICATED_ACL["meeting_proposals"]!.update).toEqual([]);
    expect(AUTHENTICATED_ACL["interview_sessions"]!.update).toEqual(["messages"]);
    expect(AUTHENTICATED_ACL["user_photos"]!.update).toEqual(["alt_text", "is_primary", "position"]);
    // Identity and lifecycle stay system-owned even on the member's own row.
    for (const col of ["id", "onboarding_stage", "onboarding_completed_at", "is_paused", "is_synthetic", "learning_opt_out"]) {
      expect(AUTHENTICATED_ACL["profiles"]!.update).not.toContain(col);
    }
  });
});

describe("ACL contract: member-scoped writes stay inside their granted columns", () => {
  // Object-literal payloads are statically checkable for the member-scoped
  // writes that remain legitimate.
  const OBJ_WRITE =
    /(\w+)\s*\n?\s*\.from\("([a-z_]+)"\)\s*\n?\s*\.(insert|update|upsert)\(\s*\{([^}]*)\}/g;

  it("writes only granted columns with the member-scoped client", () => {
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(OBJ_WRITE)) {
        const [, receiver, table, op, body] = m as unknown as string[];
        if (isPrivileged(receiver!, text)) continue;
        const acl = AUTHENTICATED_ACL[table!];
        if (!acl) continue;
        const granted = op === "update" ? acl.update : acl.insert;
        const keys = [...body!.matchAll(/(^|\n)\s*([a-z_][a-z0-9_]*)\s*:/g)].map((k) => k[2]!);
        for (const k of keys) {
          if (!granted.includes(k)) {
            const line = text.slice(0, m.index).split("\n").length;
            violations.push(`${file.slice(SRC.length + 1)}:${line} ${table}.${op} column "${k}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
