import { createFileRoute } from "@tanstack/react-router";

/**
 * Mid-session educational depth for Athena's Live Conversation mode.
 *
 * A spoken session's instructions are fixed when it is minted, so without this
 * a voice conversation could never draw on anything the member says after it
 * begins. The client posts the member's most recent words; this returns the
 * relevant educational material, on the tighter voice budget, for injection as
 * an internal system item. It returns reasoning depth only — never member
 * data, never another member's material.
 */
export const Route = createFileRoute("/api/realtime-education")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, assertFeatureEnabled } = await import("@/lib/security.server");
        await assertFeatureEnabled("athena_conversation");
        if (!rateLimit(`live-edu:${caller.userId}`, 90, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        let text = "";
        try {
          const body = (await request.json()) as { text?: unknown };
          text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
        } catch {
          text = "";
        }
        if (!text.trim()) {
          return Response.json({ block: "" }, { headers: { "Cache-Control": "no-store" } });
        }

        const { reasoningContext, actorHash } = await import("@/lib/education-context.server");
        const { block } = await reasoningContext({
          mode: "voice",
          surface: "liveSupplement",
          memberText: text,
          actorHash: await actorHash(caller.userId),
        });

        // Doctrine is already in the live session's standing instructions; only
        // the situational educational layer is sent mid-conversation.
        const marker = "EDUCATIONAL DEPTH";
        const idx = block.indexOf(marker);
        return Response.json(
          { block: idx >= 0 ? block.slice(idx) : "" },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
