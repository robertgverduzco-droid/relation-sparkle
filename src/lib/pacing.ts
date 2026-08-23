/**
 * Conversation pacing for the foundational conversation (V1).
 *
 * WHAT THIS FIXES
 * Pacing previously reached "offer_return" on turn count alone, and treated
 * ordinary Athena phrases ("come back to that", "next time") as an offer to
 * close. A member answering tersely accumulates turns quickly, so the closing
 * card ("A natural place to pause") appeared after almost every reply.
 *
 * GOVERNING RULE
 * Brevity is valid member behaviour. Short answers are never evidence of
 * disengagement, resistance, or misconduct. A natural pause requires either
 * real elapsed time in the conversation, or the member actually saying they
 * want to stop.
 */

export type Pacing = "continue" | "wind_down" | "offer_return";

/** No close is ever offered before this many minutes, whatever the turn count. */
export const MIN_MINUTES_BEFORE_CLOSE = 16;

/**
 * RESPECT FOR THEIR TIME.
 *
 * Around this point Athena acknowledges, once, how long they have been
 * talking. It is a courtesy, not a deadline: time never overrides readiness in
 * either direction. Reaching it does not make her ready, and being ready
 * before it does not oblige anyone to stop.
 */
export const RESPECT_TIME_MINUTES = 15;

/**
 * MEMBER-LED CLOSING.
 *
 * Once a member has said they want to keep going, Athena stays with them. She
 * does not re-offer a pause every turn until they give in. Closing becomes
 * theirs to initiate for at least this many subsequent turns.
 */
export const CONTINUE_SUPPRESSION_TURNS = 4;

/** Member language that means "I'd like to keep going". */
const MEMBER_CONTINUE_INTENT =
  /\b(keep (going|talking|chatting)|carry on|continue|i'?m (happy|fine|good) to (keep|carry|continue|go on)|(let'?s|we can) keep (going|talking)|i (have|got) (more )?time|i'?d like to (keep|continue)|(no|not),? i'?m (fine|good|okay)|don'?t (want to )?stop|more time|go on)\b/i;

/**
 * True when the member has said they want the conversation to continue.
 * Deliberately about continuing, never merely about answering at length.
 */
export function memberWantsToContinue(text: string): boolean {
  const t = text ?? "";
  if (MEMBER_STOP_INTENT.test(t)) return false;
  return MEMBER_CONTINUE_INTENT.test(t);
}

/**
 * How many member turns ago (0 = this turn) the member last said they wanted
 * to keep going. Null when they never have. Derived from the transcript so no
 * client state can dismiss a member who asked to stay.
 */
export function turnsSinceContinueRequest(
  messages: ReadonlyArray<{ role: string; content: string }>,
): number | null {
  const memberTurns = (messages ?? []).filter((m) => m.role === "user");
  for (let i = memberTurns.length - 1; i >= 0; i--) {
    if (memberWantsToContinue(memberTurns[i]!.content)) return memberTurns.length - 1 - i;
  }
  return null;
}


/**
 * Member language that genuinely signals an intention to stop or pause.
 * Deliberately narrow: it must be about ending, not about being brief.
 */
const MEMBER_STOP_INTENT =
  /\b(i (have to|need to|gotta|should) (go|run|stop|head out|get going)|let'?s (stop|pause|pick this up|continue) (here|later|another time|tomorrow)|can we (stop|pause|finish|continue this) (here|later|another time|tomorrow)|that'?s enough for (now|today)|i'?m done for (now|today)|talk (to you )?(later|tomorrow)|good ?night|(i'?m )?(too )?tired|another time)\b/i;

/**
 * Athena language that constitutes an actual offer to resume another day.
 * Requires an explicit pause/return construction — casual conversational
 * phrases like "we can come back to that" must NOT match.
 */
const ATHENA_RETURN_OFFER =
  /\b(pick (this|it) (back )?up (again )?(another|some other) (day|time)|continue (this )?(another|some other) (day|time)|(good|natural) place to (pause|stop|rest)|leave it (here|there) for (now|today)|carry (this|it) on (another|some other) (day|time))\b/i;

export function memberWantsToStop(text: string): boolean {
  return MEMBER_STOP_INTENT.test(text ?? "");
}

export function athenaOffersReturn(text: string): boolean {
  return ATHENA_RETURN_OFFER.test(text ?? "");
}

export type PacingInput = {
  elapsedMinutes: number;
  userTurns: number;
  /** Athena's reply for this turn. */
  reply: string;
  /** The member's newest message. */
  latestMemberMessage: string;
  /** False when whole areas of the member's life are still unseen. */
  breadthSufficient: boolean;
  /**
   * True once the server-side minimum foundational understanding is held.
   *
   * FOUNDATIONAL COMPLETION AT MINIMUM READINESS
   * The foundational conversation exists to reach a threshold, not to gather
   * as much as possible. Once the threshold is genuinely met, continuing to
   * intake turns a conversation into an interview. Everything beyond the
   * minimum is learned in ordinary ongoing conversation instead.
   */
  readinessMet?: boolean;
};

export function decidePacing(input: PacingInput): Pacing {
  const { elapsedMinutes: elapsed, userTurns, reply, latestMemberMessage } = input;

  // The member asking to stop is always honoured, immediately and at any point.
  if (memberWantsToStop(latestMemberMessage)) return "offer_return";

  // Minimum readiness reached: close. The time floor exists to stop a terse
  // member being rushed out before Athena understands them — it is not a
  // quota to be served once she does.
  if (input.readinessMet) return "offer_return";

  // Time floor: turn count alone can never close a conversation. A terse
  // member reaches twenty turns in five minutes; that is a conversational
  // style, not a finished foundational conversation.
  if (elapsed < MIN_MINUTES_BEFORE_CLOSE) {
    return elapsed >= 12 && userTurns >= 12 ? "wind_down" : "continue";
  }

  // Breadth (which now includes the required physical-attraction
  // understanding) holds the graceful close a little longer, but never
  // indefinitely.
  const readyToOffer = input.breadthSufficient
    ? (elapsed >= 20 && userTurns >= 10) || elapsed >= 24
    : elapsed >= 26;

  const offerReturn = readyToOffer && (athenaOffersReturn(reply) || elapsed >= 22);

  if (offerReturn) return "offer_return";
  return elapsed >= 18 || userTurns >= 12 ? "wind_down" : "continue";
}

