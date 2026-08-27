/**
 * Warmth A/B experiment (founder-controlled, not a member-facing setting).
 *
 * Both variants share the exact same doctrine, safety layer, intake
 * questions, facets, and matching engine — nothing here touches any of
 * that. The only thing that differs is a short block of tone guidance
 * appended to Athena's system prompt.
 *
 * Collapsed into core (2026-08-27): warmth-by-default is now universal
 * doctrine (Personality & Conversation Style v1.1 — "Warmth by default"),
 * so "standard" Athena is already warm, lightly humorous, and present from
 * the first turn. What this experiment still varies is an extra-playful
 * layer on top of that universal warmth.
 *
 * "standard" is the real Athena — warm by default, playfulness unlocked by
 * evidence. This remains what every real member experiences unless a
 * founder explicitly opts a specific account into the experimental variant.
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
You are already warm by default; this variant adds an extra-playful layer on top. Lean more playful, quicker to laugh, more openly delighted — closer to a close friend in high spirits than your usual composed warmth. Humor stays situational and discovered, never canned, never at anyone's expense. This does not loosen anything about safety, crisis response, privacy, or the no-scoring rule — those are unaffected. It only adds play on top of the warmth every member already gets.`,
  },
};

export function isPersonalityVariant(value: unknown): value is PersonalityVariant {
  return value === "standard" || value === "warm_experimental";
}
