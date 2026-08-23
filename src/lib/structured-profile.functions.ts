// Member-facing read/write for structured self-description and match
// preferences. Everything is scoped to the authenticated member: no member
// ever reads another member's structured preferences.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { structuredProfileInput } from "./structured-profile.server";
import { EMPTY_PREFERENCES, EMPTY_SELF, sanitizeAdditionalNotes, type MatchPreferences, type SelfDescription } from "./structured-profile";
import { classifyBoundary } from "./boundaries";

export const getStructuredProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: prefs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("height_cm, ethnicities, ethnicity_self_describe, religions, religion_self_describe, smoking, drinking, hobbies, hobbies_note")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select(
          "ethnicity_openness, preferred_ethnicities, religion_openness, preferred_religions, height_min_cm, height_max_cm, height_strength, additional_notes, age_strength, children_strength, smoking_openness, preferred_smoking, drinking_openness, preferred_drinking",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    return {
      self: { ...EMPTY_SELF, ...(profile ?? {}) } as SelfDescription,
      preferences: { ...EMPTY_PREFERENCES, ...(prefs ?? {}) } as MatchPreferences,
    };
  });

export const saveStructuredProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => structuredProfileInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.self) {
      const { error } = await supabase
        .from("profiles")
        .update({
          height_cm: data.self.height_cm ?? null,
          ethnicities: data.self.ethnicities ?? [],
          ethnicity_self_describe: data.self.ethnicity_self_describe?.trim() || null,
          religions: data.self.religions ?? [],
          religion_self_describe: data.self.religion_self_describe?.trim() || null,
          smoking: data.self.smoking ?? null,
          drinking: data.self.drinking ?? null,
          hobbies: data.self.hobbies ?? [],
          hobbies_note: data.self.hobbies_note?.trim() || null,
        })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    }

    let notesTrimmed = false;
    if (data.preferences) {
      const p = data.preferences;
      const notes = sanitizeAdditionalNotes(p.additional_notes ?? null, classifyBoundary);
      notesTrimmed = notes.removed.length > 0;

      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: userId,
          ethnicity_openness: p.ethnicity_openness,
          preferred_ethnicities: p.ethnicity_openness === "open" || p.ethnicity_openness === "discuss_with_athena" ? [] : (p.preferred_ethnicities ?? []),
          religion_openness: p.religion_openness,
          preferred_religions: p.religion_openness === "open" || p.religion_openness === "discuss_with_athena" ? [] : (p.preferred_religions ?? []),
          height_min_cm: p.height_min_cm ?? null,
          height_max_cm: p.height_max_cm ?? null,
          height_strength: p.height_strength,
          additional_notes: notes.text,
          age_strength: p.age_strength ?? "preference",
          children_strength: p.children_strength ?? "preference",
          smoking_openness: p.smoking_openness ?? "open",
          preferred_smoking:
            !p.smoking_openness || p.smoking_openness === "open" || p.smoking_openness === "discuss_with_athena"
              ? []
              : (p.preferred_smoking ?? []),
          drinking_openness: p.drinking_openness ?? "open",
          preferred_drinking:
            !p.drinking_openness || p.drinking_openness === "open" || p.drinking_openness === "discuss_with_athena"
              ? []
              : (p.preferred_drinking ?? []),
        },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);

      if (notes.flaggedCategories.length > 0) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("safety_flags").insert({
          user_id: userId,
          category: notes.flaggedCategories[0]!,
          severity: "medium",
          detail: { source: "preferences_additional_notes", removed_count: notes.removed.length },
        });
      }
    }

    // A correction or removal changes what Athena may conclude about every pair
    // this member belongs to. Mark them stale so nothing rests on stale
    // constraint state; presentation re-reads constraints regardless.
    {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("pair_reasoning")
        .update({ is_stale: true, stale_reason: "structured profile changed" })
        .or(`user_low.eq.${userId},user_high.eq.${userId}`);
    }

    return { ok: true, notesTrimmed };
  });

