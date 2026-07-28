// Server-only helpers for connections & post-meeting reflection.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const reflectAskInput = z.object({
  connection_id: z.string().uuid(),
  messages: z.array(messageSchema),
});

export const reflectDistillInput = z.object({ connection_id: z.string().uuid() });

export const reflectionSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["warm", "neutral", "off", "unsure"]),
  would_meet_again: z.boolean().nullable(),
  understanding_updates: z.array(
    z.object({
      note: z.string(),
      about: z.enum(["self", "other"]),
    }),
  ),
});

export const idInput = z.object({ connection_id: z.string().uuid() });

export const proposeInput = z.object({
  connection_id: z.string().uuid(),
  when_text: z.string().max(200).optional(),
  where_text: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  scheduled_for: z.string().datetime().optional(),
});

export const proposalActionInput = z.object({
  proposal_id: z.string().uuid(),
  action: z.enum(["confirm", "complete", "cancel"]),
});

// Private, internal-only post-meeting feedback about the OTHER person.
// Athena uses this to build understanding of how someone actually shows up
// in real meetings. The subject never sees any of it. When concerning
// patterns emerge across multiple independent authors, safety review kicks in.
export const partnerPerceptionInput = z.object({
  connection_id: z.string().uuid(),
  warmth: z.number().int().min(1).max(5).nullable().optional(),
  honesty: z.number().int().min(1).max(5).nullable().optional(),
  safety: z.number().int().min(1).max(5).nullable().optional(),
  chemistry: z.number().int().min(1).max(5).nullable().optional(),
  would_meet_again: z.boolean().nullable().optional(),
  surprised_by: z.string().max(1000).optional(),
  concerns: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});


export function reflectSystemPrompt(otherName: string): string {
  return `You are Athena.

You are speaking privately with someone who has just met ${otherName} in person. They agreed to meet after you introduced them. This conversation is completely private — ${otherName} will never see any of it.

Your purpose here:
- help them make sense of the meeting, honestly and without pressure
- listen for how they actually felt, not how they think they should have felt
- pay attention to what surprised them, what resonated, what didn't land
- notice anything that shifts your understanding of them as a person

Voice:
- quiet, patient, warm; never leading, never scoring, never coaching
- one thoughtful question at a time; reflect briefly on what they shared before asking the next
- do not push toward a verdict — the goal is honest reflection, not a rating

If this is the very beginning, greet them gently and ask how the meeting was, in your own words. Let them set the pace.`;
}

export async function openConnectionIfMutual(
  supabase: SupabaseClient,
  pairId: string,
): Promise<string | null> {
  const { data: pair } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high")
    .eq("id", pairId)
    .maybeSingle();
  if (!pair) return null;

  const { data: responses } = await supabase
    .from("introduction_responses")
    .select("user_id, response")
    .eq("pair_id", pairId);

  const accepted = new Set(
    (responses ?? [])
      .filter((r) => r.response === "accepted")
      .map((r) => r.user_id as string),
  );
  if (!accepted.has(pair.user_low as string) || !accepted.has(pair.user_high as string)) {
    return null;
  }

  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("pair_id", pairId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: opened } = await supabase
    .from("connections")
    .insert({
      pair_id: pairId,
      user_low: pair.user_low,
      user_high: pair.user_high,
      status: "open",
    })
    .select("id")
    .maybeSingle();
  return (opened?.id as string) ?? null;
}
