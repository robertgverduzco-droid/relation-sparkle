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
