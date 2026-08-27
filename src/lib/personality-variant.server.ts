// Server-side resolver for the warmth A/B experiment. Reads the founder-
// controlled override table (service_role only — members cannot read or set
// their own variant) and returns the tone guidance to append to Athena's
// system prompt. Any failure resolves to "standard": the experiment must
// never break a real conversation.
import { isPersonalityVariant, PERSONALITY_VARIANTS, type PersonalityVariant } from "./personality-variants";

export async function resolvePersonalityVariant(userId: string | null | undefined): Promise<PersonalityVariant> {
  if (!userId) return "standard";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("personality_variant_overrides")
      .select("variant")
      .eq("user_id", userId)
      .maybeSingle();
    return isPersonalityVariant(data?.variant) ? data.variant : "standard";
  } catch {
    return "standard";
  }
}

/** Tone guidance block for the account's active variant ("" for standard). */
export async function variantToneGuidance(userId: string | null | undefined): Promise<string> {
  const variant = await resolvePersonalityVariant(userId);
  return PERSONALITY_VARIANTS[variant].toneGuidance;
}
