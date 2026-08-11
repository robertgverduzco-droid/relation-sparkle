# Monitoring, Capacity & Operational Awareness — v1.0

## Principle

The monitoring system is the source of truth. Athena reports what is measured
and says plainly when something is not measurable. She never estimates a
figure she cannot read, and she is never the only alert path.

## What is measured

`collectOpsReport()` in `src/lib/monitoring.server.ts` reads, per run:

| Metric | Source | Threshold |
| --- | --- | --- |
| Database bytes | `public.ops_db_stats()` (`pg_database_size`) | 60 / 75 / 90 % of the provisioned floor |
| Database connections | `pg_stat_activity` | 60 / 75 / 90 % of pool |
| Members, 7-day growth | `profiles` | informational |
| Athena requests (24h), tokens (24h) | `athena_usage_log` | informational (cost driver) |
| Messages (24h) | `messages` | informational (growth driver) |
| Stored photos | `user_photos` | informational |
| AI failure rate (24h) | `athena_usage_log.metadata.error` | 2 % warn / 10 % critical |
| Safety flags (24h) | `safety_flags` | > 20/day warn |
| Privileged actions (24h) | `admin_audit_log` | > 200/day warn |
| Notification failures (24h) | `notifications.delivery_status` | 2 % warn / 8 % critical |
| Completed deletions (7d) | `admin_audit_log` | informational |

## What is deliberately not measured

Reported as `unknown`, never estimated:

- **Backup age and success/failure** — not exposed to application code on the
  managed platform. Verified out-of-band per `RETENTION-AND-DELETION.md`.
- **Object-storage bytes and egress/bandwidth** — not queryable from the app
  runtime; the photo count is the only honest proxy.
- **Worker CPU time, invocations, function error rate** — live in the hosting
  platform's telemetry, not the database.

## Heartbeat

`POST /api/public/ops-heartbeat` with header `x-ops-secret: $OPS_HEARTBEAT_SECRET`
runs a check, writes an `ops_snapshots` row, and raises or resolves
`ops_alerts`. Call it every 15 minutes from an external scheduler. Missing
heartbeats are themselves the outage signal: snapshot age is visible in the
founder health summary.

## Alerting

Alerts are deduplicated by `metric_key:level` and stay open until the metric
returns to `ok`. `elevated` and `critical` alerts are POSTed to
`OPS_ALERT_WEBHOOK_URL` — service name, level, metric, value, threshold and
timestamp only. No member-attributable content ever leaves through this path.

## Secrets required

| Name | Purpose |
| --- | --- |
| `OPS_HEARTBEAT_SECRET` | shared secret for the scheduler; timing-safe compared |
| `OPS_ALERT_WEBHOOK_URL` | external alert destination (optional; alerts still persist without it) |

## Founder awareness

`founderHealthSummary()` feeds the Founder Dialogue prompt. Athena raises a
warning, elevated, or critical reading unprompted — once, calmly — then
returns to the question asked. Absence of an alert in conversation is never
evidence that the system is healthy.
