// Server-only onboarding state machine (A-08).
import { z } from "zod";

export const ONBOARDING_STAGES = ["welcome", "identity", "preferences", "complete"] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export const onboardingStepInput = z.object({
  step: z.enum(["welcome", "identity", "preferences"]),
  identity: z
    .object({
      display_name: z.string().max(80).optional(),
      birth_date: z.string().max(20).optional(),
      gender: z.string().max(40).optional(),
      pronouns: z.string().max(40).optional(),
      city: z.string().max(120).optional(),
    })
    .optional(),
  preferences: z
    .object({
      seeking_genders: z.array(z.string().max(40)).max(10).optional(),
      age_min: z.number().int().min(18).max(120).nullable().optional(),
      age_max: z.number().int().min(18).max(120).nullable().optional(),
      relationship_intent: z.string().max(120).optional(),
    })
    .optional(),
});

/**
 * One step forward only, and never backwards. A legacy or unknown stage
 * collapses to the nearest current stage rather than granting a jump.
 */
export function nextStage(current: OnboardingStage | string, completed: string): OnboardingStage {
  const order: OnboardingStage[] = ["welcome", "identity", "preferences", "complete"];
  const idx = order.indexOf(completed as OnboardingStage);
  const candidate = order[Math.min(idx + 1, order.length - 1)] ?? "welcome";
  const currentIdx = order.indexOf(current as OnboardingStage);
  const candidateIdx = order.indexOf(candidate);
  return candidateIdx >= currentIdx ? candidate : (order[currentIdx] as OnboardingStage);
}

// ---------------------------------------------------------------------------
// Authoritative 18+ enforcement.
//
// Age is a legal precondition of membership, not a profile nicety. It is
// validated here, server-side, on the same path that advances onboarding —
// the client form is convenience only.
// ---------------------------------------------------------------------------

export const MINIMUM_AGE = 18;

export const AGE_COPY = {
  missing: "I'll need your date of birth before we go any further.",
  invalid: "That date of birth doesn't look right. Could you check it?",
  future: "That date of birth is in the future. Could you check it?",
  underage:
    "Athena is for adults over eighteen. I'm sorry — I can't continue with this account.",
};

export type AdultCheck =
  | { ok: true; age: number }
  | { ok: false; code: "missing" | "invalid" | "future" | "underage"; message: string };

/** Completed years between `birthDate` and `now`, or null when unusable. */
export function ageInYears(birthDate: string | null | undefined, now = new Date()): number | null {
  const raw = (birthDate ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** The single authoritative adulthood decision. */
export function assertAdult(birthDate: string | null | undefined, now = new Date()): AdultCheck {
  const raw = (birthDate ?? "").trim();
  if (!raw) return { ok: false, code: "missing", message: AGE_COPY.missing };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { ok: false, code: "invalid", message: AGE_COPY.invalid };
  if (d.getTime() > now.getTime()) return { ok: false, code: "future", message: AGE_COPY.future };
  const age = ageInYears(raw, now);
  if (age == null) return { ok: false, code: "invalid", message: AGE_COPY.invalid };
  if (age > 120) return { ok: false, code: "invalid", message: AGE_COPY.invalid };
  if (age < MINIMUM_AGE) return { ok: false, code: "underage", message: AGE_COPY.underage };
  return { ok: true, age };
}

export const CONSENT_REQUIRED_COPY =
  "There are a couple of agreements to read and accept before we begin.";

/**
 * Which required consents are still outstanding, given the rows a member holds.
 * Pure so the same rule is testable and identical on every path.
 */
export function outstandingRequiredConsents(
  held: Array<{ consent_key: string; version: string; granted: boolean; created_at: string }>,
  required: Array<{ key: string; version: string }>,
): string[] {
  const latest = new Map<string, { granted: boolean; version: string; at: number }>();
  for (const row of held) {
    const at = new Date(row.created_at).getTime();
    const prev = latest.get(row.consent_key);
    if (!prev || at >= prev.at) {
      latest.set(row.consent_key, { granted: row.granted, version: row.version, at });
    }
  }
  return required
    .filter((def) => {
      const h = latest.get(def.key);
      return !(h && h.granted && h.version === def.version);
    })
    .map((def) => def.key);
}

