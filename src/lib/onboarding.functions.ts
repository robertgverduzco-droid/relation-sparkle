// A-08: onboarding state is account state, not member-editable content.
// The browser can no longer write `onboarding_stage` / `onboarding_completed_at`
// directly (the column grant was revoked); every advance runs through here,
// where the ordering and the minimum required information are enforced
// server-side for the authenticated member only.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { onboardingStepInput, nextStage, type OnboardingStage } from "./onboarding.server";

export const saveOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => onboardingStepInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_stage, display_name")
      .eq("id", userId)
      .maybeSingle();

    const current = ((profile?.onboarding_stage as string) ?? "welcome") as OnboardingStage;
    const next = nextStage(current, data.step);

    if (data.step === "identity") {
      const name = (data.identity?.display_name ?? "").trim();
      if (!name) throw new Error("Athena will need a name to call you by.");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: name,
          birth_date: data.identity?.birth_date || null,
          gender: data.identity?.gender || null,
          pronouns: data.identity?.pronouns || null,
          city: data.identity?.city || null,
        })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    }

    if (data.step === "preferences") {
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        seeking_genders: data.preferences?.seeking_genders ?? [],
        age_min: data.preferences?.age_min ?? null,
        age_max: data.preferences?.age_max ?? null,
        relationship_intent: data.preferences?.relationship_intent || null,
      });
      if (error) throw new Error(error.message);
    }

    // Completion requires the information the journey actually depends on —
    // a member cannot skip ahead by posting a stage.
    if (next === "complete") {
      const { data: check } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      if (!((check?.display_name as string | null) ?? "").trim()) {
        throw new Error("Athena will need a name to call you by.");
      }
    }

    const { error: stageError } = await supabaseAdmin
      .from("profiles")
      .update({
        onboarding_stage: next,
        onboarding_completed_at: next === "complete" ? new Date().toISOString() : null,
      })
      .eq("id", userId);
    if (stageError) throw new Error(stageError.message);

    return { ok: true, stage: next };
  });
