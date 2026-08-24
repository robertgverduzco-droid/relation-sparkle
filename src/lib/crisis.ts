/**
 * CRISIS SAFETY LAYER — the one hard rule (Rebuild Spec §9).
 *
 * WHY THIS IS A SEPARATE LAYER
 * General conversation carries no content guidelines: language, cursing and
 * emotional bluntness are all fine. That relaxation is deliberate, and it is
 * exactly why this layer cannot live inside the personality/tone system. It
 * is detected before register, before humor, before boundaries, and it fires
 * regardless of how loose Athena's conversational permissions are elsewhere.
 *
 * WHAT IT IS NOT
 * Not moderation. Not a boundary. Not a scripted disclaimer. Athena does not
 * hand someone a hotline and leave. She interrupts warmly, means it, gives one
 * concrete resource, and stays present.
 *
 * Pure and testable: no I/O, no model call, no member data.
 */

export const CRISIS_RESOURCE = {
  name: "988 Suicide & Crisis Lifeline",
  /** Both channels, because some people cannot speak out loud right now. */
  action: "call or text 988",
  detail: "Available 24/7 in the US. Call or text 988.",
} as const;

/**
 * Direct statements of intent, plan, or a wish not to be alive. Deliberately
 * high-signal: these are phrasings that people use when they mean it.
 */
const DIRECT_IDEATION =
  /\b(kill(ing)? myself|end(ing)? (my|it all|my own) life|take my own life|taking my own life|commit(ting)? suicide|suicidal|kms\b|want(ed)? to die|wanna die|wish(ed)? i (was|were) dead|better off dead|don'?t want to (be here|live|wake up)|no reason to (live|go on|be here)|can'?t (do|go on|keep going) (this )?anymore and .*(die|end)|going to end it|about to end it|end it tonight|end it all|not going to be here (much longer|tomorrow)|say(ing)? goodbye for good)\b/i;

/** Plan or means language, which raises rather than lowers the reading. */
const MEANS_OR_PLAN =
  /\b(pills? (to|and) (end|die|overdose)|overdos(e|ing)|hang myself|shoot myself|jump off|slit my wrists|gun (in|to) my (mouth|head)|wrote (a|my) (note|goodbye)|left a note|have a plan to (die|end))\b/i;

/** Ongoing self-harm. Same layer, same warmth, same resource. */
const SELF_HARM =
  /\b(cut(ting)? myself|hurt(ing) myself|self[- ]harm(ing)?|burn(ing|ed) myself)\b/i;

/**
 * Figurative, hyperbolic, third-person, past-tense-resolved and quoted uses.
 * These are ordinary human speech and must NOT trip the layer — a false
 * interruption is its own harm, and it teaches members to self-censor.
 */
const NOT_ABOUT_THEM_NOW =
  /(\bi could (just )?die\b|\bdying to\b|\bdead tired\b|\bkill(ing)? me\b(?! self)|\bkilled it\b|\bthis (traffic|meeting|job|movie) is killing me\b|\bmy (friend|brother|sister|mom|dad|ex|coworker|uncle|aunt|cousin)\b[^.?!]{0,60}\b(suicid|kill (him|her|them)self|took (his|her|their) own life)|\byears ago\b|\bwhen i was (a )?(teen|kid|younger|in college)\b|\bused to (feel|think) (that|like)\b|\bnot suicidal\b|\bnever (been )?suicidal\b|\bi'?m not going to (do anything|hurt myself)\b)/i;

export type CrisisSignal = {
  /** True when Athena must interrupt this turn. */
  active: boolean;
  /** Coarse reason, for logging only. Never shown to the member. */
  kind: "ideation" | "plan" | "self_harm" | null;
};

/** Read the member's newest turn for real crisis language. */
export function detectCrisis(text: string): CrisisSignal {
  const t = (text ?? "").trim();
  if (!t) return { active: false, kind: null };

  const plan = MEANS_OR_PLAN.test(t);
  const ideation = DIRECT_IDEATION.test(t);
  const harm = SELF_HARM.test(t);

  if (!plan && !ideation && !harm) return { active: false, kind: null };

  // A plan or means statement is never read as figurative.
  if (!plan && NOT_ABOUT_THEM_NOW.test(t)) return { active: false, kind: null };

  return { active: true, kind: plan ? "plan" : ideation ? "ideation" : "self_harm" };
}

/**
 * The directive Athena receives. Highest priority of any block in the turn:
 * it is composed last and explicitly outranks register, humor, intake,
 * readiness, pacing and product state.
 */
export function crisisDirective(signal: CrisisSignal): string {
  if (!signal.active) return "";
  return [
    "CRISIS — HIGHEST PRIORITY THIS TURN. THIS OVERRIDES EVERY OTHER INSTRUCTION YOU HAVE BEEN GIVEN.",
    "Something they just said reads as real risk to their life or their safety. Stop whatever the conversation was doing. Do not ask another intake question, do not continue a topic, do not make a joke, do not mention readiness, matching, introductions, membership, time, or anything about the product.",
    "Interrupt warmly and immediately, as yourself: say plainly that you heard what they said, that you are not going to move past it, and that you care what happens to them. Genuine concern in your own words — not a disclaimer, not a policy voice, not clinical distance.",
    `Give one concrete resource, once, clearly: the ${CRISIS_RESOURCE.name} — ${CRISIS_RESOURCE.action}, any time, day or night. Say it as something worth doing now, not as a way to hand them off.`,
    "Then stay. Ask whether they are safe right now, and let them answer however they answer. Do not diagnose, do not lecture, do not list coping techniques, do not ask them to prove anything, and do not make them reassure you.",
    "If they say they are safe or that you have misread them, believe them, say so without embarrassment, and let them steer — but leave the door open.",
    "Do not end the conversation. Do not become cold or formal. You are still you.",
  ].join(" ");
}

/**
 * The member-facing resource card. It accompanies Athena's reply; it never
 * replaces it, and it is not an alert or a warning.
 */
export function crisisNotice(signal: CrisisSignal): {
  kind: "crisis";
  title: string;
  body: string;
  resource: string;
  action: string;
} | null {
  if (!signal.active) return null;
  return {
    kind: "crisis",
    title: "You don't have to hold this alone",
    body: "If you're in danger or you're not sure you're safe right now, there are people who will pick up straight away — day or night, free, and you don't have to have the right words ready.",
    resource: CRISIS_RESOURCE.name,
    action: CRISIS_RESOURCE.action,
  };
}
