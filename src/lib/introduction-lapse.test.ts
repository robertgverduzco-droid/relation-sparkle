import { describe, expect, it } from "vitest";
import {
  BETA_LAPSE_ACTIVE,
  BETA_LAPSE_DAYS,
  REAL_MEMBER_LAPSE_DAYS,
  LAPSE_COPY_QUIET,
  LAPSE_COPY_WAITING,
  crowdedLapseDays,
  decideIntroductionLapse,
  lapseWindowDays,
  reminderDays,
} from "./introduction-lapse";

const NOW = new Date("2026-09-10T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 864e5).toISOString();

describe("lapse window configuration", () => {
  it("runs the compressed beta window today and 14 days for real members", () => {
    expect(BETA_LAPSE_DAYS).toBe(3);
    expect(REAL_MEMBER_LAPSE_DAYS).toBe(14);
    expect(lapseWindowDays()).toBe(BETA_LAPSE_ACTIVE ? 3 : 14);
  });

  it("accepts an explicit override, ignoring nonsense", () => {
    expect(lapseWindowDays("7")).toBe(7);
    expect(lapseWindowDays(21)).toBe(21);
    expect(lapseWindowDays("soon")).toBe(lapseWindowDays());
    expect(lapseWindowDays(0)).toBe(lapseWindowDays());
    expect(lapseWindowDays(null)).toBe(lapseWindowDays());
  });

  it("keeps the reminder and stuck-slot proportions of the 14-day design", () => {
    expect(reminderDays(14)).toBe(7);
    expect(crowdedLapseDays(14)).toBe(10);
    expect(reminderDays(3)).toBeCloseTo(1.5, 5);
    expect(crowdedLapseDays(3)).toBeCloseTo(2.142857, 4);
  });
});

describe("decideIntroductionLapse", () => {
  const base = { windowDays: 3, now: NOW, bothAnswered: false };

  it("leaves a fresh introduction alone", () => {
    expect(decideIntroductionLapse({ ...base, presentedAt: daysAgo(0.5) })).toBe("none");
  });

  it("reminds the quiet person once, halfway through", () => {
    expect(decideIntroductionLapse({ ...base, presentedAt: daysAgo(2) })).toBe("remind");
    expect(
      decideIntroductionLapse({
        ...base,
        presentedAt: daysAgo(2),
        remindedAt: daysAgo(0.5),
      }),
    ).toBe("none");
  });

  it("lapses at the end of the window", () => {
    expect(decideIntroductionLapse({ ...base, presentedAt: daysAgo(3.1) })).toBe("lapse");
  });

  it("never lapses an introduction both people answered", () => {
    expect(
      decideIntroductionLapse({ ...base, presentedAt: daysAgo(30), bothAnswered: true }),
    ).toBe("none");
  });

  it("lapses earlier when every place the waiting member has is held by silence", () => {
    const presentedAt = daysAgo(2.5);
    expect(decideIntroductionLapse({ ...base, presentedAt })).toBe("remind");
    expect(
      decideIntroductionLapse({ ...base, presentedAt, waitingMemberAtCap: true }),
    ).toBe("lapse");
  });

  it("does nothing without a presentation date", () => {
    expect(decideIntroductionLapse({ ...base, presentedAt: null })).toBe("none");
  });
});

describe("Athena's words", () => {
  it("keeps the line that carries the message and blames no one", () => {
    expect(LAPSE_COPY_WAITING).toContain(
      "says nothing about you, and honestly not much about them either",
    );
    for (const copy of [LAPSE_COPY_WAITING, LAPSE_COPY_QUIET]) {
      expect(copy.toLowerCase()).not.toMatch(/expired|timed out|timeout|system|inactive/);
    }
  });
});
