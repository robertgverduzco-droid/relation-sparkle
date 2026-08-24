/**
 * THE REVEAL (Rebuild Spec §5) — pure module.
 *
 * Once readiness is met, Athena delivers a summary of who she has come to
 * understand, including one or two things the member likely had not fully
 * articulated to themselves. The member reviews and confirms it, and only then
 * does the payment screen appear: value experienced before value is charged
 * for.
 *
 * WHAT IT IS NOT
 * Not a report card. Not a personality type. Not a score, a label, a rank, or
 * a percentage. Not flattery. Insight only survives here if it is earned from
 * evidence and stated at its true strength (evidentiary-discipline.ts).
 */

export type RevealInsight = {
  /** One short line the member can immediately recognise or argue with. */
  observation: string;
  /** Why Athena thinks it — from their own words, never a framework. */
  because: string;
};

export type Reveal = {
  summary: string;
  insights: RevealInsight[];
  generatedAt: string;
  confirmedAt: string | null;
};

export const REVEAL_COPY = {
  eyebrow: "What I've come to understand",
  title: "Here's who I think you are.",
  intro:
    "This is mine, not a questionnaire result — it's what fifteen minutes of real conversation actually produced. Read it properly. If something is wrong, say so; being corrected makes me better at finding the right person for you.",
  insightsHeading: "Two things you may not have said out loud",
  confirm: "That's me — continue",
  amend: "Something's off",
  amendPrompt: "What did I get wrong?",
  confirmedTitle: "Thank you.",
  confirmedBody: "I'll hold this, and keep revising it as I learn more about you.",
};

/**
 * The generation contract. Written as intent, because the words must be
 * Athena's — but the shape and the prohibitions are not negotiable.
 */
export const REVEAL_DIRECTIVE = [
  "THE REVEAL. Write what you have come to understand about this person, for them to read.",
  "This is the single most important thing you will say to them. It has to be recognisably them and it has to be earned — every line traceable to something they actually said or did in conversation.",
  "SUMMARY: four to six sentences, second person, your own voice. How they move through the world, what they seem to be building, how they are with people. Specific, not flattering. If something is genuinely mixed, say the mixed thing.",
  "INSIGHTS: exactly one or two. Each is something they probably have not put into words about themselves — a pattern across things they said separately, a tension they may not have noticed they hold. For each, say plainly what you think and what in their own words made you think it.",
  "NEVER: a type, a label, a category, a score, a percentage, a rank, a diagnosis, a framework name, or a scholar's name. No astrology-shaped generalities that would fit anyone. No flattery, no 'you're the kind of person who' padding, no manufactured contrast ('most people X, but you Y').",
  "Mark strength honestly. If you have one observation rather than a pattern, say so — 'I've only seen this once' is stronger than pretending.",
  "Do not thank them for completing anything, do not mention payment, membership, matching, or what happens next.",
].join(" ");

/** Is the member allowed to see the reveal yet? */
export function revealAvailable(input: { readinessMet: boolean; hasReveal: boolean }): boolean {
  return input.readinessMet || input.hasReveal;
}

/** Guard: the payment step is only reachable once the reveal is confirmed. */
export function paymentUnlocked(reveal: Pick<Reveal, "confirmedAt"> | null): boolean {
  return Boolean(reveal?.confirmedAt);
}
