// Server-only: generation and confirmation of the reveal (Rebuild Spec §5).
//
// The reveal is written from what Athena has actually stored about this
// member — facets, their evidence rung and their own words — never from a
// framework and never from an inference she cannot point at. It is generated
// once and then held; regenerating it on every visit would make it a feed
// rather than a considered read of a person.
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import * as z from "zod";
import {
  REVEAL_DIRECTIVE,
  buildRevealMaterial,
  hasEnoughRevealMaterial,
  shouldRegenerateReveal,
  usableRevealFacets,
  type Reveal,
  type RevealFacetRow,
  type RevealInsight,
} from "./reveal";

const revealSchema = z.object({
  summary: z.string().min(120).max(1600),
  insights: z
    .array(
      z.object({ observation: z.string().min(10).max(320), because: z.string().min(10).max(400) }),
    )
    .min(1)
    .max(2),
});

/** Canonical columns only — anything else makes the query fail silently. */
const FACET_COLUMNS = "facet_key, understanding, confidence, evidence, basis, needs_clarification";

/** The one generation call site, shared by first-write, self-healing, and a member's flag. */
async function generateRevealText(
  material: string,
  extraContext?: string,
): Promise<{ summary: string; insights: RevealInsight[] }> {
  const { createLovableGateway } = await import("./ai-gateway.server");
  const { ANALYTICAL_REGISTER_GUARD } = await import("./conversational-aliveness");
  const { PROMPT_BOUNDARY, asMemberData } = await import("./security.server");
  const gateway = createLovableGateway();

  const { object } = await generateObject({
    model: gateway("openai/gpt-5.5"),
    schema: revealSchema,
    providerOptions: { lovable: { reasoningEffort: "low" } },
    prompt: `${PROMPT_BOUNDARY}

${REVEAL_DIRECTIVE}

${ANALYTICAL_REGISTER_GUARD}

WHAT YOU ACTUALLY KNOW ABOUT THEM (each line carries its evidence strength — respect it):
${asMemberData(material)}${extraContext ? `\n\n${extraContext}` : ""}`,
  });
  return { summary: object.summary, insights: object.insights };
}

export async function loadOrGenerateReveal(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ready: boolean; reveal: Reveal | null }> {
  const { data: existing, error: existingError } = await supabase
    .from("reveal_summaries")
    .select("summary, insights, generated_at, confirmed_at, source_facet_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw new Error(`reveal lookup failed: ${existingError.message}`);

  const held: Reveal | null = existing
    ? {
        summary: existing.summary as string,
        insights: (existing.insights ?? []) as RevealInsight[],
        generatedAt: existing.generated_at as string,
        confirmedAt: (existing.confirmed_at as string | null) ?? null,
      }
    : null;

  // A confirmed reveal is the member's own. It is never rewritten.
  if (held?.confirmedAt) return { ready: true, reveal: held };

  // Readiness is the gate: no reveal exists before Athena can stand behind it.
  if (!held) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { evaluateReadiness } = await import("./readiness.server");
    const readiness = await evaluateReadiness(supabaseAdmin, userId, "manual_request");
    if (readiness.state !== "C") return { ready: false, reveal: null };
  }

  const { data: facets, error: facetsError } = await supabase
    .from("understanding_facets")
    .select(FACET_COLUMNS)
    .eq("user_id", userId);

  // Never write a reveal from a fetch that failed: a generic reveal persisted
  // once would misrepresent the member permanently.
  if (facetsError) throw new Error(`understanding could not be read: ${facetsError.message}`);

  const usable = usableRevealFacets((facets ?? []) as RevealFacetRow[]);
  if (held) {
    const regenerate = shouldRegenerateReveal({
      confirmedAt: held.confirmedAt,
      sourceFacetCount: Number(existing?.source_facet_count ?? 0),
      currentUsableFacets: usable.length,
    });
    if (!regenerate) return { ready: true, reveal: held };
  } else if (!hasEnoughRevealMaterial(usable.length)) {
    // Readiness says there should be understanding; there is too little of it
    // to write a read of a person. Hold rather than persist something generic
    // that then becomes this member's permanent record.
    return { ready: false, reveal: null };
  }

  const material = buildRevealMaterial(usable);
  // Last line of defence before anything is written down about a person: the
  // reveal is only ever generated from real, sufficient member material.
  if (!hasEnoughRevealMaterial(usable.length) || material.trim().length === 0) {
    return { ready: Boolean(held), reveal: held };
  }

  const object = await generateRevealText(material);

  const generatedAt = new Date().toISOString();
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  await admin.from("reveal_summaries").upsert(
    {
      user_id: userId,
      summary: object.summary,
      insights: object.insights,
      generated_at: generatedAt,
      source_facet_count: usable.length,
      // Fresh text — whatever budget the previous draft had used doesn't
      // carry over to words the member has never even seen.
      regenerated_once: false,
    },
    { onConflict: "user_id" },
  );

  return {
    ready: true,
    reveal: { summary: object.summary, insights: object.insights, generatedAt, confirmedAt: null },
  };
}

/** The member's review. Confirmation is what unlocks the payment step — and
 * the only thing that ever locks the reveal. Flagging a problem is a
 * separate action (see flagRevealFor) and never confirms anything. */
export async function confirmRevealFor(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; confirmedAt: string }> {
  const confirmedAt = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("reveal_summaries")
    .update({ confirmed_at: confirmedAt })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  void supabase; // reads are RLS-scoped above; the write is a governed path
  return { ok: true, confirmedAt };
}

/**
 * "Something's off" — genuinely reopens the reveal instead of confirming it.
 *
 * The member's account of what's wrong is logged unconditionally, every
 * time, into understanding_revisions — reflectAthena reads recent entries
 * under the reveal_summary key back into her reasoning, so this is never a
 * write nobody reads (see the "DIRECT MEMBER CORRECTIONS" block there).
 *
 * The rewrite itself is capped at one attempt per draft: the first flag
 * regenerates once, folding the note in as context; a second flag against
 * that same (already-once-rewritten) text does not trigger another rewrite
 * — the note is still logged, but the member is told plainly and given a
 * real choice, not a third guess dressed up as a fix.
 */
export async function flagRevealFor(
  supabase: SupabaseClient,
  userId: string,
  note: string,
): Promise<{ regenerated: boolean; capped: boolean; reveal: Reveal }> {
  const { data: existing, error: existingError } = await supabase
    .from("reveal_summaries")
    .select("summary, insights, generated_at, confirmed_at, regenerated_once")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw new Error(`reveal lookup failed: ${existingError.message}`);
  if (!existing) throw new Error("There's no reveal to flag yet.");
  if (existing.confirmed_at) throw new Error("This reveal is already confirmed.");

  const held: Reveal = {
    summary: existing.summary as string,
    insights: (existing.insights ?? []) as RevealInsight[],
    generatedAt: existing.generated_at as string,
    confirmedAt: null,
  };

  const { error: logError } = await supabase.from("understanding_revisions").insert({
    user_id: userId,
    // Not a real facet — this is about the reveal as a whole, not one
    // specific thing Athena believes. A sentinel key, not a forced fit.
    facet_key: "reveal_summary",
    revision_kind: "correction",
    member_statement: note,
    previous_understanding: held.summary,
    previous_confidence: null,
  });
  if (logError) throw new Error(logError.message);

  if (existing.regenerated_once) {
    return { regenerated: false, capped: true, reveal: held };
  }

  const { data: facets, error: facetsError } = await supabase
    .from("understanding_facets")
    .select(FACET_COLUMNS)
    .eq("user_id", userId);
  if (facetsError) throw new Error(`understanding could not be read: ${facetsError.message}`);
  const usable = usableRevealFacets((facets ?? []) as RevealFacetRow[]);
  if (!hasEnoughRevealMaterial(usable.length)) {
    // Nothing new to write from. Treat like the cap rather than pretend a
    // rewrite happened when it couldn't have said anything different.
    return { regenerated: false, capped: true, reveal: held };
  }

  const material = buildRevealMaterial(usable);
  const extraContext = `THE MEMBER REVIEWED A DRAFT OF THIS AND SAID SOMETHING WAS WRONG. Take this seriously and correct the actual read — do not just soften language or hedge around it. Their words: "${note}"`;
  const object = await generateRevealText(material, extraContext);

  const generatedAt = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: upsertError } = await supabaseAdmin.from("reveal_summaries").upsert(
    {
      user_id: userId,
      summary: object.summary,
      insights: object.insights,
      generated_at: generatedAt,
      source_facet_count: usable.length,
      regenerated_once: true,
    },
    { onConflict: "user_id" },
  );
  if (upsertError) throw new Error(upsertError.message);

  return {
    regenerated: true,
    capped: false,
    reveal: { summary: object.summary, insights: object.insights, generatedAt, confirmedAt: null },
  };
}
