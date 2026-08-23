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

/**
 * When `foundational_milestone_at` came into existence. Any session row that
 * was created before this instant belongs to a member whose foundational
 * transition, if it happened at all, happened without the marker being
 * writable. Those members must never be shown the once-ever pause again.
 *
 * A one-off migration backfilled the marker for them; this constant makes the
 * rule structural rather than dependent on that data fix having reached every
 * row (a legacy row can be recreated by restore, replay, or import).
 */
export const MILESTONE_ARCHITECTURE_AT = Date.parse("2026-08-23T20:00:00Z");

export type FoundationalSessionState = {
  /** `interview_sessions.completed_at` — the member finished the session. */
  completedAt?: string | null;
  /**
   * `interview_sessions.foundational_milestone_at` — the once-ever readiness
   * pause/closing opportunity has already been delivered and handled.
   */
  milestoneAt?: string | null;
  /** `interview_sessions.created_at` — used only for the legacy rule below. */
  sessionCreatedAt?: string | null;
  /**
   * Whether the member currently satisfies foundational matchmaking readiness.
   * Combined with a pre-architecture session, this proves the transition
   * already happened before the marker could be recorded.
   */
  memberAlreadyReady?: boolean | undefined;
  /**
   * The client's own `foundational` flag. It may only ever NARROW the mode
   * (e.g. an explicitly non-foundational surface); it can never grant it.
   */
  clientFoundational?: boolean | undefined;
};

/**
 * A member who reached readiness before the marker existed. Their milestone is
 * historical fact, not something still owed to them.
 */
export function isLegacyCrossedFoundation(state: FoundationalSessionState): boolean {
  if (state.milestoneAt) return false;
  if (!state.memberAlreadyReady) return false;
  const created = state.sessionCreatedAt ? Date.parse(state.sessionCreatedAt) : NaN;
  return Number.isFinite(created) && created < MILESTONE_ARCHITECTURE_AT;
}

/**
 * True only while the member is genuinely inside the first foundational
 * conversation. Once completed, once the milestone has been delivered, or once
 * a pre-architecture member is known to have already crossed it, every later
 * Athena session is an ordinary continuing conversation.
 */
export function isFoundationalSession(state: FoundationalSessionState): boolean {
  if (state.clientFoundational === false) return false;
  if (state.completedAt) return false;
  if (state.milestoneAt) return false;
  if (isLegacyCrossedFoundation(state)) return false;
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
