import { describe, expect, it } from "vitest";
import { isEmailVerified, providerLabel, readAccountIdentity, signInMethod } from "./account-identity";

describe("account identity", () => {
  it("reads the exact email from the authenticated user object", () => {
    const id = readAccountIdentity({
      email: "member@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      identities: [{ provider: "email" }],
    });
    expect(id.email).toBe("member@example.com");
    expect(id.emailVerified).toBe(true);
    expect(id.signInMethod).toBe("Email");
  });

  it("shows a different account's own identity", () => {
    const id = readAccountIdentity({
      email: "other@example.com",
      identities: [{ provider: "google" }],
    });
    expect(id.email).toBe("other@example.com");
    expect(id.emailVerified).toBe(false);
    expect(id.signInMethod).toBe("Google");
  });

  it("reports unverified when auth never confirmed the address", () => {
    expect(isEmailVerified({ email_confirmed_at: null })).toBe(false);
    expect(isEmailVerified({ confirmed_at: "2026-02-02T00:00:00Z" })).toBe(true);
  });

  it("derives sign-in method from identities and app_metadata, not the email", () => {
    expect(signInMethod({ identities: [{ provider: "apple" }] })).toBe("Apple");
    expect(signInMethod({ app_metadata: { provider: "azure" } })).toBe("Microsoft");
    expect(
      signInMethod({ identities: [{ provider: "email" }], app_metadata: { providers: ["google"] } }),
    ).toBe("Email, Google");
    expect(signInMethod({})).toBe("Unknown");
  });

  it("never surfaces ids or tokens", () => {
    const id = readAccountIdentity({
      email: "a@b.com",
      created_at: "2026-03-03T00:00:00Z",
    } as never);
    expect(Object.keys(id).sort()).toEqual(["createdAt", "email", "emailVerified", "signInMethod"]);
  });

  it("labels unknown providers readably", () => {
    expect(providerLabel("linkedin_oidc")).toBe("Linkedin_oidc");
  });
});
