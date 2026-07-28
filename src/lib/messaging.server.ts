import { z } from "zod";

export const sendInput = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export const listMessagesInput = z.object({
  conversation_id: z.string().uuid(),
});

export const blockInput = z.object({
  user_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const reportInput = z.object({
  reported_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  category: z.enum(["harassment", "unsafe", "spam", "impersonation", "other"]),
  details: z.string().max(2000).optional(),
});

export const usageInput = z.object({
  kind: z.enum(["athena_voice", "athena_text"]),
  seconds: z.number().int().min(0).max(3600).optional(),
  input_tokens: z.number().int().min(0).max(200000).optional(),
  output_tokens: z.number().int().min(0).max(200000).optional(),
  model: z.string().max(80).optional(),
});
