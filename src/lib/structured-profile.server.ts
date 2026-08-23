// Validation for structured self-description and match preferences.
import { z } from "zod";

const openness = z.enum(["open", "preference", "requirement", "discuss_with_athena"]);

// 120cm–230cm keeps stated heights inside a plausible human range without
// judging any of them.
const heightCm = z.number().int().min(120).max(230).nullable().optional();

const strength = z.enum(["preference", "requirement"]);

export const selfDescriptionInput = z.object({
  height_cm: heightCm,
  ethnicities: z.array(z.string().max(40)).max(12).optional(),
  ethnicity_self_describe: z.string().max(160).nullable().optional(),
  religions: z.array(z.string().max(40)).max(12).optional(),
  religion_self_describe: z.string().max(160).nullable().optional(),
  smoking: z.enum(["no", "occasionally", "yes", "prefer_not_to_say"]).nullable().optional(),
  drinking: z.enum(["no", "rarely", "socially", "regularly", "prefer_not_to_say"]).nullable().optional(),
  hobbies: z.array(z.string().max(40)).max(40).optional(),
  hobbies_note: z.string().max(600).nullable().optional(),
});

export const matchPreferencesInput = z.object({
  ethnicity_openness: openness,
  preferred_ethnicities: z.array(z.string().max(40)).max(12).optional(),
  religion_openness: openness,
  preferred_religions: z.array(z.string().max(40)).max(12).optional(),
  height_min_cm: heightCm,
  height_max_cm: heightCm,
  height_strength: strength,
  additional_notes: z.string().max(2000).nullable().optional(),
  // Strength turns an existing canonical preference into a genuine
  // non-negotiable. The ranges themselves are collected elsewhere.
  age_strength: strength.optional(),
  children_strength: strength.optional(),
  smoking_openness: openness.optional(),
  preferred_smoking: z.array(z.enum(["no", "occasionally", "yes"])).max(3).optional(),
  drinking_openness: openness.optional(),
  preferred_drinking: z.array(z.enum(["no", "rarely", "socially", "regularly"])).max(4).optional(),
});


export const structuredProfileInput = z.object({
  self: selfDescriptionInput.optional(),
  preferences: matchPreferencesInput.optional(),
});
