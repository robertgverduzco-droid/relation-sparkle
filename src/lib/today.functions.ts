// Today (Batch 3, screen 4) — Athena's own read of where the member is.
// Presentation-facing composition only: every field below is material she has
// already formed. Nothing is generated here, and nothing is written.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FACET_LABELS, type FacetKey } from "./facets";
import { memberVoice } from "./member-voice";

export type TodayHold = {
  label: string;
  /** Qualitative only — a number is never shown to a member (L4). */
  held: "Sure of it" | "Still forming" | "Only a guess";
  sure: boolean;
};

export type TodayShift = {
  when: string;
  text: string;
  /** The most recent shift carries the warm accent. */
  warm: boolean;
};

export type TodayRead = {
  lede: string | null;
  paragraphs: string[];
  shifts: TodayShift[];
  holding: TodayHold[];
};

const COUNT_WORDS = [
  "None",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** Small counts read as words on this surface; larger ones stay numeric. */
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

/** Relative day label, in Athena's register: "Yesterday", "Thursday", "Last week". */
export function whenLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Recently";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return then.toLocaleDateString(undefined, { weekday: "long" });
  if (days < 14) return "Last week";
  if (days < 31) return "Earlier this month";
  return "A while ago";
}

/** Confidence becomes plain language; the number never leaves the server. */
export function holdLevel(confidence: number | null): TodayHold["held"] {
  const c = typeof confidence === "number" ? confidence : 0;
  if (c >= 0.75) return "Sure of it";
  if (c >= 0.45) return "Still forming";
  return "Only a guess";
}

function paragraphsOf(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function facetLabel(key: string): string {
  return FACET_LABELS[key as FacetKey] ?? key.replace(/_/g, " ");
}

/** What Athena would say about where this member is, right now. */
export const getTodayRead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TodayRead> => {
    const { supabase, userId } = context;
    const [intelRes, facetsRes, historyRes, profileRes] = await Promise.all([
      supabase
        .from("user_intelligence")
        .select("self_understanding, readiness_summary")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("understanding_facets")
        .select("facet_key, understanding, confidence")
        .eq("user_id", userId),
      supabase
        .from("facet_history")
        .select("facet_key, understanding, refined_at")
        .eq("user_id", userId)
        .order("refined_at", { ascending: false })
        .limit(3),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);

    // A failed read must never be presented as "nothing formed yet" (the
    // Understanding precedent). Let it throw; the surface says so plainly.
    const firstError = intelRes.error ?? facetsRes.error ?? historyRes.error ?? profileRes.error;
    if (firstError) throw new Error(`today-read-failed: ${firstError.message}`);
    const intel = intelRes.data;
    const facets = facetsRes.data;
    const history = historyRes.data;

    const row = (intel ?? null) as {
      self_understanding?: string | null;
      readiness_summary?: string | null;
    } | null;
    // Athena's stored notes are written about the member in the third person
    // — her private analytical register. They are re-voiced here, at the
    // moment of display, so a member never reads a case file about themselves.
    const displayName =
      (profileRes.data as { display_name?: string | null } | null)?.display_name ?? null;
    const voiced = (t: string | null | undefined) => memberVoice(t, displayName);
    const parts = paragraphsOf(voiced(row?.self_understanding) ?? voiced(row?.readiness_summary) ?? null);

    const shifts: TodayShift[] = ((history ?? []) as Array<{
      facet_key: string;
      understanding: string | null;
      refined_at: string | null;
    }>)
      .filter((h) => (voiced(h.understanding) ?? "").length > 0)
      .map((h, i) => ({
        when: h.refined_at ? whenLabel(h.refined_at) : "Recently",
        text: voiced(h.understanding) ?? "",
        warm: i === 0,
      }));

    const holding: TodayHold[] = ((facets ?? []) as Array<{
      facet_key: string;
      understanding: string | null;
      confidence: number | null;
    }>)
      .filter((f) => (f.understanding ?? "").trim().length > 0)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 8)
      .map((f) => {
        const held = holdLevel(f.confidence);
        return { label: facetLabel(f.facet_key), held, sure: held === "Sure of it" };
      });

    return {
      lede: parts[0] ?? null,
      paragraphs: parts.slice(1, 4),
      shifts,
      holding,
    };
  });
