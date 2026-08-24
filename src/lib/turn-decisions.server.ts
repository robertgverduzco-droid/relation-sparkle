/**
 * RUNTIME OBSERVABILITY — de-identified.
 *
 * A founder needs to be able to see WHAT Athena decided, not what anyone
 * said. This records one row per member-facing turn: the conversational event
 * she recognised, the register she was operating in, whether a product notice
 * was held back for a seam, and which internal calibration material was used.
 *
 * Never recorded: conversation text, member identity, facets, or anything a
 * person could be recognised from. The actor hash is one-way and exists only
 * so aggregate counts are not double-weighted by a single talkative member.
 *
 * Service-role only: `athena_turn_decisions` has no grants and no policies.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (t: string) => any };
}

export type TurnDecisionRecord = {
  actorHash: string;
  event: string;
  surface?: "text" | "voice";
  humorLevel: string;
  seriousMoment: boolean;
  /** A product notice was due this turn and was deferred to a later seam. */
  noticeDeferred: boolean;
  atlasIds: string[];
  exemplarIds: string[];
  provenance: boolean;
};

export async function recordTurnDecision(input: TurnDecisionRecord): Promise<void> {
  const writer = await admin();
  await writer.from("athena_turn_decisions").insert({
    actor_hash: input.actorHash,
    event: input.event,
    surface: input.surface ?? "text",
    humor_level: input.humorLevel,
    serious_moment: input.seriousMoment,
    notice_deferred: input.noticeDeferred,
    atlas_ids: input.atlasIds,
    exemplar_ids: input.exemplarIds,
    provenance: input.provenance,
  });
}

export type DecisionRow = {
  event: string;
  humor_level: string;
  serious_moment: boolean;
  notice_deferred: boolean;
  atlas_ids: string[] | null;
};

export type DecisionSummary = {
  turns: number;
  events: Array<{ event: string; count: number; share: number }>;
  registers: Array<{ level: string; count: number; share: number }>;
  seriousShare: number;
  noticesDeferred: number;
  atlasTopics: Array<{ id: string; count: number }>;
};

/** Pure aggregation, so it stays testable without the database. */
export function summariseDecisions(rows: DecisionRow[]): DecisionSummary {
  const turns = rows.length;
  const share = (n: number) => (turns === 0 ? 0 : Math.round((n / turns) * 1000) / 1000);

  const tally = (get: (r: DecisionRow) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(get(r), (m.get(get(r)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const atlas = new Map<string, number>();
  for (const r of rows) for (const id of r.atlas_ids ?? []) atlas.set(id, (atlas.get(id) ?? 0) + 1);

  return {
    turns,
    events: tally((r) => r.event).map(([event, count]) => ({ event, count, share: share(count) })),
    registers: tally((r) => r.humor_level).map(([level, count]) => ({
      level,
      count,
      share: share(count),
    })),
    seriousShare: share(rows.filter((r) => r.serious_moment).length),
    noticesDeferred: rows.filter((r) => r.notice_deferred).length,
    atlasTopics: [...atlas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([id, count]) => ({ id, count })),
  };
}

export async function decisionAnalytics(): Promise<DecisionSummary> {
  const reader = await admin();
  const { data } = await reader
    .from("athena_turn_decisions")
    .select("event, humor_level, serious_moment, notice_deferred, atlas_ids")
    .order("created_at", { ascending: false })
    .limit(50000);
  return summariseDecisions((data ?? []) as DecisionRow[]);
}
