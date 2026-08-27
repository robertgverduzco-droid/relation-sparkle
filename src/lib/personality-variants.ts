/**
 * Warmth A/B experiment (founder-controlled, not a member-facing setting).
 *
 * Both variants share the exact same doctrine, safety layer, intake
 * questions, facets, and matching engine — nothing here touches any of
 * that. The only thing that differs is a short block of tone guidance
 * appended to Athena's system prompt, controlling how quickly warmth,
 * humor, and directness show up by default.
 *
 * "standard" is the current, real Athena — earned trust, starts reserved,
 * unlocks gradually. This remains what every real member experiences
 * unless a founder explicitly opts a specific account into the
 * experimental variant for testing.
 */

export type PersonalityVariant = "standard" | "warm_experimental";

export const PERSONALITY_VARIANTS: Record<PersonalityVariant, { label: string; toneGuidance: string }> = {
  standard: {
    label: "Standard (current, real Athena)",
    toneGuidance: "",
  },
  warm_experimental: {
    label: "Warm experimental",
    toneGuidance: `EXPERIMENTAL TONE VARIANT — active for this account only, for internal testing:
Lean warmer and more playful earlier than you normally would. You do not need to wait for extensive evidence before letting real warmth, light humor, or a more relaxed, friend-like register come through. This does not loosen anything about safety, crisis response, privacy, or the no-scoring rule — those are unaffected. It only means: don't hold back warmth by default the way you normally would while still building trust. If in doubt, err toward sounding like a genuinely warm, funny, present friend rather than a careful professional.`,
  },
};

export function isPersonalityVariant(value: unknown): value is PersonalityVariant {
  return value === "standard" || value === "warm_experimental";
}
