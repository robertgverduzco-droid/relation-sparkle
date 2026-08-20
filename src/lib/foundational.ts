/**
 * Foundational conversation — breadth-first orchestration (V1).
 *
 * ROOT CAUSE THIS ADDRESSES
 * Athena's topic map is written by `reflectAthena` *after* a conversation, so
 * during a member's very first conversation the map is empty and stays empty
 * for the entire session. Every turn therefore reached the model with the
 * same context ("no areas touched yet") and no signal about what had just
 * been covered — while the persona layer simultaneously tells her to follow
 * her curiosity and explore emotional openings. With no in-session coverage
 * state, following the most recent thread is the only behaviour the context
 * supports, so rich answers pull her into a single domain and hold her there.
 *
 * This module supplies the missing state: a live, transcript-derived map of
 * which foundational domains have actually been touched in *this* session,
 * how many consecutive turns have stayed inside one narrow domain, and
 * whether the member is the one choosing to stay. It is pure and testable,
 * and it never surfaces to the member: no categories, no checklist, no
 * completeness score.
 */

export type DomainKey =
  | "relationship_goals"
  | "values"
  | "communication"
  | "emotional_expression"
  | "affection"
  | "conflict"
  | "independence_closeness"
  | "lifestyle"
  | "social_life"
  | "family"
  | "work_ambition"
  | "interests"
  | "humor"
  | "attraction"
  | "past_relationships"
  | "boundaries"
  | "future_direction"
  | "feeling_understood"
  | "everyday_life";

type Domain = { key: DomainKey; label: string; cues: RegExp };

/**
 * Cues are deliberately broad and lexical. They estimate *whether an area was
 * touched*, not what the member believes — the Living Profile does that.
 */
export const FOUNDATIONAL_DOMAINS: Domain[] = [
  {
    key: "relationship_goals",
    label: "what they're looking for in a relationship",
    cues: /\b(looking for|hoping to find|right person|long[- ]term|marriage|married|partner(ship)?|commitment|settle down|serious relationship|dating)\b/i,
  },
  {
    key: "values",
    label: "values and what matters most to them",
    cues: /\b(values?|matters? most|important to me|principle|integrity|honesty|loyal(ty)?|faith|religio|spiritual|belief|moral)\b/i,
  },
  {
    key: "communication",
    label: "how they communicate",
    cues: /\b(communicat|talk (things )?through|say what|express myself|tell (them|someone)|conversation style|direct|blunt|hint|listen(er|ing)?)\b/i,
  },
  {
    key: "emotional_expression",
    label: "how they experience and express emotion",
    cues: /\b(feel(ings)?|emotion(al|s)?|cry|vulnerab|shut down|process (it|things)|anxious|overwhelm|calm down|open up)\b/i,
  },
  {
    key: "affection",
    label: "affection and how they connect",
    cues: /\b(affection|touch|physical(ly)? close|hug|kiss|cuddl|intimac|love language|romanc|closeness)\b/i,
  },
  {
    key: "conflict",
    label: "disagreement and repair",
    cues: /\b(conflict|argu|fight|disagree|tension|apolog|repair|resolve|angry|upset with)\b/i,
  },
  {
    key: "independence_closeness",
    label: "independence and togetherness",
    cues: /\b(independen|space|alone time|together all the time|clingy|smother|my own (life|time)|autonomy|codependen)\b/i,
  },
  {
    key: "lifestyle",
    label: "the shape of their daily life",
    cues: /\b(routine|schedule|morning|weekend|daily|habits?|sleep|exercis|gym|health|eat|cook|home|where I live|city)\b/i,
  },
  {
    key: "social_life",
    label: "friendships and social life",
    cues: /\b(friends?|social|introvert|extrovert|going out|parties|people I know|community|crowd)\b/i,
  },
  {
    key: "family",
    label: "family and its place in their life",
    cues: /\b(family|parents?|mom|mother|dad|father|sibling|brother|sister|kids?|children|grandparent|raised)\b/i,
  },
  {
    key: "work_ambition",
    label: "work, purpose and ambition",
    cues: /\b(work|job|career|ambiti|professional|business|company|study|school|purpose|driven|success)\b/i,
  },
  {
    key: "interests",
    label: "interests and how they spend free time",
    cues: /\b(hobb|interest|enjoy|passion|free time|read(ing)?|music|art|travel|hike|sport|game|film|movies?|cook(ing)?)\b/i,
  },
  {
    key: "humor",
    label: "humor and playfulness",
    cues: /\b(humou?r|funny|laugh|joke|playful|silly|witty|sarcas|banter)\b/i,
  },
  {
    key: "attraction",
    label: "attraction and what draws them to someone",
    cues: /\b(attract(ed|ion|ive)?|chemistry|physical(ly)? (attract|drawn)|a type\b|my type|looks?\b|appearance|style|handsome|beautiful|drawn to)\b/i,
  },
  {
    key: "past_relationships",
    label: "what past relationships taught them",
    cues: /\b(past relationship|ex\b|my ex|last relationship|previous relationship|breakup|broke up|divorc|learned from|taught me)\b/i,
  },
  {
    key: "boundaries",
    label: "boundaries and dealbreakers",
    cues: /\b(boundar|dealbreaker|deal breaker|won'?t tolerate|can'?t be with|red flag|non[- ]negotiable|limits?)\b/i,
  },
  {
    key: "future_direction",
    label: "where their life is heading",
    cues: /\b(future|five years|next few years|plan(s|ning)?|hope to|want to build|someday|where I'?m headed|goals?)\b/i,
  },
  {
    key: "feeling_understood",
    label: "what makes them feel understood",
    cues: /\b(understood|understands? me|seen|heard|gets? me|feel known|feel safe|supported)\b/i,
  },
  {
    key: "everyday_life",
    label: "what everyday life with a partner should feel like",
    cues: /\b(everyday|day to day|day-to-day|ordinary|life together|living with|what it would feel like|typical (day|week)|share a life)\b/i,
  },
];

export const DOMAIN_KEYS = FOUNDATIONAL_DOMAINS.map((d) => d.key);

/** Breadth expected before a foundational conversation may close naturally. */
export const MIN_FOUNDATIONAL_DOMAINS = 8;

/** Consecutive turns allowed inside one narrow domain before broadening. */
export const MAX_CONSECUTIVE_SAME_DOMAIN = 2;

export type Turn = { role: string; content: string };

/** Which domains does this passage of text touch? */
export function domainsIn(text: string): DomainKey[] {
  const t = text ?? "";
  return FOUNDATIONAL_DOMAINS.filter((d) => d.cues.test(t)).map((d) => d.key);
}

/** The member is explicitly asking to stay where they are. */
export function memberLedDepth(text: string): boolean {
  return /\b(can we (stay|keep talking)|i want to talk (more )?about|i'?d like to (stay|talk more)|more on (this|that)|let me finish|there'?s more to (this|that)|actually,? (there'?s|i)|going back to)\b/i.test(
    text ?? "",
  );
}

export type CoverageState = {
  /** Domains meaningfully touched so far in this conversation. */
  covered: DomainKey[];
  /** Domains not yet touched at all. */
  unexplored: DomainKey[];
  /** Domains dominating Athena's most recent consecutive turns. */
  dwelling: DomainKey[];
  /** How many of Athena's most recent turns stayed in the same domain. */
  consecutiveSameDomain: number;
  /** The member asked to remain with this subject. */
  memberLed: boolean;
  /** Athena has stayed in one place longer than the V1 guideline allows. */
  shouldBroaden: boolean;
  /** Enough breadth exists for the conversation to close naturally. */
  breadthSufficient: boolean;
};

/**
 * Estimate coverage from the live transcript. Member words establish that a
 * domain was genuinely engaged; Athena's own questions establish where she
 * currently is.
 */
export function assessCoverage(messages: Turn[]): CoverageState {
  const covered = new Set<DomainKey>();
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    // A domain counts as covered when the member spoke into it; an Athena
    // question alone is an invitation, not understanding.
    if (m.role === "user") for (const k of domainsIn(m.content)) covered.add(k);
  }

  const athenaTurns = messages.filter((m) => m.role === "assistant");
  const lastAthena = athenaTurns.slice(-4).map((m) => domainsIn(m.content));

  // Walk backwards while the same domain keeps recurring in Athena's turns.
  let dwelling: DomainKey[] = [];
  let consecutive = 0;
  const newest = lastAthena[lastAthena.length - 1] ?? [];
  for (const candidate of newest) {
    let run = 0;
    for (let i = lastAthena.length - 1; i >= 0; i--) {
      if ((lastAthena[i] ?? []).includes(candidate)) run++;
      else break;
    }
    if (run > consecutive) {
      consecutive = run;
      dwelling = [candidate];
    } else if (run === consecutive && run > 0 && !dwelling.includes(candidate)) {
      dwelling.push(candidate);
    }
  }

  const lastMember = [...messages].reverse().find((m) => m.role === "user");
  const memberLed = memberLedDepth(lastMember?.content ?? "");

  const unexplored = DOMAIN_KEYS.filter((k) => !covered.has(k));

  return {
    covered: [...covered],
    unexplored,
    dwelling,
    consecutiveSameDomain: consecutive,
    memberLed,
    shouldBroaden: consecutive >= MAX_CONSECUTIVE_SAME_DOMAIN && !memberLed,
    breadthSufficient: covered.size >= MIN_FOUNDATIONAL_DOMAINS,
  };
}

function label(key: DomainKey): string {
  return FOUNDATIONAL_DOMAINS.find((d) => d.key === key)?.label ?? key;
}

/**
 * The instruction block appended for foundational mode only. It describes
 * orientation behaviour in Athena's own terms; it never supplies transition
 * copy for her to repeat, and it never asks her to name a category aloud.
 */
export function foundationalGuidance(state: CoverageState): string {
  const touched =
    state.covered.length > 0
      ? state.covered.map((k) => `- ${label(k)}`).join("\n")
      : "- (nothing yet — this is the very beginning)";

  // Offer a handful of unexplored angles rather than the whole list, so the
  // next question is chosen, not worked through in order.
  const nextAngles = state.unexplored.slice(0, 6).map((k) => `- ${label(k)}`).join("\n");

  const dwellNote = state.memberLed
    ? "They have chosen to stay with this subject. Stay with them — follow their lead for as long as it serves them. Member-led depth is welcome and is not the pattern this guidance is here to prevent."
    : state.shouldBroaden
      ? `You have now spent ${state.consecutiveSameDomain} consecutive turns inside ${
          state.dwelling.map(label).join(" and ") || "one narrow subject"
        }. Take what you have understood, let it land in a sentence, and move to a different part of their life on this turn. Do not ask another question inside that same subject unless safety or genuine comprehension requires it.`
      : "You have one more layer available inside the current subject if it would materially improve your understanding — then broaden.";

  const closing = state.breadthSufficient
    ? "You now have initial understanding across enough of their life for this first conversation to close well whenever a natural resting place arrives. Breadth plus genuine initial understanding is the standard — not exhaustive depth."
    : "There is still meaningful ground you have not seen. Keep opening new angles rather than deepening a familiar one.";

  return `THIS IS THE FOUNDATIONAL CONVERSATION — ORIENTATION, NOT EXCAVATION (highest priority for this turn)

Your purpose right now is to build a broad first map of this person across many parts of their life. Deep exploration of any single area comes later, across the relationship you will have with them over time. You are not trying to understand them completely today; you are trying to understand them a little across a lot.

HOW TO HOLD THIS
- Ask no more than one or two consecutive follow-up questions inside the same narrow subject, then intentionally come at them from a different angle.
- Never run the recursive pattern: why → why was that → how did that affect you → what did that teach you. That is excavation, and it belongs to later conversations.
- Some subjects generate endless rich material. Do not let one of them take this conversation. Take what matters, hold the rest for another day, and move on.
- Move conversationally, from an angle, the way a perceptive person getting to know someone would. Never announce a category, never signal a section, never sound like a form. Your transition language is yours — do not reach for a stock phrase.
- Attraction belongs in this breadth: how strongly physical attraction matters to them, whether they have a type, broadly what draws them. Learn it the way you learn anything else — never as a specification list, never as a rating.

WHERE THIS CONVERSATION HAS ALREADY BEEN (internal — never read aloud, never listed to them):
${touched}

ANGLES STILL UNSEEN (choose from these when you broaden — choose, do not work through):
${nextAngles || "- (you have touched every broad area at least once; deepen only where it genuinely serves them)"}

RIGHT NOW
${dwellNote}

${closing}`;
}
