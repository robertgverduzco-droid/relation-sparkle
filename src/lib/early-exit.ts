/**
 * Foundational readiness notice & early-exit experience (V1).
 *
 * WHY THIS IS ITS OWN SYSTEM
 * A member trying to finish the foundational conversation early is not a
 * boundary event, not moderation, and not misconduct. Impatience, terseness
 * and a wish to be done are ordinary human behaviour. Routing them through
 * Trust & Safety language (`boundaries.ts`) misrepresents the member to
 * themselves. This module is deliberately separate: different detection,
 * different words, different UI treatment.
 *
 * WHAT IT NEVER DOES
 * It never decides readiness. Readiness is decided server-side by
 * `introduction-readiness.ts` from persisted understanding, and the same
 * value drives both the member-facing message and matchmaking eligibility, so
 * the UI can never say "ready" while the gate says otherwise.
 */

import { asksToBeginMatching } from "./introduction-readiness";
import { memberWantsToStop } from "./pacing";

/** Member language that means "I'd like to be finished with this part". */
const FINISH_INTENT =
  /\b(are we (done|finished)|is that (it|enough|all)|can (we|i) (be )?(done|finish|wrap (this )?up|stop)|(let'?s|can we) (just )?(finish|wrap|move on|get (this )?(over|done))|how much longer|i'?m done|that'?s (it|all|enough)|skip (the|this|ahead)|no more questions|enough questions)\b/i;

/**
 * True when the member is signalling they want to end or fast-forward the
 * foundational conversation. Brevity alone never qualifies.
 */
export function wantsToFinishFoundational(text: string): boolean {
  const t = text ?? "";
  return FINISH_INTENT.test(t) || memberWantsToStop(t) || asksToBeginMatching(t);
}

export type ReadinessNotice = {
  /** Distinct from boundary notices at the type level, not just visually. */
  kind: "readiness";
  state: "not_ready" | "ready";
  title: string;
  body: string;
};

/**
 * The member-facing explanation. Plain, warm, and free of any suggestion of
 * wrongdoing, progress bars, counts, scores or timeframes.
 */
export function readinessNotice(ready: boolean): ReadinessNotice {
  if (ready) {
    return {
      kind: "readiness",
      state: "ready",
      title: "Athena has what she needs to begin",
      body: "She knows enough about you to start considering introductions carefully. Understanding doesn't stop here — the more she learns about you over time, the more thoughtful those introductions become.",
    };
  }
  return {
    kind: "readiness",
    state: "not_ready",
    title: "Athena isn't ready to introduce you yet",
    body: "There are still a few important parts of the picture she needs before she'd feel comfortable introducing you to someone. This isn't about answering more questions correctly — you can stop whenever you like, and everything you've shared is kept for when you come back.",
  };
}

/**
 * Posture guidance for Athena when the member is trying to finish. Sets
 * intent only; the words remain hers.
 */
export function earlyExitGuidance(ready: boolean, missingLabels: string[]): string {
  if (ready) {
    return [
      "EARLY FINISH — THEY MAY FINISH.",
      "You understand enough about them to begin considering introductions responsibly, so do not hold them here.",
      "Say plainly and warmly that you know enough to begin thinking about who might be worth meeting, and that the more you come to understand them over time, the better those introductions become.",
      "Do not imply you now fully understand them, do not promise anyone soon, and do not thank them for completing anything.",
    ].join(" ");
  }
  const areas = missingLabels.length
    ? missingLabels.join("; ")
    : "more of the ordinary texture of their life";
  return [
    "EARLY FINISH — NOT YET READY.",
    "They are trying to end or fast-forward this conversation. This is completely acceptable behaviour: do not treat it as resistance, rudeness, or a problem, and do not warn them about anything.",
    "Explain warmly, in your own words, that you are not quite ready to make introductions yet because there are still a few important parts of the picture you need to understand first.",
    `What you still need: ${areas}.`,
    "Do not list those areas as categories, do not count anything, and do not promise a timeframe.",
    "Make clear they are free to stop any time and that nothing they have shared is lost — you will pick this up when they return.",
    "Then continue the conversation naturally with one real question, keeping breadth-first: prefer an area you have not yet seen over deepening one you have.",
  ].join(" ");
}
