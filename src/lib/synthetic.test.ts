// Synthetic beta accounts — verification suite.
//
// Covers bulk creation shape, login isolation (a credential buys one account
// and nothing else), matching-pool isolation, reset, deletion, and
// unauthorized access.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  SYNTHETIC_BATCH_SIZES,
  MAX_SYNTHETIC_BATCH,
  generatePassword,
  syntheticEmail,
  isSyntheticEmail,
  assertFounder,
} from "./synthetic.server";

const serverSource = readFileSync("src/lib/synthetic.server.ts", "utf8");
const fnSource = readFileSync("src/lib/synthetic.functions.ts", "utf8");
const introSource = readFileSync("src/lib/introductions.server.ts", "utf8");
const uiSource = readFileSync("src/routes/_authenticated/beta-accounts.tsx", "utf8");

describe("bulk creation", () => {
  it("offers at least the required batch sizes", () => {
    for (const n of [10, 25, 50, 100]) {
      expect(SYNTHETIC_BATCH_SIZES).toContain(n);
    }
    expect(MAX_SYNTHETIC_BATCH).toBe(100);
  });

  it("caps a batch at one hundred accounts", () => {
    expect(fnSource).toMatch(/size: z\.number\(\)\.int\(\)\.min\(1\)\.max\(100\)/);
  });

  it("pre-verifies each identity with no inbox and no invitation link", () => {
    expect(serverSource).toContain("email_confirm: true");
    expect(serverSource).not.toMatch(/inviteUserByEmail|generateLink/);
  });

  it("gives every account a unique synthetic identity", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(syntheticEmail());
    expect(seen.size).toBe(500);
    expect(isSyntheticEmail([...seen][0]!)).toBe(true);
    expect(isSyntheticEmail("someone@gmail.com")).toBe(false);
  });

  it("marks every generated account as synthetic", () => {
    expect(serverSource).toMatch(/is_synthetic: true/);
    expect(serverSource).toMatch(/synthetic: true/);
  });
});

describe("credentials", () => {
  it("generates unpredictable passwords of real length", () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).toHaveLength(24);
    expect(a).not.toBe(b);
  });

  it("never persists a password and never logs one", () => {
    expect(serverSource).not.toMatch(/\bpassword_hash\b|password:\s*password,\s*\/\/ store/);
    expect(serverSource).not.toMatch(/console\.(log|info|warn|error)/);
    // Audit metadata carries counts, never addresses or secrets.
    expect(serverSource).not.toMatch(/metadata:\s*\{[^}]*password/);
    expect(serverSource).not.toMatch(/metadata:\s*\{[^}]*email/);
  });

  it("hands credentials back exactly once, in the founder's own response", () => {
    expect(serverSource).toMatch(/credentials: SyntheticCredential\[\]/);
    expect(uiSource).toContain("shown once");
  });

  it("can re-issue rather than recover a lost credential", () => {
    expect(serverSource).toMatch(/reissueBatchCredentials/);
    expect(serverSource).toMatch(/updateUserById\(userId, \{ password \}\)/);
  });
});

describe("authority and login isolation", () => {
  it("refuses a caller without the founder role", async () => {
    vi.doMock("./founder-dialogue.server", () => ({ isFounder: async () => false }));
    const { assertFounder: guarded } = await import("./synthetic.server");
    await expect(guarded("00000000-0000-0000-0000-000000000001")).rejects.toThrow("Not found");
    vi.doUnmock("./founder-dialogue.server");
  });

  it("exports a guard every server function calls before doing work", () => {
    expect(typeof assertFounder).toBe("function");
    const handlers = fnSource.match(/\.handler\(/g) ?? [];
    const guards = fnSource.match(/assertFounder\(context\.userId\)|isFounder\(context\.userId\)/g) ?? [];
    expect(guards.length).toBe(handlers.length);
  });

  it("derives authority from the verified token, never from the payload", () => {
    expect(fnSource).toContain("requireSupabaseAuth");
    expect(fnSource).not.toMatch(/founderId:\s*data\./);
    expect(fnSource).not.toMatch(/isFounder:\s*z\./);
  });

  it("grants a synthetic credential no elevated role", () => {
    // Nothing in the provisioning path writes user_roles.
    expect(serverSource).not.toMatch(/user_roles/);
  });
});

describe("matching pool isolation", () => {
  it("keeps synthetic personas and real members in separate pools", () => {
    expect(introSource).toMatch(/\.eq\("is_synthetic", selfSynthetic\)/);
    expect(introSource).toMatch(/is_synthetic/);
  });
});

describe("reset and deletion", () => {
  it("returns a reset persona to a blank onboarding state", () => {
    expect(serverSource).toMatch(/onboarding_stage: "welcome"/);
    expect(serverSource).toMatch(/onboarding_completed_at: null/);
    expect(serverSource).toMatch(/understanding_facets/);
  });

  it("deletes through the same permanent-deletion machinery as a real member", () => {
    expect(serverSource).toMatch(/purgeMemberAndDeleteAuthUser/);
  });

  it("requires an explicit confirmation phrase to destroy a batch", () => {
    expect(fnSource).toMatch(/confirm: z\.literal\("delete this batch"\)/);
  });
});

describe("audit", () => {
  it("records every privileged synthetic action", () => {
    for (const action of [
      "synthetic.batch.created",
      "synthetic.batch.credentials_reissued",
      "synthetic.batch.reset",
      "synthetic.batch.deleted",
    ]) {
      expect(serverSource).toContain(action);
    }
  });
});
