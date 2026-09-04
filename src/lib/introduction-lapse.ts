// Introduction lapse — pure policy.
//
// Doctrine: an introduction is an offer, not an obligation. When one person
// answers and the other never does, the person who answered should not lose
// one of their three places indefinitely, and should never be left guessing.
// A lapse is a scheduling fact, not a judgement: it frees the place on both
// sides, tells both people plainly, and feeds nothing into the evidence
// ladder, readiness, or any future decision about either member.
//
// Nothing here reads or writes anything; the server module applies it.

/** The real-member window. Restore as the default at general availability. */
export const REAL_MEMBER_LAPSE_DAYS = 14;

/**
 * The beta window. A two-week beta never sees a fortnight elapse, so the same
 * behaviour runs on a compressed clock while `BETA_LAPSE_ACTIVE` is true.
 */
export const BETA_LAPSE_DAYS = 3;

/** Flip to false at general availability; the window returns to 14 days. */
export const BETA_LAPSE_ACTIVE = true;

/** Reminder to the quiet person: halfway through the window (7 of 14). */
export const REMINDER_FRACTION = 7 / 14;

/**
 * When all three of the waiting member's places are held by introductions
 * nobody has answered, the oldest lapses earlier (10 of 14) so they are never
 * fully stuck.
 */
export const CROWDED_FRACTION = 10 / 14;

/**
 * Resolve the active window. An explicit override (env
 * `INTRODUCTION_LAPSE_DAYS`) wins; otherwise beta or real-member default.
 */
export function lapseWindowDays(override?: string | number | null): number {
  const n = typeof override === "string" ? Number(override) : override;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  return BETA_LAPSE_ACTIVE ? BETA_LAPSE_DAYS : REAL_MEMBER_LAPSE_DAYS;
}

export function reminderDays(windowDays: number): number {
  return windowDays * REMINDER_FRACTION;
}

export function crowdedLapseDays(windowDays: number): number {
  return windowDays * CROWDED_FRACTION;
}

export type LapseDecision = "none" | "remind" | "lapse";

export type LapseInput = {
  /** When the introduction was put in front of the people involved. */
  presentedAt: string | Date | null;
  /** True when both people have answered — then nothing lapses. */
  bothAnswered: boolean;
  /** True when the waiting member's every place is held by silence. */
  waitingMemberAtCap?: boolean;
  /** When the quiet person was last reminded, if ever. */
  remindedAt?: string | Date | null;
  now?: Date;
  windowDays?: number;
};

function ageInDays(from: string | Date, now: Date): number {
  const t = typeof from === "string" ? Date.parse(from) : from.getTime();
  if (!Number.isFinite(t)) return 0;
  return (now.getTime() - t) / 864e5;
}

/** Pure: what should happen to this introduction right now. */
export function decideIntroductionLapse(input: LapseInput): LapseDecision {
  if (!input.presentedAt) return "none";
  // A conversation between two people who both answered is no longer an
  // introduction waiting on anyone.
  if (input.bothAnswered) return "none";

  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? lapseWindowDays();
  const age = ageInDays(input.presentedAt, now);

  const deadline = input.waitingMemberAtCap ? crowdedLapseDays(windowDays) : windowDays;
  if (age >= deadline) return "lapse";
  if (!input.remindedAt && age >= reminderDays(windowDays)) return "remind";
  return "none";
}

// --- Athena's words ---------------------------------------------------------
// Said once, in her own voice. No fault, no mechanism, no characterisation of
// the other person.

/** To the person who answered and was left waiting. */
export const LAPSE_COPY_WAITING =
  "I'm setting this introduction aside — it's been open a while with no answer. " +
  "That says nothing about you, and honestly not much about them either. " +
  "Your place is free whenever I have someone worth introducing.";

/** To the person who never answered. Once, and without reproach. */
export const LAPSE_COPY_QUIET =
  "I've closed the introduction I offered you a little while ago. No harm done — " +
  "timing is timing. Tell me when you'd like me to look again.";

/** The single reminder, before anything lapses. */
export const LAPSE_REMINDER_COPY =
  "There's still an introduction waiting on you. No rush and no wrong answer — " +
  "but if you'd rather not, saying so frees it up for both of you.";

/** Locked-screen safe: never names anyone, never carries reasoning. */
export const LAPSE_NOTIFICATIONS = {
  lapsed_waiting: {
    title: "Athena set an introduction aside",
    body: "One of your introductions went unanswered, so your place is free again.",
  },
  lapsed_quiet: {
    title: "An introduction has closed",
    body: "The introduction Athena offered you is no longer open. Nothing else has changed.",
  },
  reminder: {
    title: "An introduction is still waiting on you",
    body: "Whenever you have a quiet moment, there's an answer to give.",
  },
} as const;
