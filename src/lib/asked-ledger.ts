/**
 * The asked-question ledger.
 *
 * Athena's only previous defence against repeating a question was the raw
 * transcript plus a soft instruction. That defence fails wherever the
 * transcript is not whole: history trimming drops the oldest turns, the
 * safety-filter fallback retries on a short tail, and a live call carries only
 * its own messages. In each of those cases a question she already asked
 * becomes invisible to her, and she asks it again.
 *
 * This module derives a compact, durable record of what she has already asked
 * from whatever transcript exists, so the record can be carried in the system
 * prompt — which is never trimmed away and is identical on the fallback and
 * voice paths.
 *
 * It records questions only. It never records the member's answers, and it is
 * never shown to a member.
 */

export type LedgerMessage = { role: string; content: string };

const MAX_QUESTIONS = 40;
/** Questions are stored short: enough to recognise, never a transcript. */
const MAX_CHARS = 160;

/** Pull the interrogative sentences out of one of Athena's turns. */
export function questionsIn(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  // Sentence-ish split that keeps the terminator, so a question mark survives.
  for (const raw of text.split(/(?<=[.?!])\s+/)) {
    const s = raw.trim();
    if (!s.endsWith("?")) continue;
    if (s.length < 8) continue;
    out.push(s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS)}…` : s);
  }
  return out;
}

/** A loose fingerprint so near-identical rewordings collapse to one entry. */
export function questionKey(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          "what",
          "when",
          "where",
          "which",
          "your",
          "youre",
          "about",
          "that",
          "this",
          "with",
          "have",
          "been",
          "like",
          "tell",
          "would",
          "could",
          "does",
          "them",
          "they",
          "then",
          "just",
          "really",
          "there",
        ].includes(w),
    )
    .sort()
    .join(" ");
}

/**
 * Merge a stored transcript with the turns supplied for this request.
 * Either may be the more complete one — a live call carries turns that are
 * not yet persisted; a trimmed request carries fewer than the store holds.
 */
export function mergeTranscripts(
  stored: LedgerMessage[],
  live: LedgerMessage[],
): LedgerMessage[] {
  const seen = new Set<string>();
  const out: LedgerMessage[] = [];
  for (const m of [...stored, ...live]) {
    if (!m || typeof m.content !== "string") continue;
    const key = `${m.role}:${m.content.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

/** Every question Athena has already asked, oldest first, de-duplicated. */
export function askedQuestions(messages: LedgerMessage[]): string[] {
  const byKey = new Map<string, string>();
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const q of questionsIn(m.content)) {
      const key = questionKey(q);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, q);
    }
  }
  return [...byKey.values()].slice(-MAX_QUESTIONS);
}

/**
 * The prompt block. Empty when nothing has been asked yet, so a first turn
 * carries no dead weight.
 */
export function askedLedgerBlock(questions: string[]): string {
  if (questions.length === 0) return "";
  return [
    "QUESTIONS YOU HAVE ALREADY ASKED THIS PERSON (internal ledger — never shown, never listed back).",
    "This list is authoritative even when the transcript above is shorter than the conversation actually was: turns may have been dropped from this request. If a question below has already been asked, do not ask it again in any rewording. If you need more on that ground, either build on what they already said or come at it from a genuinely new angle, and never imply they have not answered.",
    ...questions.map((q) => `- ${q}`),
  ].join("\n");
}

/** Convenience: the whole path, from two transcripts to one prompt block. */
export function buildAskedLedger(
  stored: LedgerMessage[],
  live: LedgerMessage[],
): { questions: string[]; block: string } {
  const questions = askedQuestions(mergeTranscripts(stored, live));
  return { questions, block: askedLedgerBlock(questions) };
}
