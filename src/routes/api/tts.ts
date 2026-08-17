import { createFileRoute } from "@tanstack/react-router";

type Body = { text?: string; voice?: string };

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, assertFeatureEnabled } = await import("@/lib/security.server");
        await assertFeatureEnabled("athena_conversation");
        if (!rateLimit(`tts:${caller.userId}`, 120, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const body = (await request.json().catch(() => ({}))) as Body;
        const text = (body.text ?? "").toString().trim();
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 4000) return new Response("Text too long", { status: 413 });
        // D5 canonical voice: warm feminine intelligence, subtly synthetic purity.
        const voice = body.voice ?? "marin";


        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice,
            response_format: "mp3",
            instructions:
              "Warm feminine intelligence with a subtly synthetic purity. Mature and composed, in a lower-middle register. Elegant, exceptionally articulate, gentle and emotionally perceptive, quietly confident, faintly futuristic. Measured conversational pace with restrained natural pauses. Never bright, never performative, never dramatic, never salesy.",
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          return new Response(errText || "TTS failed", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
