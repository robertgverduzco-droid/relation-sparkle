// Thin wrapper. All helpers/schemas live in ./introductions.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generalizeArea } from "./geography";
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

    // PRIVACY BOUNDARY: only approved member-facing fields are selected here.
    // Athena's internal cross-member reasoning (`reasoning`, `alignments`,
    // `complementary`, `frictions`, `hard_conflicts`) is derived partly from
    // the other member's private Living Profile and must never reach a
    // client. It is additionally unreadable at the database layer — the
    // `authenticated` role holds column-level SELECT on the approved columns
    // only. Server-side matchmaking (service role) is unaffected.
    const { data: pairs } = await supabase
      .from("pair_reasoning")
      .select(
        "id, user_low, user_high, status, confidence, presented_to_a_at, presented_to_b_at, last_reasoned_at",
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
    const pairIds = pairs.map((p) => p.id as string);

    // Presentations are per-side: `presentation_a` is written FOR user_low and
    // is the other member's material from user_high's point of view. Members
    // hold no column grant on either side (a row grant cannot distinguish
    // sides), so the correct side is selected here, server-side, after
    // membership is already proven by the RLS-scoped read above. Counterpart
    // display fields come the same way: `profiles` is owner-scoped by RLS.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: sides }, { data: profs }, { data: responses }] = await Promise.all([
      supabaseAdmin
        .from("pair_reasoning")
        .select("id, presentation_a, presentation_b")
        .in("id", pairIds),
      supabaseAdmin.from("profiles").select("id, display_name, city, region, birth_date").in("id", otherIds),
      supabase
        .from("introduction_responses")
        .select("pair_id, response")
        .eq("user_id", userId)
        .in("pair_id", pairIds),
    ]);

    const sideMap = new Map<string, { a: string | null; b: string | null }>();
    for (const s of sides ?? [])
      sideMap.set(s.id as string, {
        a: (s.presentation_a as string | null) ?? null,
        b: (s.presentation_b as string | null) ?? null,
      });

    // F-06: before mutual connection the counterpart is placed only by a
    // generalised area. The exact city never leaves the server here.
    const profMap = new Map<string, { display_name: string | null; area: string | null; birth_date: string | null }>();
    for (const p of profs ?? []) {
      profMap.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        area: generalizeArea(p.city as string | null, p.region as string | null),
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
        other_area: prof?.area ?? null,
        other_age: ageFromDob(prof?.birth_date ?? null),
        presentation: isLow
          ? (sideMap.get(p.id as string)?.a ?? null)
          : (sideMap.get(p.id as string)?.b ?? null),
        confidence: Number(p.confidence ?? 0),
        response: respMap.get(p.id as string) ?? "pending",
        presented_at: (isLow ? p.presented_to_a_at : p.presented_to_b_at) as string | null,
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

    // Outcome-learning (recording only): categorical, anonymized, no influence
    // on this or any future introduction decision.
    {
      const { emitOutcomeSignal } = await import("./learning.server");
      const both = {
        userA: pair.user_low as string,
        userB: pair.user_high as string,
      };
      if (data.response === "declined") {
        emitOutcomeSignal({
          ...both,
          kind: "introduction_declined",
          reason: "unspecified",
          dedupeKey: `${data.pair_id}:${userId}`,
        });
      } else if (connectionId) {
        emitOutcomeSignal({
          ...both,
          kind: "introduction_accepted_both",
          dedupeKey: data.pair_id,
        });
      }
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


// ---------------------------------------------------------------------------
// D-44 / F-33 — counterpart photography and attraction response.
// ---------------------------------------------------------------------------

const pairInput = z.object({ pair_id: z.string().uuid() });

export const getIntroductionPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => pairInput.parse(v))
  .handler(async ({ data, context }) => {
    const { counterpartForPresentedPair, loadCounterpartPhotos } = await import(
      "./attraction.server"
    );
    const otherId = await counterpartForPresentedPair(
      context.supabase,
      data.pair_id,
      context.userId,
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", otherId)
      .maybeSingle();
    const name = (prof?.display_name as string | null) ?? "Someone";
    const photos = await loadCounterpartPhotos(
      context.supabase,
      data.pair_id,
      context.userId,
      name,
    );
    return { photos };
  });

const attractionInput = z.object({
  pair_id: z.string().uuid(),
  response: z.enum(["drawn", "curious", "unsure", "not_there"]),
});

/**
 * A private, qualitative note to Athena about visual response. It is not a
 * rating of another human being, is never shown to the counterpart, and never
 * stands in for the accept / defer / decline decision.
 */
export const recordAttractionResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => attractionInput.parse(v))
  .handler(async ({ data, context }) => {
    const { counterpartForPresentedPair } = await import("./attraction.server");
    await counterpartForPresentedPair(context.supabase, data.pair_id, context.userId);
    await context.supabase.from("introduction_attraction").upsert(
      { pair_id: data.pair_id, user_id: context.userId, response: data.response },
      { onConflict: "pair_id,user_id" },
    );
    return { ok: true };
  });

export const getAttractionResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => pairInput.parse(v))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("introduction_attraction")
      .select("response")
      .eq("pair_id", data.pair_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { response: (row?.response as string | null) ?? null };
  });
