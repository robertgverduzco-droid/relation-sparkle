// Moderation runtime logic. Never imported by client components — only by
// the thin server-function wrapper in ./moderation.functions.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export const resolveInput = z.object({
  report_id: z.string().uuid(),
  action: z.enum(["dismiss", "suspend", "ban"]),
  note: z.string().max(1000).optional(),
});

export type ResolveInput = z.infer<typeof resolveInput>;

export type ModerationReport = {
  id: string;
  reporter_name: string;
  reported_id: string;
  reported_name: string;
  category: string;
  details: string | null;
  severity: string;
  status: string;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

/** True when the caller holds the moderator or admin role. */
export async function isModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const [{ data: mod }, { data: admin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  return Boolean(mod || admin);
}

export async function assertModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  if (!(await isModerator(supabase, userId))) throw new Error("Forbidden");
}

export async function listReports(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ reports: ModerationReport[] }> {
  await assertModerator(supabase, userId);
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, reported_id, conversation_id, category, details, severity, status, resolved_at, resolution_note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = new Set<string>();
  for (const r of reports ?? []) {
    ids.add(r.reporter_id as string);
    ids.add(r.reported_id as string);
  }
  const { data: profs } = ids.size
    ? await supabase.from("profiles").select("id, display_name").in("id", Array.from(ids))
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameOf = new Map<string, string>();
  for (const p of profs ?? []) nameOf.set(p.id as string, (p.display_name as string | null) ?? "Someone");

  return {
    reports: (reports ?? []).map((r) => ({
      id: r.id as string,
      reporter_name: nameOf.get(r.reporter_id as string) ?? "Someone",
      reported_id: r.reported_id as string,
      reported_name: nameOf.get(r.reported_id as string) ?? "Someone",
      category: r.category as string,
      details: r.details as string | null,
      severity: r.severity as string,
      status: r.status as string,
      resolved_at: r.resolved_at as string | null,
      resolution_note: r.resolution_note as string | null,
      created_at: r.created_at as string,
    })),
  };
}

/** Resolve a report. Suspension pauses the account; ban deletes it. */
export async function resolveReportForModerator(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: ResolveInput,
): Promise<{ ok: true }> {
  await assertModerator(supabase, userId);

  const { data: report, error: rErr } = await supabase
    .from("reports")
    .update({
      status: data.action === "dismiss" ? "dismissed" : "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_note: data.note ?? null,
    })
    .eq("id", data.report_id)
    .select("reported_id")
    .maybeSingle();
  if (rErr || !report) throw new Error(rErr?.message ?? "Report not found");

  const reportedId = report.reported_id as string;
  if (data.action === "suspend") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_paused: true }).eq("id", reportedId);
  } else if (data.action === "ban") {
    const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
    await purgeMemberAndDeleteAuthUser(reportedId);
  }
  return { ok: true };
}
