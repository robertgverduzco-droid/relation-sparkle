// Operational heartbeat. Called by an external scheduler (pg_cron or an
// uptime service) on a fixed interval. Requires a shared secret; it never
// returns member-attributable data and never accepts member input.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/ops-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["OPS_HEARTBEAT_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const provided = request.headers.get("x-ops-secret") ?? "";
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runOpsCheck } = await import("@/lib/monitoring.server");
        const report = await runOpsCheck();
        return Response.json({
          captured_at: report.captured_at,
          worst_level: report.worst_level,
          alerts: report.metrics.filter((m) => m.level !== "ok").map((m) => m.key),
        });
      },
    },
  },
});
