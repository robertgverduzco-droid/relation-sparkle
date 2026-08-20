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
};

export function decidePacing(input: PacingInput): Pacing {
  const { elapsedMinutes: elapsed, userTurns, reply, latestMemberMessage } = input;

  // The member asking to stop is always honoured, immediately and at any point.
  if (memberWantsToStop(latestMemberMessage)) return "offer_return";

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
