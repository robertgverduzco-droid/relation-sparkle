// Athena University — one composition entry point for every reasoning surface.
//
// Doctrine (identity, always present) is composed with retrieved educational
// depth (situational, may be empty). Every surface goes through here so that
// the mode policy, the Faculty Principle, and observability are enforced in
// exactly one place and cannot drift apart between text, voice, reflection,
// pair reasoning, and post-meeting conversation.

import { runtimeDoctrine } from "./athena-doctrine.server";
import {
  retrieveEducation,
  type RetrievalMode,
  type RetrievalTrace,
} from "./education-retrieval.server";

export type EducationContext = { block: string; trace: RetrievalTrace | null };

/**
 * Compose doctrine + situational education for one reasoning event.
 *
 * `memberText` is the member's own recent words. It never leaves this process:
 * it is used to select material and its length is recorded, but the text
 * itself is never logged or persisted.
 */
export async function reasoningContext(input: {
  mode: RetrievalMode;
  surface: string;
  memberText?: string;
  /** Stable, non-reversible actor marker. Never a raw member identifier. */
  actorHash?: string | null;
}): Promise<EducationContext> {
  const doctrineMode = input.mode === "voice" ? "conversation" : input.mode;
  const doctrine = runtimeDoctrine(doctrineMode, input.memberText ?? "");

  const text = (input.memberText ?? "").trim();
  if (!text) return { block: doctrine, trace: null };

  try {
    const result = await retrieveEducation({ mode: input.mode, current: text });
    void logRetrieval(input.surface, input.actorHash ?? null, result.trace);
    return {
      block: result.block ? `${doctrine}\n\n${result.block}` : doctrine,
      trace: result.trace,
    };
  } catch {
    // Education deepens reasoning; it is never a precondition for it.
    return { block: doctrine, trace: null };
  }
}

/** One-way marker so telemetry can be grouped without identifying a member. */
export async function actorHash(userId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`athena-education:${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Records which educational material informed a reasoning event. Provenance
 * only — no member content, no model output, no raw identifiers. Failures are
 * swallowed: telemetry must never break a conversation.
 */
export async function logRetrieval(
  surface: string,
  actor: string | null,
  trace: RetrievalTrace,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("education_retrieval_events").insert({
      mode: trace.mode,
      surface,
      actor_hash: actor,
      dense: trace.dense,
      concepts: trace.concepts,
      candidate_count: trace.candidates,
      retrieved_count: trace.retrieved.length,
      is_empty: trace.empty,
      injected_chars: trace.chars,
      chunk_ids: trace.retrieved.map((r) => r.id),
      source_docs: trace.retrieved.map((r) => r.doc),
      scores: trace.retrieved.map((r) => r.score),
      query_chars: trace.queryChars,
    });
  } catch {
    // Observability is best-effort by design.
  }
}
