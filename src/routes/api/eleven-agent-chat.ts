// A second door into the same house: ElevenLabs "Custom LLM" speaks the
// OpenAI Chat Completions dialect, so this route translates that shape into
// the existing askAthena server function and back. No doctrine, prompt, or
// conversation logic lives here — it is transport only.
import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = {
  role?: string;
  content?: unknown;
};

type ChatCompletionsBody = {
  model?: string;
  messages?: ChatMessage[];
  stream?: boolean;
};

function flattenContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof (part as { text?: unknown })?.text === "string"
            ? ((part as { text: string }).text)
            : "",
      )
      .join(" ")
      .trim();
  }
  return "";
}

export const Route = createFileRoute("/api/eleven-agent-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const { rateLimit, assertFeatureEnabled } = await import("@/lib/security.server");
        await assertFeatureEnabled("athena_conversation");
        if (!rateLimit(`eleven-agent-chat:${caller.userId}`, 60, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        const body = (await request.json().catch(() => ({}))) as ChatCompletionsBody;
        const incoming = Array.isArray(body.messages) ? body.messages : [];

        // Athena owns her own system prompt. Any system message supplied by the
        // caller is discarded rather than allowed to alter doctrine.
        const messages = incoming
          .filter((m) => m?.role === "user" || m?.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: flattenContent(m.content),
          }))
          .filter((m) => m.content.length > 0)
          .slice(-60);

        if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
          return new Response(
            JSON.stringify({ error: { message: "A trailing user message is required." } }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Stage timing for live-voice latency work: how much of a turn is
        // Athena's own reasoning versus everything around it.
        const tStart = Date.now();
        const { askAthena } = await import("@/lib/athena.functions");
        const tImported = Date.now();
        const result = await askAthena({ data: { messages } });
        const tAnswered = Date.now();
        const reply = result.reply ?? "";
        console.log(
          `[agent-chat][timing] import=${tImported - tStart}ms askAthena=${tAnswered - tImported}ms total=${tAnswered - tStart}ms chars=${reply.length} messages=${messages.length}`,
        );

        const created = Math.floor(Date.now() / 1000);
        const id = `chatcmpl-${crypto.randomUUID()}`;
        const model = body.model ?? "athena";

        if (body.stream) {
          const encoder = new TextEncoder();
          const chunk = (delta: Record<string, unknown>, finish: string | null) =>
            encoder.encode(
              `data: ${JSON.stringify({
                id,
                object: "chat.completion.chunk",
                created,
                model,
                choices: [{ index: 0, delta, finish_reason: finish }],
              })}\n\n`,
            );

          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(chunk({ role: "assistant", content: reply }, null));
              controller.enqueue(chunk({}, "stop"));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-store",
              Connection: "keep-alive",
            },
          });
        }

        return new Response(
          JSON.stringify({
            id,
            object: "chat.completion",
            created,
            model,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: reply },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
