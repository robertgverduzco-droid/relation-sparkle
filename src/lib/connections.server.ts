// Server-only helpers for post-meeting reflection with Athena.
import { z } from "zod";

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
