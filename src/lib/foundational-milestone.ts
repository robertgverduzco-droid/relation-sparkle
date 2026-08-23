/**
 * FOUNDATIONAL MILESTONE LIFECYCLE
 *
 * The foundational conversation is a milestone in a relationship that then
 * continues indefinitely. It is NOT a recurring gate.
 *
 * Two things were previously conflated:
 *
 *   1. MATCHMAKING READINESS — server-derived from persisted understanding
 *      (`introduction-readiness.ts`). It governs whether Athena may
 *      responsibly consider introductions. It stays true forever once earned.
 *
 *   2. THE FOUNDATIONAL CONVERSATION LIFECYCLE — whether the member is still
 *      inside the first foundational conversation, and whether the once-ever
 *      "a natural place to pause" opportunity has already been delivered.
 *
 * Because (1) drove the closing sheet, a returning member who said "Hey I'm
 * back" was met with a pause-and-finish sheet on their first turn. That is
 * repeated intake, and it contradicts the continuing-relationship doctrine
 * (`docs/constitution/cross-cutting/presence-and-continuing-relationship.md`).
 *
 * State lives on the member's own `interview_sessions` row — account-scoped
 * and server-owned, so reloads, new devices and account switching all behave
 * correctly, and one account can never affect another's milestone.
 *
 * Both markers are monotonic: nothing here ever un-completes a foundation.
 */

export type FoundationalSessionState = {
  /** `interview_sessions.completed_at` — the member finished the session. */
  completedAt?: string | null;
  /**
   * `interview_sessions.foundational_milestone_at` — the once-ever readiness
   * pause/closing opportunity has already been delivered and handled.
   */
  milestoneAt?: string | null;
  /**
   * The client's own `foundational` flag. It may only ever NARROW the mode
   * (e.g. an explicitly non-foundational surface); it can never grant it.
   */
  clientFoundational?: boolean | undefined;
};

/**
 * True only while the member is genuinely inside the first foundational
 * conversation. Once completed, or once the milestone has been delivered,
 * every later Athena session is an ordinary continuing conversation.
 */
export function isFoundationalSession(state: FoundationalSessionState): boolean {
  if (state.clientFoundational === false) return false;
  if (state.completedAt) return false;
  if (state.milestoneAt) return false;
  return true;
}

/**
 * Whether the once-ever foundational pause/closing opportunity may be offered
 * on this turn. Readiness alone is never sufficient — the member must still be
 * inside the foundational conversation and the milestone must be undelivered.
 */
export function mayOfferFoundationalClose(input: {
  foundationalSession: boolean;
  readinessMet: boolean;
  /** Already offered earlier in this same conversation. */
  offeredThisConversation: boolean;
}): boolean {
  return input.foundationalSession && input.readinessMet && !input.offeredThisConversation;
}
