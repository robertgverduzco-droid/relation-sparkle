// THE CLOSET — server IO for the experiment.
//
// Service-role only: `athena_closet_events` has no grants and no policies.
// Nothing sensitive is written here — no conversation text, ever.

import { closetMetrics, closetPhenomenonNote, type ClosetEvent, type ClosetKind, type ClosetSurface } from "./closet";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (t: string) => any };
}

export async function recordClosetEvent(input: {
  userId: string;
  kind: ClosetKind;
  surface: ClosetSurface;
  hadRapport: boolean;
  sessionId?: string | null;
}): Promise<{ ok: true }> {
  const writer = await admin();
  await writer.from("athena_closet_events").insert({
    user_id: input.userId,
    kind: input.kind,
    surface: input.surface,
    had_rapport: input.hadRapport,
    session_id: input.sessionId ?? null,
  });
  return { ok: true };
}

export async function closetAnalytics() {
  const reader = await admin();
  const { data } = await reader
    .from("athena_closet_events")

    .select("user_id, kind, surface, had_rapport, created_at")
    .order("created_at", { ascending: false })
    .limit(50000);

  const events = (data ?? []) as ClosetEvent[];
  const metrics = closetMetrics(events);
  return { metrics, phenomenon: closetPhenomenonNote(metrics) };
}
