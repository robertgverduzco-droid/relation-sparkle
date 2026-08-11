// Post-restore deletion reconciliation.
//
// Called by the restore runbook (docs/security/RETENTION-AND-DELETION.md) and,
// optionally, on a schedule. Requires the operational shared secret; it
// returns counts only and never member-attributable data.
//
// `?mode=dry` reports what a replay would remove without removing it — the
// gate a restore must pass before the data returns to service.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/restore-reconcile")({
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
        const mode = new URL(request.url).searchParams.get("mode");
        const { replayDeletions } = await import("@/lib/restore-guard.server");
        const report = await replayDeletions("post_restore", { dryRun: mode === "dry" });
        return Response.json(report);
      },
    },
  },
});
