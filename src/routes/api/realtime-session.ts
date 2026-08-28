import { createFileRoute } from "@tanstack/react-router";

/**
 * Opens a live conversation against Athena's registered ElevenLabs Speech
 * Engine. The browser receives only a short-lived, single-conversation token;
 * the provider key never reaches it.
 *
 * Athena's mind is not on the other end of this token — ElevenLabs is. It
 * calls back into /api/speech-engine/ws for every turn, which is why the
 * member is bound to the conversation id here, before the call begins.
 */
export const Route = createFileRoute("/api/realtime-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, assertFeatureEnabled, safeLog } = await import("@/lib/security.server");
        await assertFeatureEnabled("athena_conversation");
        if (!rateLimit(`live:${caller.userId}`, 12, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        const { elevenApiKey, mintConversationToken, recordLiveGrant } = await import(
          "@/lib/live-voice.server"
        );
        const key = elevenApiKey();
        if (!key) return new Response("Live conversation is not configured", { status: 503 });

        const accessToken = (request.headers.get("authorization") ?? "").slice(7);
        if (!accessToken) return new Response("Unauthorized", { status: 401 });

        // The renewal credential is what lets a long call stay authenticated
        // after the starting access token ages out. It is stored only on the
        // service-role grant row and deleted when the call ends.
        const body = (await request.json().catch(() => ({}))) as { refreshToken?: unknown };
        const refreshToken =
          typeof body.refreshToken === "string" && body.refreshToken ? body.refreshToken : null;

        const minted = await mintConversationToken(key);
        if (!minted) {
          safeLog("live.session.failed", { provider: "elevenlabs" });
          return new Response("Live conversation is unavailable right now", { status: 502 });
        }

        try {
          await recordLiveGrant({
            conversationId: minted.conversationId,
            userId: caller.userId,
            accessToken,
            refreshToken,
          });
        } catch {

          // Without the grant the socket cannot tell who is speaking, and an
          // anonymous Athena is not an acceptable degradation.
          safeLog("live.grant.failed", {});
          return new Response("Live conversation is unavailable right now", { status: 502 });
        }

        return Response.json(
          { conversationToken: minted.token, conversationId: minted.conversationId },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
