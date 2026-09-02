/**
 * Member-facing egress guard — a wall, not a habit.
 *
 * WHY THIS EXISTS
 * Everything that previously stopped Athena from discussing app internals in a
 * member conversation was prompt-level: PROMPT_BOUNDARY and MEMBER_SCOPE ask
 * the model not to go there. That is good behaviour, not a barrier — the
 * doctrine layer is physically present in the member prompt, so a sufficiently
 * clever framing can in principle draw it out.
 *
 * This module is the deterministic last mile. It runs server-side on Athena's
 * composed reply *after* the model has spoken and *before* the member sees or
 * hears it. It does not ask the model for anything and cannot be argued with,
 * roleplayed around, or prompt-injected: it is a regex over the outbound bytes.
 *
 * DESIGN CONSTRAINTS
 * - Zero tolerance for false negatives on machine-shaped material (snake_case
 *   table names, file paths, keys, tokens, prompt-identifier names).
 * - Very low tolerance for false positives on ordinary human speech. A member
 *   may say "I work in security", "my profile", "the app" — none of that trips
 *   anything here. Only machine-shaped or unambiguously internal phrasing does.
 * - Failure mode is a warm, in-character deflection, never an error and never a
 *   partial reply with the offending sentence trimmed (trimming leaks shape).
 */

/** Snake_case identifiers that only ever appear in our schema or code. */
const INTERNAL_IDENTIFIERS = [
  "understanding_facets",
  "facet_history",
  "topic_map",
  "interview_sessions",
  "founder_dialogue_messages",
  "pair_reasoning",
  "pair_reasoning_history",
  "admin_audit_log",
  "security_kill_switches",
  "athena_usage_log",
  "athena_self_evaluations",
  "user_roles",
  "user_intelligence",
  "member_readiness",
  "partner_perception",
  "reflection_submissions",
  "post_meeting_reflections",
  "introduction_responses",
  "introduction_feedback",
  "safety_flags",
  "live_voice_grants",
  "prompt_boundary",
  "member_scope",
  "no_numerical_reduction",
  "runtime_doctrine",
  "service_role",
  "app_role",
  "auth.uid",
] as const;

/**
 * Phrases that, in Athena's own voice to a member, mean she has stepped out of
 * the conversation and into the machine. Deliberately phrased tightly so a
 * member saying "I read your privacy policy" or "how do you work?" does not
 * trip it — only Athena's *answer* is screened, and only for these shapes.
 *
 * NARROWING RULE: every entry here must be self-referential (Athena
 * describing *her own* construction) or a doctrine/governance term with no
 * ordinary-speech meaning. Bare vendor or technology vocabulary is
 * deliberately excluded — "Postgres", "Supabase", "API key", "codebase",
 * "GPT-4", "edge function", "the repo" are all things a member with a
 * software job says about *their own* work constantly, and a reply that
 * merely reflects that back is not a leak. Real internal-disclosure signal
 * lives in MACHINE_SHAPES (file paths, identifiers, credentials, env vars)
 * and INTERNAL_IDENTIFIERS (our exact schema/table names), not in generic
 * tech words.
 */
const INTERNAL_PHRASES: RegExp[] = [
  /\bmy (?:system )?prompt\b/i,
  /\bsystem prompt\b/i,
  /\bmy instructions?\b/i,
  /\bthe instructions? (?:i|I)(?:'m| am) (?:given|running|operating) (?:under|with)\b/i,
  /\bmy doctrine\b/i,
  /\bdoctrine layer\b/i,
  /\bconstitution (?:layer|document|file)\b/i,
  /\bfounder dialogue\b/i,
  /\bgovernance (?:channel|conversation|thread)\b/i,
  /\brow[- ]level security\b/i,
  /\bRLS\b/,
  /\bservice[- ]role\b/i,
  /\bmy (?:model|weights|temperature|token limit|context window)\b/i,
  /\b(?:running on|powered by|my model is) (?:gpt|claude|gemini|llama)[- ]?[0-9]/i,
  /\bmy API key\b/i,
  /\bmy bearer token\b/i,
  /\bLovable (?:AI|gateway|Cloud)\b/i,
];

/** File paths, code identifiers, secrets. Machine shapes, never human speech. */
const MACHINE_SHAPES: RegExp[] = [
  /\b(?:src|docs|supabase|public)\/[A-Za-z0-9._/-]+/,
  /\b[A-Za-z0-9_-]+\.(?:ts|tsx|sql|json|env|md)\b/,
  /\b[A-Z][A-Z0-9]{3,}_[A-Z0-9_]{2,}\b/, // SCREAMING_SNAKE constants (env var names)
  /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/,
  /\bsk-[A-Za-z0-9]{8,}/,
  /\bseng_[A-Za-z0-9]{8,}/, // our Speech Engine agent id
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\bhttps?:\/\/[a-z0-9-]+\.supabase\.(?:co|in)\b/i,
];

export type OutputScreen =
  | { ok: true }
  | { ok: false; reason: "internal_identifier" | "internal_phrase" | "machine_shape"; marker: string };

/**
 * Screens one member-facing utterance. Pure and synchronous so it can run on
 * every turn — text and voice — without adding latency.
 */
export function screenMemberOutput(text: string): OutputScreen {
  const lower = text.toLowerCase();

  for (const id of INTERNAL_IDENTIFIERS) {
    if (lower.includes(id)) return { ok: false, reason: "internal_identifier", marker: id };
  }
  for (const re of MACHINE_SHAPES) {
    const m = re.exec(text);
    if (m) return { ok: false, reason: "machine_shape", marker: m[0].slice(0, 40) };
  }
  for (const re of INTERNAL_PHRASES) {
    const m = re.exec(text);
    if (m) return { ok: false, reason: "internal_phrase", marker: m[0].slice(0, 40) };
  }
  return { ok: true };
}

/**
 * What the member gets instead. In Athena's register: no error language, no
 * hint that a filter exists, no lecture — a plain answer about purpose and a
 * return to the person, which is exactly what doctrine asks for anyway.
 */
export const INTERNALS_DEFLECTION =
  "I'd rather not get into how I'm built — it's genuinely not the interesting part, and it isn't mine to hand out. What I'm here for is simpler than that: understanding you well enough to be right about who you'd be extraordinary with. Where were we?";

/**
 * The single call site contract: give it Athena's composed reply, get back
 * something safe to show or speak. Never throws.
 */
export function guardMemberOutput(text: string): { text: string; blocked: boolean; reason?: string; marker?: string } {
  const screen = screenMemberOutput(text);
  if (screen.ok) return { text, blocked: false };
  return { text: INTERNALS_DEFLECTION, blocked: true, reason: screen.reason, marker: screen.marker };
}

/**
 * Distillation egress: the same wall applied to what Athena writes *into* the
 * Living Profile. MEMBER_EVIDENCE_SCOPE asks the reflection model to skip
 * product/system talk; this drops it deterministically if it comes back anyway,
 * so system discussion can never become dating evidence about a person.
 *
 * Callers must pass only Athena's own synthesis (understanding, reasoning,
 * observations) — never the member's own quoted words. Member evidence is
 * theirs; a facet can never be discarded because of what technical vocabulary
 * a member happened to use describing their own life.
 */
export function isInternalEvidence(...parts: Array<string | null | undefined>): boolean {
  return !screenMemberOutput(parts.filter(Boolean).join("\n")).ok;
}
