// D-44 / F-33 — counterpart photography and attraction response.
//
// Server-only helpers. Two rules govern everything here:
//
//   1. Counterpart photographs are released only for a pair that has actually
//      been presented to the caller, and only while the caller has not passed.
//      The introduction boundary (F-37) is otherwise sealed: no Living Profile,
//      no reasoning, no counterpart metadata travels with the imagery.
//   2. An attraction response is private member understanding. It is never
//      readable by the person it concerns, never aggregated into an
//      attractiveness score for any human, and never a substitute for the
//      canonical accept / defer / decline decision.

import type { SupabaseClient } from "@supabase/supabase-js";

// D-07: five photographs is the canonical maximum, at every layer.
export const MAX_PHOTOS = 5;

export type AttractionResponse = "drawn" | "curious" | "unsure" | "not_there";

export const ATTRACTION_RESPONSES: readonly AttractionResponse[] = [
  "drawn",
  "curious",
  "unsure",
  "not_there",
];

export type CounterpartPhoto = {
  id: string;
  url: string;
  alt: string;
  is_primary: boolean;
};

/**
 * Confirm the caller is a member of this pair and that the introduction has
 * actually been presented to their side. Returns the counterpart's id.
 */
export async function counterpartForPresentedPair(
  supabase: SupabaseClient,
  pairId: string,
  userId: string,
): Promise<string> {
  const { data: pair } = await supabase
    .from("pair_reasoning")
    .select("id, user_low, user_high, presented_to_a_at, presented_to_b_at")
    .eq("id", pairId)
    .maybeSingle();

  if (!pair) throw new Error("Introduction not found");
  const isLow = pair.user_low === userId;
  const isHigh = pair.user_high === userId;
  if (!isLow && !isHigh) throw new Error("Not your introduction");
  if ((isLow && !pair.presented_to_a_at) || (isHigh && !pair.presented_to_b_at)) {
    throw new Error("Introduction has not been presented to you");
  }
  return (isLow ? pair.user_high : pair.user_low) as string;
}

/**
 * Accessible alternative for a counterpart photograph.
 *
 * Privacy and accessibility are resolved together: a member may write a short
 * description of their own photograph, which is the only description anyone
 * else ever hears. Athena never generates an appearance description of a human
 * being, and never infers one from the image. Absent a member description, the
 * alternative states what the image *is* — a photograph of this person — so a
 * screen-reader member is told the truth rather than an invented body.
 */
export function counterpartAlt(
  name: string,
  memberAlt: string | null,
  index: number,
  total: number,
): string {
  const own = (memberAlt ?? "").trim();
  if (own) return `${name}: ${own}`;
  return index === 0
    ? `A photograph ${name} chose to share.`
    : `A further photograph ${name} chose to share (${index + 1} of ${total}).`;
}

/**
 * Counterpart photographs for a presented introduction, primary first.
 * Never more than the canonical maximum; rejected imagery is excluded.
 */
export async function loadCounterpartPhotos(
  supabase: SupabaseClient,
  pairId: string,
  userId: string,
  name: string,
): Promise<CounterpartPhoto[]> {
  const otherId = await counterpartForPresentedPair(supabase, pairId, userId);

  // The caller declined: imagery is withdrawn along with the introduction.
  const { data: mine } = await supabase
    .from("introduction_responses")
    .select("response")
    .eq("pair_id", pairId)
    .eq("user_id", userId)
    .maybeSingle();
  if (mine?.response === "declined") return [];

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("user_photos")
    .select("id, storage_path, position, is_primary, alt_text, moderation")
    .eq("user_id", otherId)
    .neq("moderation", "rejected")
    .order("is_primary", { ascending: false })
    .order("position", { ascending: true })
    .limit(MAX_PHOTOS);

  const list = rows ?? [];
  const out: CounterpartPhoto[] = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i]!;
    const { data: signed } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUrl(r.storage_path as string, 3600);
    if (!signed?.signedUrl) continue;
    out.push({
      id: r.id as string,
      url: signed.signedUrl,
      alt: counterpartAlt(name, (r.alt_text as string | null) ?? null, i, list.length),
      is_primary: i === 0,
    });
  }
  return out;
}
