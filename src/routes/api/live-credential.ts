// Keeps a live call authenticated for as long as it lasts.
//
// The browser holds the only authoritative session: it rotates its own tokens
// on its own schedule, which quietly invalidates any copy the server refreshes
// behind its back. So the browser hands the current credential forward while
// the call is open, and the grant stays fresh without anyone being asked to
// sign in mid-sentence. A member can only ever refresh their own grant.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/live-credential")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json().catch(() => ({}))) as {
          conversationId?: unknown;
          refreshToken?: unknown;
        };
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
        if (!conversationId) return new Response("conversationId required", { status: 400 });

        const accessToken = (request.headers.get("authorization") ?? "").slice(7);
        if (!accessToken) return new Response("Unauthorized", { status: 401 });

        const { renewGrantCredential } = await import("@/lib/live-voice.server");
        const renewed = await renewGrantCredential({
          conversationId,
          userId: caller.userId,
          accessToken,
          refreshToken: typeof body.refreshToken === "string" ? body.refreshToken : null,
        });
        if (!renewed) return new Response("No such conversation", { status: 404 });

        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
