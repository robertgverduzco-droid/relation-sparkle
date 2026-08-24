/**
 * THE CLOSET — experiment instrumentation (pure).
 *
 * This is an experiment, not a product. The metrics exist to answer a small
 * set of founder questions honestly; nothing here is a target, and Athena is
 * never optimised toward clicks.
 */

export type ClosetKind = "closet_impression" | "closet_click";

/** Where the interaction happened. Never conversation text. */
export type ClosetSurface = "conversation" | "live" | "ui" | "member_asked";

export type ClosetEvent = {
  user_id: string;
  kind: ClosetKind;
  surface: ClosetSurface;
  had_rapport: boolean;
  session_id?: string | null;
  created_at?: string;
};

export type ClosetMetrics = {
  impressions: number;
  clicks: number;
  uniqueShown: number;
  uniqueClicked: number;
  /** clicks ÷ impressions, 0 when nothing has been shown. */
  clickThroughRate: number;
  /** members with >1 click ÷ members with any click. */
  repeatClickRate: number;
  bySurface: Array<{ surface: ClosetSurface; impressions: number; clicks: number }>;
  /** Does engagement rise once rapport already exists? */
  rapport: {
    withRapport: { impressions: number; clicks: number; clickThroughRate: number };
    withoutRapport: { impressions: number; clicks: number; clickThroughRate: number };
  };
  /** Members who brought the closet up themselves — a possible phenomenon. */
  memberInitiated: { events: number; uniqueMembers: number };
};

const rate = (n: number, d: number) => (d > 0 ? n / d : 0);

export function closetMetrics(events: ClosetEvent[]): ClosetMetrics {
  const shown = new Set<string>();
  const clickCounts = new Map<string, number>();
  const surfaces = new Map<ClosetSurface, { impressions: number; clicks: number }>();
  const initiated = new Set<string>();

  let impressions = 0;
  let clicks = 0;
  let rImp = 0;
  let rClick = 0;
  let nImp = 0;
  let nClick = 0;
  let initiatedEvents = 0;

  for (const e of events) {
    const bucket = surfaces.get(e.surface) ?? { impressions: 0, clicks: 0 };
    const click = e.kind === "closet_click";

    if (click) {
      clicks += 1;
      bucket.clicks += 1;
      clickCounts.set(e.user_id, (clickCounts.get(e.user_id) ?? 0) + 1);
      if (e.had_rapport) rClick += 1;
      else nClick += 1;
    } else {
      impressions += 1;
      bucket.impressions += 1;
      shown.add(e.user_id);
      if (e.had_rapport) rImp += 1;
      else nImp += 1;
    }

    if (e.surface === "member_asked") {
      initiatedEvents += 1;
      initiated.add(e.user_id);
    }
    surfaces.set(e.surface, bucket);
  }

  const clickers = [...clickCounts.values()];
  const repeaters = clickers.filter((c) => c > 1).length;

  return {
    impressions,
    clicks,
    uniqueShown: shown.size,
    uniqueClicked: clickCounts.size,
    clickThroughRate: rate(clicks, impressions),
    repeatClickRate: rate(repeaters, clickers.length),
    bySurface: [...surfaces.entries()].map(([surface, v]) => ({ surface, ...v })),
    rapport: {
      withRapport: { impressions: rImp, clicks: rClick, clickThroughRate: rate(rClick, rImp) },
      withoutRapport: { impressions: nImp, clicks: nClick, clickThroughRate: rate(nClick, nImp) },
    },
    memberInitiated: { events: initiatedEvents, uniqueMembers: initiated.size },
  };
}

/**
 * Founder insight rather than automatic expansion: if members start asking
 * about the closet on their own, that is something to look at, not a signal
 * to ship a button.
 */
export function closetPhenomenonNote(m: ClosetMetrics): string | null {
  if (m.memberInitiated.uniqueMembers < 5) return null;
  return `${m.memberInitiated.uniqueMembers} members have brought the closet up themselves. Worth understanding before anything is expanded — it is an experiment, not a feature.`;
}
