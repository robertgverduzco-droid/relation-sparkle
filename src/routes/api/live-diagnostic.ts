import { createFileRoute } from "@tanstack/react-router";

/**
 * Records why a live conversation failed in the browser, so the real technical
 * cause survives server-side while the member only ever sees a plain sentence.
 * No audio, no transcript, no member content — a failure kind and a short,
 * truncated technical detail only.
 */
export const Route = createFileRoute("/api/live-diagnostic")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, safeLog } = await import("@/lib/security.server");
        if (!rateLimit(`live-diag:${caller.userId}`, 20, 60_000)) {
          return new Response(null, { status: 204 });
        }

        try {
          const body = (await request.json()) as {
            reason?: unknown;
            detail?: unknown;
            stage?: unknown;
          };
          safeLog("live.failure", {
            reason: typeof body.reason === "string" ? body.reason.slice(0, 40) : "unknown",
            stage: typeof body.stage === "string" ? body.stage.slice(0, 40) : "unknown",
            detail: typeof body.detail === "string" ? body.detail.slice(0, 300) : "",
          });
        } catch {
          /* diagnostics are best-effort and never block the member */
        }
        return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
