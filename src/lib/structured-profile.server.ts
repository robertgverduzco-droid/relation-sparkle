// Validation for structured self-description and match preferences.
import { z } from "zod";

const openness = z.enum(["open", "preference", "requirement", "discuss_with_athena"]);

// 120cm–230cm keeps stated heights inside a plausible human range without
// judging any of them.
const heightCm = z.number().int().min(120).max(230).nullable().optional();

export const selfDescriptionInput = z.object({
  height_cm: heightCm,
  ethnicities: z.array(z.string().max(40)).max(12).optional(),
  ethnicity_self_describe: z.string().max(160).nullable().optional(),
  religions: z.array(z.string().max(40)).max(12).optional(),
  religion_self_describe: z.string().max(160).nullable().optional(),
});

export const matchPreferencesInput = z.object({
  ethnicity_openness: openness,
  preferred_ethnicities: z.array(z.string().max(40)).max(12).optional(),
  religion_openness: openness,
  preferred_religions: z.array(z.string().max(40)).max(12).optional(),
  height_min_cm: heightCm,
  height_max_cm: heightCm,
  height_strength: z.enum(["preference", "requirement"]),
  additional_notes: z.string().max(2000).nullable().optional(),
});

export const structuredProfileInput = z.object({
  self: selfDescriptionInput.optional(),
  preferences: matchPreferencesInput.optional(),
});
