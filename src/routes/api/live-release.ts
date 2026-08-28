import { createFileRoute } from "@tanstack/react-router";

/**
 * The member hung up. The short-lived grant that let Athena's socket know who
 * was speaking is deleted immediately rather than left to expire.
 */
export const Route = createFileRoute("/api/live-release")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json().catch(() => ({}))) as { conversationId?: unknown };
        const conversationId =
          typeof body.conversationId === "string" ? body.conversationId.slice(0, 128) : "";
        if (!conversationId) return new Response(null, { status: 204 });

        const { resolveLiveGrant, releaseLiveGrant } = await import("@/lib/live-voice.server");
        // A member may only end their own call.
        const grant = await resolveLiveGrant(conversationId);
        if (grant && grant.userId !== caller.userId) {
          return new Response("Forbidden", { status: 403 });
        }
        await releaseLiveGrant(conversationId);
        return new Response(null, { status: 204 });
      },
    },
  },
});
