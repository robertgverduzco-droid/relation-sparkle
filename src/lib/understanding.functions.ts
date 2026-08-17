// Living Profile review + revision — thin wrapper.
// Logic lives in ./understanding.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { FACET_KEYS, FACET_LABELS, type FacetKey } from "./facets";
import {
  toFacetView,
  trimStatement,
  revisionPatch,
  mirrorPatch,
  revisionAcknowledgement,
  type FacetView,
} from "./understanding.server";

const reviseInput = z.object({
  facet_key: z.enum(FACET_KEYS),
  kind: z.enum(["change", "correction", "removal"]),
  statement: z.string().max(1200).optional(),
});

/** What Athena currently understands about *you*, in plain language. */
export const getMyUnderstanding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ facets: FacetView[] }> => {
    const { supabase, userId } = context;
    const [{ data: facetRows, error }, { data: revisions }] = await Promise.all([
      supabase
        .from("understanding_facets")
        .select("facet_key, understanding, confidence, evidence, refined_at")
        .eq("user_id", userId),
      supabase.from("understanding_revisions").select("facet_key").eq("user_id", userId),
    ]);
    if (error) throw new Error(error.message);

    const revised = new Set((revisions ?? []).map((r) => (r as { facet_key: string }).facet_key));
    const facets = (facetRows ?? [])
      .map((r) => toFacetView(r as never, revised))
      .filter((f) => f.understanding.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
    return { facets };
  });

/** Change / Correction / Removal (F-13). */
export const reviseUnderstanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reviseInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const statement = trimStatement(data.statement);
    if (data.kind !== "removal" && !statement) {
      throw new Error("Tell me in your own words what's true now, so I can hold it properly.");
    }

    const { data: current } = await supabase
      .from("understanding_facets")
      .select("understanding, confidence")
      .eq("user_id", userId)
      .eq("facet_key", data.facet_key)
      .maybeSingle();

    // The revision log itself: for Change and Correction it preserves the
    // superseded understanding as history. For Removal it must not, so the
    // prior text is deliberately omitted.
    const { error: logError } = await supabase.from("understanding_revisions").insert({
      user_id: userId,
      facet_key: data.facet_key,
      revision_kind: data.kind,
      member_statement: data.kind === "removal" ? null : statement,
      previous_understanding:
        data.kind === "removal"
          ? null
          : ((current as { understanding?: string | null } | null)?.understanding ?? null),
      previous_confidence:
        data.kind === "removal"
          ? null
          : ((current as { confidence?: number | null } | null)?.confidence ?? null),
    });
    if (logError) throw new Error(logError.message);

    if (data.kind === "removal") {
      // Destroy the understanding and its inference trail (F-13 Removal).
      await supabase
        .from("facet_history")
        .delete()
        .eq("user_id", userId)
        .eq("facet_key", data.facet_key);
      const { error } = await supabase
        .from("understanding_facets")
        .delete()
        .eq("user_id", userId)
        .eq("facet_key", data.facet_key);
      if (error) throw new Error(error.message);
    } else {
      const patch = revisionPatch(data.kind, statement);
      const { error } = await supabase
        .from("understanding_facets")
        .upsert(
          { user_id: userId, facet_key: data.facet_key, ...patch } as never,
          { onConflict: "user_id,facet_key" },
        );
      if (error) throw new Error(error.message);
      if (data.kind === "correction") {
        // A correction invalidates the historical inference trail that led to
        // the wrong understanding; the fact of the correction is kept instead.
        await supabase
          .from("facet_history")
          .delete()
          .eq("user_id", userId)
          .eq("facet_key", data.facet_key);
      }
    }

    // F-13 propagation: the denormalised Living Profile mirror on /profile must
    // never keep showing an understanding the member corrected or removed.
    const mirror = mirrorPatch(data.facet_key, data.kind, statement);
    if (mirror) {
      const { error: mirrorError } = await supabase
        .from("user_intelligence")
        .upsert({ user_id: userId, ...mirror } as never, { onConflict: "user_id" });
      if (mirrorError) throw new Error(mirrorError.message);
    }

    // Any pair reasoning built on the old understanding is now stale.
    await supabase
      .from("pair_reasoning")
      .update({ is_stale: true, stale_reason: "member revised their understanding" })
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    const label = FACET_LABELS[data.facet_key as FacetKey] ?? data.facet_key;
    return { ok: true as const, message: revisionAcknowledgement(data.kind, label) };
  });
