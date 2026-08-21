import { describe, expect, it } from "vitest";
import { destinationFor, hasAuthLinkParams, isMissingVerifier, readCallbackLink } from "./auth-callback";

const ORIGIN = "https://relation-sparkle.lovable.app/auth-callback";

describe("verification link parsing — device and browser independent", () => {
  it("reads an implicit session from the fragment (the real success shape)", () => {
    const link = readCallbackLink(`${ORIGIN}#access_token=abc.def.ghi&refresh_token=r1&type=signup`);
    expect(link).toEqual({ kind: "session", accessToken: "abc.def.ghi", refreshToken: "r1" });
  });

  it("treats a token spent by a desktop mail scanner as already confirmed, not broken", () => {
    const link = readCallbackLink(
      `${ORIGIN}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=`,
    );
    expect(link.kind).toBe("consumed");
    expect(destinationFor("consumed")).toBe("/auth?mode=signin#confirmed=1");
  });

  it("reads token_hash from the query — the cross-device path", () => {
    const link = readCallbackLink(`${ORIGIN}?token_hash=c65c46&type=signup`);
    expect(link).toEqual({ kind: "token_hash", tokenHash: "c65c46", type: "signup" });
  });

  it("reads token_hash from the fragment too", () => {
    const link = readCallbackLink(`${ORIGIN}#token_hash=c65c46&type=recovery`);
    expect(link).toEqual({ kind: "token_hash", tokenHash: "c65c46", type: "recovery" });
  });

  it("accepts the legacy ?token= parameter", () => {
    expect(readCallbackLink(`${ORIGIN}?token=abc&type=signup`).kind).toBe("token_hash");
  });

  it("falls back to signup for an unknown otp type rather than failing", () => {
    const link = readCallbackLink(`${ORIGIN}?token_hash=abc&type=nonsense`);
    expect(link).toMatchObject({ kind: "token_hash", type: "signup" });
  });

  it("recognises the PKCE code shape", () => {
    expect(readCallbackLink(`${ORIGIN}?code=xyz`)).toEqual({ kind: "code", code: "xyz" });
  });

  it("keeps a genuine failure distinct from a spent link", () => {
    const link = readCallbackLink(`${ORIGIN}#error=server_error&error_description=Database+error`);
    expect(link.kind).toBe("error");
  });

  it("reports a link with nothing in it", () => {
    expect(readCallbackLink(ORIGIN).kind).toBe("none");
    expect(readCallbackLink("not a url").kind).toBe("none");
  });

  it("treats a missing PKCE verifier (link opened on another device) as confirmed", () => {
    expect(isMissingVerifier("invalid request: both auth code and code verifier should be non-empty")).toBe(true);
    expect(isMissingVerifier("Database error saving new user")).toBe(false);
    expect(destinationFor("confirmed_elsewhere")).toBe("/auth?mode=signin#confirmed=1");
  });

  it("sends a verified member straight in", () => {
    expect(destinationFor("verified")).toBe("/home");
  });

  it("carries a real error through to the sign-in screen honestly", () => {
    expect(destinationFor("error", "Database error")).toBe(
      "/auth#error_description=Database%20error",
    );
  });
});

describe("hasAuthLinkParams — links that land on the wrong route", () => {
  it("recognises a confirmation that fell back to the site root", () => {
    expect(hasAuthLinkParams("https://app.example/#access_token=a&refresh_token=b&type=signup")).toBe(true);
  });

  it("recognises an already-spent link error at the root", () => {
    expect(hasAuthLinkParams("https://app.example/?x=1#error=access_denied&error_code=otp_expired")).toBe(true);
  });

  it("recognises token_hash and PKCE code in the query", () => {
    expect(hasAuthLinkParams("https://app.example/home?token_hash=abc&type=signup")).toBe(true);
    expect(hasAuthLinkParams("https://app.example/home?code=abc")).toBe(true);
  });

  it("leaves ordinary pages alone, and never loops on the callback itself", () => {
    expect(hasAuthLinkParams("https://app.example/today")).toBe(false);
    expect(hasAuthLinkParams("https://app.example/auth-callback#access_token=a")).toBe(false);
    expect(hasAuthLinkParams("https://app.example/meet?intro=7")).toBe(false);
  });
});
