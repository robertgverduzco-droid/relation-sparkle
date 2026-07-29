// Moderator-only report review workflow.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertModerator(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
  if (error) throw new Error("Role check failed");
  const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data && !adminCheck) throw new Error("Forbidden");
}

export const amIModerator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: mod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
    const { data: admin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return { moderator: Boolean(mod || admin) };
  });

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertModerator(supabase, userId);
    const { data: reports } = await supabase
      .from("reports")
      .select("id, reporter_id, reported_id, conversation_id, category, details, severity, status, resolved_at, resolution_note, created_at")
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
  });

const resolveInput = z.object({
  report_id: z.string().uuid(),
  action: z.enum(["dismiss", "suspend", "ban"]),
  note: z.string().max(1000).optional(),
});

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => resolveInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.deleteUser(reportedId);
    }
    return { ok: true };
  });
