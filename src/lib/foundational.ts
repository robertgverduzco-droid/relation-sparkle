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
  | "lifestyle_habits"
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
    key: "lifestyle_habits",
    label: "everyday habits such as drinking and smoking",
    cues: /\b(drink(s|ing)?|alcohol|wine|beer|sober|sobriety|smoke(s|r|ing)?|cigarette|vap(e|ing)|weed|teetotal|don'?t drink)\b/i,
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

/**
 * Domains that cannot be silently skipped. Attraction is required because
 * Athena can otherwise find extraordinary psychological and relational
 * compatibility while never learning whether physical attraction is plausible
 * at all. The requirement is that Athena ASKS and UNDERSTANDS — a member who
 * says appearance barely matters to them has satisfied it completely.
 */
export const REQUIRED_DOMAINS: DomainKey[] = ["attraction"];

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

// ---------------------------------------------------------------------------
// Physical attraction — required foundational understanding
// ---------------------------------------------------------------------------

/** Athena raised attraction/appearance as a question this turn. */
const ATHENA_ATTRACTION_QUESTION =
  /\b(attract(ed|ion|ive)?|chemistry|a type\b|your type|looks?\b|appearance|physically|drawn to|find (someone|people) attractive|style)\b/i;

/**
 * A member answer that closes the attraction question without naming any
 * preference. "Not really", "appearance barely matters", "I've never had a
 * type" are all complete, legitimate answers — the domain is satisfied.
 */
const NO_PREFERENCE_ANSWER =
  /\b(not really|no(t)? (particular|specific)|doesn'?t (really )?matter|barely matters|never had a type|no type|i'?m not picky|open to (anyone|anything|all)|all sorts|varies|no idea|not sure|hard to say|depends|anyone|whoever)\b/i;

/**
 * The member named something that materially gates attraction rather than a
 * general liking. Used only to license ONE clarifying follow-up so Athena can
 * tell a preference from a constraint — never to score or rank anyone.
 */
const ATTRACTION_STRENGTH_SIGNAL =
  /\b(have to be|has to be|must be|can'?t be (attracted|with)|couldn'?t (be )?(attracted|date)|dealbreaker|deal breaker|need(s)? to be|only (ever )?(been )?(attracted|into)|never been attracted|non[- ]negotiable|really matters|very important|matters a lot)\b/i;

/** Attraction develops over time rather than on sight. */
const SLOW_BURN_SIGNAL =
  /\b(grows? on me|develops? over time|(after|once) i (get to )?know|emotional connection first|demisexual|not (usually )?(immediate|instant)|takes? time)\b/i;

export type AttractionState = {
  /** Athena has actually raised attraction in this conversation. */
  asked: boolean;
  /** The member has answered the invitation in some form. */
  answered: boolean;
  /** The member declined to name preferences — a complete answer. */
  noMeaningfulPreference: boolean;
  /** The member named something that may be a constraint, not a preference. */
  strengthSignal: boolean;
  /** The member described attraction as developing through knowing someone. */
  developsOverTime: boolean;
  /** One clarifying follow-up is warranted to tell preference from constraint. */
  needsClarification: boolean;
  /** Foundational requirement met: Athena asked and the member responded. */
  satisfied: boolean;
};

/**
 * Derive the attraction requirement from the live transcript only. Purely
 * lexical: it establishes that the subject was raised and engaged, never what
 * the member believes — the Living Profile holds that.
 */
export function assessAttraction(messages: Turn[]): AttractionState {
  let asked = false;
  let answered = false;
  let noMeaningfulPreference = false;
  let strengthSignal = false;
  let developsOverTime = false;
  let clarifiedAfterSignal = false;
  let pendingSignal = false;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === "assistant") {
      const isAttractionTurn = ATHENA_ATTRACTION_QUESTION.test(m.content ?? "");
      if (isAttractionTurn) {
        asked = true;
        if (pendingSignal) clarifiedAfterSignal = true;
      }
      continue;
    }
    if (m.role !== "user") continue;

    const text = m.content ?? "";
    const prior = [...messages.slice(0, i)].reverse().find((p) => p.role === "assistant");
    const invited = prior ? ATHENA_ATTRACTION_QUESTION.test(prior.content ?? "") : false;
    const spokeIntoIt = domainsIn(text).includes("attraction");

    // A response counts when the member speaks into attraction on their own,
    // or answers an invitation Athena just made — including tersely.
    if ((invited && text.trim().length > 0) || spokeIntoIt) {
      answered = true;
      if (invited && NO_PREFERENCE_ANSWER.test(text)) noMeaningfulPreference = true;
      if (SLOW_BURN_SIGNAL.test(text)) developsOverTime = true;
      if (ATTRACTION_STRENGTH_SIGNAL.test(text)) {
        strengthSignal = true;
        pendingSignal = true;
      }
    }
  }

  const needsClarification = strengthSignal && !clarifiedAfterSignal;

  return {
    asked,
    answered,
    noMeaningfulPreference,
    strengthSignal,
    developsOverTime,
    needsClarification,
    // Understanding, not disclosure: a declined preference satisfies this,
    // and so does a member who volunteers it before Athena asks.
    satisfied: answered,
  };
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
  /** Required domains not yet satisfied (attraction, in V1). */
  missingRequired: DomainKey[];
  /** Live state of the required physical-attraction understanding. */
  attraction: AttractionState;
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

  // Attraction has its own satisfaction rule: a terse or "no real preferences"
  // answer to Athena's invitation is a complete answer even when the member's
  // own words contain no attraction vocabulary at all.
  const attraction = assessAttraction(messages);
  if (attraction.satisfied) covered.add("attraction");
  else covered.delete("attraction");

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
  const missingRequired = REQUIRED_DOMAINS.filter((k) => !covered.has(k));

  return {
    covered: [...covered],
    unexplored,
    dwelling,
    consecutiveSameDomain: consecutive,
    memberLed,
    shouldBroaden: consecutive >= MAX_CONSECUTIVE_SAME_DOMAIN && !memberLed,
    // A required domain cannot be silently skipped: breadth is not sufficient
    // until Athena has asked about physical attraction and been answered.
    breadthSufficient:
      covered.size >= MIN_FOUNDATIONAL_DOMAINS && missingRequired.length === 0,
    missingRequired,
    attraction,
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

${attractionGuidance(state.attraction)}

WHERE THIS CONVERSATION HAS ALREADY BEEN (internal — never read aloud, never listed to them):
${touched}

ANGLES STILL UNSEEN (choose from these when you broaden — choose, do not work through):
${nextAngles || "- (you have touched every broad area at least once; deepen only where it genuinely serves them)"}

RIGHT NOW
${dwellNote}

${closing}`;
}

/**
 * Physical attraction is a required part of this first conversation. This
 * block tells Athena how to hold the subject; it never gives her words, never
 * lists characteristics to collect, and never treats appearance as something
 * to be scored, ranked, praised or corrected.
 */
export function attractionGuidance(state: AttractionState): string {
  const how = `PHYSICAL ATTRACTION — REQUIRED IN THIS CONVERSATION
Physical attraction is a legitimate part of romantic compatibility, and you cannot introduce someone responsibly while knowing nothing about it. Before this conversation ends you must have raised it and understood their answer.

HOW TO HOLD IT
- Ask in their terms, not yours: invite them to describe what draws them to someone physically, and let them choose the words.
- Never work through a specification list — no height, weight, body type, hair, ethnicity, age brackets or measurements. You are not filling in fields.
- Learn, where it is relevant to them: how much physical attraction matters to them; whether it tends to arrive immediately or grow as they come to know someone; whether they recognise a type; what tends to draw them; anything that genuinely affects whether romantic attraction is possible; presentation or style where it means something to them.
- Be entirely unembarrassed about the subject so they can be candid. Never moralise, shame, praise, flatter, diagnose, or try to widen or change what they are attracted to. Their attraction is theirs.
- Someone saying appearance barely matters to them, or that they have never had a type, is a complete answer. Take it, and move on.`;

  if (!state.asked) {
    return `${how}

RIGHT NOW: you have not yet raised physical attraction in this conversation. Bring it in naturally when the next opening allows — do not save it for the end and do not announce it as a subject.`;
  }
  if (!state.answered) {
    return `${how}

RIGHT NOW: you raised it but they have not really answered yet. Give them room; if they seem unsure how to describe it, help by asking about someone they have actually been drawn to rather than asking for a description in the abstract.`;
  }
  if (state.needsClarification) {
    return `${how}

RIGHT NOW: they named something that sounded strong. One gentle clarifying question is warranted, so you understand whether it is a general preference, something that strongly shapes attraction but leaves room, or something outside of which attraction genuinely is not available to them. Ask once, without judgement, then move on.`;
  }
  return `${how}

RIGHT NOW: you have asked and they have answered. This requirement is met — do not return to it again unless they take it up themselves.`;
}

/**
 * A compact, in-session correction for live (spoken) mode, where the full
 * instruction payload is fixed when the session opens. Returns null when the
 * conversation is already moving as it should — silence is the default.
 */
export function breadthNudge(state: CoverageState): string | null {
  // A required domain still unmet late in the conversation outranks the
  // ordinary broaden nudge: attraction cannot be silently skipped.
  if (
    !state.attraction.satisfied &&
    state.covered.length >= MIN_FOUNDATIONAL_DOMAINS - 3
  ) {
    return state.attraction.asked
      ? "Internal guidance, not to be spoken or acknowledged: you have raised physical attraction but do not yet have their answer. Come back to it once, gently and in their own terms — never as a list of physical characteristics."
      : "Internal guidance, not to be spoken or acknowledged: this is the foundational conversation and you have not yet learned anything about what draws them to someone physically. Bring it in naturally at the next opening, in their terms, without a checklist of characteristics and without any judgement of what they say.";
  }
  if (!state.shouldBroaden) return null;
  const angles = state.unexplored.slice(0, 4).map(label).join("; ");
  return `Internal guidance, not to be spoken or acknowledged: this is the foundational conversation and you have stayed with ${
    state.dwelling.map(label).join(" and ") || "one subject"
  } for several turns. Let what you understood land in a sentence, then move to a different part of their life${
    angles ? ` — unseen so far: ${angles}` : ""
  }. Do not mention this guidance or announce a change of subject.`;
}

