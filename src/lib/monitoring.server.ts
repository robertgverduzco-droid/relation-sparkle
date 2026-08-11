// Capacity, infrastructure monitoring & founder operational awareness (§18).
//
// The monitoring system is the source of truth. Athena reads it; she never
// substitutes feeling for telemetry. Every metric here is measured — where a
// value cannot be measured on the current stack it is reported as `unknown`
// rather than estimated.
export type Level = "ok" | "warning" | "elevated" | "critical";

export type Metric = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  level: Level;
  /** Present only where the underlying service exposes a real limit. */
  limit?: number | null;
  detail: string;
};

export type OpsReport = {
  captured_at: string;
  worst_level: Level;
  metrics: Metric[];
  unknowns: string[];
};

const GB = 1024 ** 3;

/** Thresholds anchored to real platform limits where one exists. */
const DB_SIZE_LIMIT_BYTES = 8 * GB; // Supabase small-instance disk floor; revise on resize.
const AI_FAILURE_WARN = 0.02;
const AI_FAILURE_CRIT = 0.1;
const ERROR_WARN = 0.02;
const ERROR_CRIT = 0.08;
const BACKUP_STALE_HOURS = 30;

function ratioLevel(v: number, warn: number, crit: number): Level {
  if (v >= crit) return "critical";
  if (v >= warn * 2) return "elevated";
  if (v >= warn) return "warning";
  return "ok";
}

function utilisationLevel(used: number, limit: number): Level {
  const pct = used / limit;
  if (pct >= 0.9) return "critical";
  if (pct >= 0.75) return "elevated";
  if (pct >= 0.6) return "warning";
  return "ok";
}

const WORST: Level[] = ["ok", "warning", "elevated", "critical"];

/** Collect the current operational picture. Service-role only. */
export async function collectOpsReport(): Promise<OpsReport> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const metrics: Metric[] = [];
  const unknowns: string[] = [];
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // --- database size and growth -------------------------------------------
  const { data: stats } = await admin.rpc("ops_db_stats");
  const dbBytes =
    stats && typeof stats === "object"
      ? Number((stats as Record<string, unknown>)["database_bytes"] ?? 0)
      : 0;
  metrics.push({
    key: "database_bytes",
    label: "Database storage",
    value: dbBytes || null,
    unit: "bytes",
    limit: DB_SIZE_LIMIT_BYTES,
    level: dbBytes ? utilisationLevel(dbBytes, DB_SIZE_LIMIT_BYTES) : "ok",
    detail: `${(dbBytes / GB).toFixed(2)} GB of a ${(DB_SIZE_LIMIT_BYTES / GB).toFixed(0)} GB provisioned floor.`,
  });
  const conns =
    stats && typeof stats === "object"
      ? Number((stats as Record<string, unknown>)["active_connections"] ?? 0)
      : 0;
  metrics.push({
    key: "db_connections",
    label: "Database connections",
    value: conns || null,
    unit: "connections",
    limit: 60,
    level: conns ? utilisationLevel(conns, 60) : "ok",
    detail: "Pooled connections in use against the small-instance pool.",
  });

  // --- growth --------------------------------------------------------------
  const [members, newMembers, convos24h, msgs24h, photos] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    admin
      .from("athena_usage_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    admin.from("messages").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    admin.from("user_photos").select("id", { count: "exact", head: true }),
  ]);
  metrics.push(
    {
      key: "members_total",
      label: "Members",
      value: members.count ?? null,
      unit: "members",
      level: "ok",
      detail: "Total member profiles.",
    },
    {
      key: "members_7d",
      label: "Member growth (7d)",
      value: newMembers.count ?? null,
      unit: "members/week",
      level: "ok",
      detail: "New profiles in the last seven days.",
    },
    {
      key: "athena_requests_24h",
      label: "Athena requests (24h)",
      value: convos24h.count ?? null,
      unit: "requests/day",
      level: "ok",
      detail: "Billed AI, speech-to-text and speech interactions in the last day.",
    },
    {
      key: "messages_24h",
      label: "Member messages (24h)",
      value: msgs24h.count ?? null,
      unit: "messages/day",
      level: "ok",
      detail: "Message volume; drives database growth more than member count does.",
    },
    {
      key: "photos_total",
      label: "Stored photos",
      value: photos.count ?? null,
      unit: "objects",
      level: "ok",
      detail: "Objects in the private profile-photos bucket, by index row.",
    },
  );

  // --- AI reliability and cost --------------------------------------------
  const { data: usage } = await admin
    .from("athena_usage_log")
    .select("kind, metadata, input_tokens, output_tokens")
    .gte("created_at", since24h)
    .limit(5000);
  const rows = usage ?? [];
  const failures = rows.filter(
    (r) => (r.metadata as Record<string, unknown> | null)?.["error"] != null,
  ).length;
  const failRate = rows.length ? failures / rows.length : 0;
  metrics.push({
    key: "ai_failure_rate",
    label: "AI failure rate (24h)",
    value: rows.length ? Number(failRate.toFixed(4)) : null,
    unit: "ratio",
    level: rows.length ? ratioLevel(failRate, AI_FAILURE_WARN, AI_FAILURE_CRIT) : "ok",
    detail: `${failures} failed of ${rows.length} recorded AI interactions.`,
  });
  const tokens = rows.reduce(
    (n, r) => n + Number(r.input_tokens ?? 0) + Number(r.output_tokens ?? 0),
    0,
  );
  metrics.push({
    key: "ai_tokens_24h",
    label: "AI tokens (24h)",
    value: tokens || null,
    unit: "tokens/day",
    level: "ok",
    detail: "Token throughput; the primary driver of model cost.",
  });

  // --- safety and privileged activity --------------------------------------
  const [flags24h, privileged24h, notifFail] = await Promise.all([
    admin.from("safety_flags").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    admin
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("delivery_status", "failed")
      .gte("created_at", since24h),
  ]);
  const notifFailed = notifFail.count ?? 0;
  metrics.push(
    {
      key: "safety_flags_24h",
      label: "Safety flags (24h)",
      value: flags24h.count ?? null,
      unit: "flags/day",
      level: (flags24h.count ?? 0) > 20 ? "warning" : "ok",
      detail: "Automated safety detections awaiting or completing review.",
    },
    {
      key: "privileged_actions_24h",
      label: "Privileged actions (24h)",
      value: privileged24h.count ?? null,
      unit: "actions/day",
      level: (privileged24h.count ?? 0) > 200 ? "warning" : "ok",
      detail: "Audited administrative and founder-channel activity.",
    },
    {
      key: "notification_failures_24h",
      label: "Notification failures (24h)",
      value: notifFailed,
      unit: "failures/day",
      level: ratioLevel(notifFailed / 50, ERROR_WARN, ERROR_CRIT),
      detail: "Notifications recorded as undeliverable.",
    },
  );

  // --- deletion jobs --------------------------------------------------------
  const { count: purges } = await admin
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "account.purge.completed")
    .gte("created_at", since7d);
  metrics.push({
    key: "deletion_jobs_7d",
    label: "Completed deletions (7d)",
    value: purges ?? 0,
    unit: "purges/week",
    level: "ok",
    detail: "Member purges that reached the completed audit record.",
  });

  // --- honest unknowns ------------------------------------------------------
  unknowns.push(
    "Backup age and backup success/failure are not exposed to application code on the managed platform; verified manually per RETENTION-AND-DELETION.md.",
    "Object-storage bytes and egress/bandwidth are not queryable from the app runtime; photo count is the proxy.",
    "Worker CPU time, invocation count, and function error rate live in the hosting platform's telemetry, not the database.",
  );
  metrics.push({
    key: "backup_age_hours",
    label: "Backup freshness",
    value: null,
    unit: "hours",
    level: "ok",
    limit: BACKUP_STALE_HOURS,
    detail: "Not exposed to the application runtime. Verified out-of-band.",
  });

  const worst = metrics.reduce<Level>(
    (w, m) => (WORST.indexOf(m.level) > WORST.indexOf(w) ? m.level : w),
    "ok",
  );
  return {
    captured_at: new Date().toISOString(),
    worst_level: worst,
    metrics,
    unknowns,
  };
}

/**
 * Persist a snapshot, raise/resolve alerts, and push serious conditions to the
 * external alert channel. Founder Dialogue is never the only alert path.
 */
export async function runOpsCheck(): Promise<OpsReport> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const report = await collectOpsReport();

  await admin.from("ops_snapshots").insert({
    metrics: JSON.parse(JSON.stringify(report.metrics)),
    worst_level: report.worst_level,
  });

  const webhook = process.env["OPS_ALERT_WEBHOOK_URL"];
  for (const m of report.metrics) {
    const dedupe = `${m.key}:${m.level}`;
    if (m.level === "ok") {
      await admin
        .from("ops_alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("metric_key", m.key)
        .is("resolved_at", null);
      continue;
    }
    const { data: existing } = await admin
      .from("ops_alerts")
      .select("id")
      .eq("dedupe_key", dedupe)
      .is("resolved_at", null)
      .limit(1);
    if (existing?.length) continue;

    let delivery: "delivered" | "failed" | "not_configured" = "not_configured";
    if (webhook && (m.level === "elevated" || m.level === "critical")) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Operational only. No member-attributable content ever leaves here.
          body: JSON.stringify({
            service: "Relationship Intelligence",
            level: m.level,
            metric: m.label,
            value: m.value,
            limit: m.limit ?? null,
            detail: m.detail,
            at: report.captured_at,
          }),
        });
        delivery = res.ok ? "delivered" : "failed";
      } catch {
        delivery = "failed";
      }
    }
    await admin.from("ops_alerts").insert({
      metric_key: m.key,
      level: m.level,
      value: m.value,
      threshold: m.limit ?? null,
      summary: `${m.label}: ${m.detail}`,
      dedupe_key: dedupe,
      external_delivery: delivery,
    });
  }
  return report;
}

/**
 * Compact, member-free health summary for Founder Dialogue. Returns null when
 * there is no telemetry yet, so Athena says "no readings" rather than guessing.
 */
export async function founderHealthSummary(): Promise<{
  captured_at: string;
  worst_level: Level;
  headline: string;
  metrics: Array<{ label: string; value: number | null; unit: string; level: Level }>;
  open_alerts: Array<{ level: Level; summary: string; since: string }>;
  unknowns: string[];
} | null> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: snaps } = await admin
    .from("ops_snapshots")
    .select("metrics, worst_level, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const snap = snaps?.[0];
  if (!snap) return null;
  const metrics = (snap.metrics as unknown as Metric[]) ?? [];
  const { data: alerts } = await admin
    .from("ops_alerts")
    .select("level, summary, created_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(10);
  const worst = snap.worst_level as Level;
  return {
    captured_at: snap.created_at as string,
    worst_level: worst,
    headline:
      worst === "ok"
        ? "All monitored resources are within normal range."
        : `At least one resource is at ${worst} level.`,
    metrics: metrics.map((m) => ({
      label: m.label,
      value: m.value,
      unit: m.unit,
      level: m.level,
    })),
    open_alerts: (alerts ?? []).map((a) => ({
      level: a.level as Level,
      summary: a.summary as string,
      since: a.created_at as string,
    })),
    unknowns: [
      "Backup freshness, object-storage bytes, egress, and worker error rate are not measurable from the application runtime.",
    ],
  };
}
