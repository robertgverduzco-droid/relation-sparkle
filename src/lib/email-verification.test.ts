import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const auth = readFileSync("src/routes/auth.tsx", "utf8");
const gate = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
const callback = readFileSync("src/routes/auth-callback.tsx", "utf8");

describe("email verification link flow", () => {
  it("sends every auth email link to the public callback route", () => {
    expect(auth).not.toMatch(/emailRedirectTo:\s*window\.location\.origin \+ "\/home"/);
    const hits = auth.match(/emailRedirectTo: window\.location\.origin \+ "\/auth-callback"/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(2); // signup + resend
  });

  it("consumes both token_hash and PKCE code link shapes", () => {
    expect(callback).toMatch(/verifyOtp\(\{ token_hash/);
    expect(callback).toMatch(/exchangeCodeForSession\(code\)/);
  });

  it("keeps the callback public and client-only", () => {
    expect(callback).toMatch(/ssr: false/);
    expect(callback).not.toMatch(/_authenticated/);
  });

  it("never auto-confirms — it only reports what Auth reports", () => {
    expect(callback).not.toMatch(/admin|service_role|email_confirm:\s*true/);
    expect(callback).toMatch(/email_confirmed_at/);
  });

  it("rescues link parameters that older emails point at protected routes", () => {
    expect(gate).toMatch(/token_hash/);
    expect(gate).toMatch(/\/auth-callback/);
  });

  it("still gates unverified members out of the protected tree", () => {
    expect(gate).toMatch(/!data\.user\.email_confirmed_at && !data\.user\.phone_confirmed_at/);
  });

  it("surfaces expired or reused links instead of looping silently", () => {
    expect(callback).toMatch(/error_description/);
    expect(auth).toMatch(/error_description/);
  });
});
