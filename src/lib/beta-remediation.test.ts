import { describe, expect, it } from "vitest";
import {
  BETA_COOLDOWN_MS,
  MIN_COOLDOWN_MS,
  clampCooldown,
  cooldownMessage,
  parseRetryAfterMs,
} from "./auth-cooldown";
import { ARRIVAL_WELCOME } from "./arrival";

describe("beta authentication cooldown", () => {
  it("never exceeds two hours", () => {
    expect(clampCooldown(48 * 60 * 60 * 1000)).toBe(BETA_COOLDOWN_MS);
    expect(parseRetryAfterMs({ message: "please retry in 48 hours" })).toBe(BETA_COOLDOWN_MS);
  });

  it("keeps a short anti-hammering floor", () => {
    expect(clampCooldown(1000)).toBe(MIN_COOLDOWN_MS);
    expect(clampCooldown(0)).toBe(0);
  });

  it("reads the provider's own retry hints", () => {
    expect(parseRetryAfterMs({ message: "you can only request this after 40 seconds" })).toBe(MIN_COOLDOWN_MS);
    expect(parseRetryAfterMs({ message: "try after 5 minutes" })).toBe(5 * 60_000);
    expect(parseRetryAfterMs({ status: 429, message: "email rate limit exceeded" })).toBe(BETA_COOLDOWN_MS);
    expect(parseRetryAfterMs({ message: "invalid login credentials" })).toBe(0);
  });

  it("tells the member when they may try again", () => {
    const now = Date.now();
    const msg = cooldownMessage(now + 30 * 60_000, now);
    expect(msg).toMatch(/30 minutes/);
    expect(msg).not.toMatch(/48/);
  });
});

describe("arrival welcome", () => {
  it("keeps the canonical opening words unchanged", () => {
    expect(ARRIVAL_WELCOME).toBe(
      "Welcome to Athena. The next evolution of matchmaking. Let's begin with you.",
    );
  });
});
