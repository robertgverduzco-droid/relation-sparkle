// Thin wrapper. All helpers/schemas live in ./introductions.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ageFromDob, runMatchmakingForUser } from "./introductions.server";

export const considerIntroductions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Manual trigger from the UI. Force past the cooldown since the user
    // explicitly asked Athena to reconsider.
    return runMatchmakingForUser(context.userId, { force: true });
  });

export const listMyIntroductions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: pairs } = await supabase
      .from("pair_reasoning")
      .select(
        "id, user_low, user_high, status, confidence, presentation_a, presentation_b, presented_to_a_at, presented_to_b_at, last_reasoned_at, alignments, complementary, frictions",
      )
      .or(
        `and(user_low.eq.${userId},presented_to_a_at.not.is.null),and(user_high.eq.${userId},presented_to_b_at.not.is.null)`,
      )
      .order("last_reasoned_at", { ascending: false })
      .limit(20);

    if (!pairs || pairs.length === 0) return { introductions: [] };

    const otherIds = pairs.map((p) =>
      (p.user_low as string) === userId ? (p.user_high as string) : (p.user_low as string),
    );
    const [{ data: profs }, { data: responses }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, city, birth_date").in("id", otherIds),
      supabase
        .from("introduction_responses")
        .select("pair_id, response")
        .eq("user_id", userId)
        .in("pair_id", pairs.map((p) => p.id as string)),
    ]);

    const profMap = new Map<string, { display_name: string | null; city: string | null; birth_date: string | null }>();
    for (const p of profs ?? []) {
      profMap.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        city: (p.city as string | null) ?? null,
        birth_date: (p.birth_date as string | null) ?? null,
      });
    }
    const respMap = new Map<string, string>();
    for (const r of responses ?? []) respMap.set(r.pair_id as string, r.response as string);

    const shape = pairs.map((p) => {
      const isLow = p.user_low === userId;
      const otherId = isLow ? (p.user_high as string) : (p.user_low as string);
      const prof = profMap.get(otherId);
      return {
        id: p.id as string,
        other_id: otherId,
        other_name: prof?.display_name ?? "Someone",
        other_city: prof?.city ?? null,
        other_age: ageFromDob(prof?.birth_date ?? null),
        presentation: isLow ? (p.presentation_a as string | null) : (p.presentation_b as string | null),
        confidence: Number(p.confidence ?? 0),
        response: respMap.get(p.id as string) ?? "pending",
        presented_at: (isLow ? p.presented_to_a_at : p.presented_to_b_at) as string | null,
        alignments: (p.alignments ?? []) as string[],
        complementary: (p.complementary ?? []) as string[],
        frictions: (p.frictions ?? []) as string[],
      };
    });

    return { introductions: shape };
  });

const respondInput = z.object({
  pair_id: z.string().uuid(),
  response: z.enum(["accepted", "declined", "deferred"]),
  note: z.string().max(500).optional(),
});

export const respondToIntroduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => respondInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pair } = await supabase
      .from("pair_reasoning")
      .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
      .eq("id", data.pair_id)
      .maybeSingle();

    if (!pair) throw new Error("Introduction not found");
    const isLow = pair.user_low === userId;
    const isHigh = pair.user_high === userId;
    if (!isLow && !isHigh) throw new Error("Not your introduction");
    if ((isLow && !pair.presented_to_a_at) || (isHigh && !pair.presented_to_b_at)) {
      throw new Error("Introduction has not been presented to you");
    }

    await supabase.from("introduction_responses").upsert(
      { pair_id: data.pair_id, user_id: userId, response: data.response, note: data.note ?? null },
      { onConflict: "pair_id,user_id" },
    );

    await supabase.from("introduction_feedback").insert({
      pair_id: data.pair_id,
      user_id: userId,
      kind: data.response,
      perspective: data.note ?? null,
      signals: {},
    });

    let connectionId: string | null = null;
    if (data.response === "accepted") {
      const { openConnectionIfMutual } = await import("./connections.server");
      connectionId = await openConnectionIfMutual(supabase, data.pair_id);
    }

    // Any response (accept / decline / defer) can change available capacity
    // for either user. Re-evaluate matchmaking for both sides — the
    // 3-active-cap and cooldown inside runMatchmakingForUser protect against
    // thrash. If mutual acceptance opened a connection, the pair is out of
    // the intro pool and slots may have freed up.
    const otherId = (isLow ? pair.user_high : pair.user_low) as string;
    void runMatchmakingForUser(userId).catch(() => {});
    void runMatchmakingForUser(otherId).catch(() => {});

    return { ok: true, connection_id: connectionId };
  });

