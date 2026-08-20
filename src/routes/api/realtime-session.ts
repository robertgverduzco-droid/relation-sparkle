import { createFileRoute } from "@tanstack/react-router";

/**
 * Mints a short-lived client secret for Athena's Live Conversation mode.
 * The long-lived provider key never reaches the browser: the client receives
 * only an ephemeral token bound to this pre-configured session.
 */
export const Route = createFileRoute("/api/realtime-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, assertFeatureEnabled } = await import("@/lib/security.server");
        await assertFeatureEnabled("athena_conversation");
        if (!rateLimit(`live:${caller.userId}`, 12, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("Live conversation is not configured", { status: 503 });

        const { buildLiveInstructions, liveSessionConfig } = await import(
          "@/lib/athena-live.server"
        );
        const accessToken = (request.headers.get("authorization") ?? "").slice(7);
        const instructions = await buildLiveInstructions(accessToken);

        const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(liveSessionConfig(instructions)),
        });

        if (!res.ok) {
          const { safeLog } = await import("@/lib/security.server");
          safeLog("live.session.failed", { status: res.status });
          return new Response("Live conversation is unavailable right now", { status: 502 });
        }

        const body = (await res.json()) as { value?: string; expires_at?: number };
        if (!body.value) return new Response("Live conversation is unavailable right now", { status: 502 });

        return Response.json(
          { clientSecret: body.value, expiresAt: body.expires_at ?? null },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
