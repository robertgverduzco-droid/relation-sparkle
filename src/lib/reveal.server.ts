// Server-only: generation and confirmation of the reveal (Rebuild Spec §5).
//
// The reveal is written from what Athena has actually stored about this
// member — facets, their evidence rung and their own words — never from a
// framework and never from an inference she cannot point at. It is generated
// once and then held; regenerating it on every visit would make it a feed
// rather than a considered read of a person.
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { z } from "zod";
import { REVEAL_DIRECTIVE, type Reveal, type RevealInsight } from "./reveal";

const revealSchema = z.object({
  summary: z.string().min(120).max(1600),
  insights: z
    .array(z.object({ observation: z.string().min(10).max(320), because: z.string().min(10).max(400) }))
    .min(1)
    .max(2),
});

export async function loadOrGenerateReveal(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ready: boolean; reveal: Reveal | null }> {
  const { data: existing } = await supabase
    .from("reveal_summaries")
    .select("summary, insights, generated_at, confirmed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return {
      ready: true,
      reveal: {
        summary: existing.summary as string,
        insights: (existing.insights ?? []) as RevealInsight[],
        generatedAt: existing.generated_at as string,
        confirmedAt: (existing.confirmed_at as string | null) ?? null,
      },
    };
  }

  // Readiness is the gate: no reveal exists before Athena can stand behind it.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { evaluateReadiness } = await import("./readiness.server");
  const readiness = await evaluateReadiness(supabaseAdmin, userId, "manual_request");
  if (readiness.state !== "C") return { ready: false, reveal: null };

  const { data: facets } = await supabase
    .from("understanding_facets")
    .select("facet_key, understanding, evidence_level, confidence, member_words")
    .eq("user_id", userId);

  const material =
    (facets ?? [])
      .map(
        (f: Record<string, unknown>) =>
          `- ${String(f.facet_key)} [${String(f.evidence_level ?? "unestablished")}] ${String(
            f.understanding ?? "",
          )}${f.member_words ? ` — their words: "${String(f.member_words)}"` : ""}`,
      )
      .join("\n") || "(nothing yet)";

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
${asMemberData(material)}`,
  });

  const generatedAt = new Date().toISOString();
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  await admin.from("reveal_summaries").insert({
    user_id: userId,
    summary: object.summary,
    insights: object.insights,
    generated_at: generatedAt,
  });

  return {
    ready: true,
    reveal: { summary: object.summary, insights: object.insights, generatedAt, confirmedAt: null },
  };
}

/** The member's review. Confirmation is what unlocks the payment step. */
export async function confirmRevealFor(
  supabase: SupabaseClient,
  userId: string,
  memberNote: string | null,
): Promise<{ ok: true; confirmedAt: string }> {
  const confirmedAt = new Date().toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("reveal_summaries")
    .update({ confirmed_at: confirmedAt, member_note: memberNote })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  void supabase; // reads are RLS-scoped above; the write is a governed path
  return { ok: true, confirmedAt };
}
