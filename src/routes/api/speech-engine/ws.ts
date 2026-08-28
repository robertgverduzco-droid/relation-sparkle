// ElevenLabs Speech Engine — inbound WebSocket.
//
// Transport only. ElevenLabs opens this socket, sends user_transcript frames,
// and speaks back whatever we stream as agent_response. Athena's reasoning,
// doctrine, safety layer and facets are NOT re-implemented here: each turn is
// handed to the existing conversation pipeline through the same internal
// endpoint the Custom-LLM door uses, so there is exactly one Athena.
import { createFileRoute } from "@tanstack/react-router";
import {
  SPEECH_ENGINE_AUTH_HEADER,
  verifySpeechEngineToken,
} from "@/lib/speech-engine-auth";
import {
  agentResponseFrame,
  chunkReply,
  parseUserTranscript,
} from "@/lib/speech-engine-protocol";

interface CloudflareWebSocket extends WebSocket {
  accept(): void;
}

declare const WebSocketPair: {
  new (): { 0: CloudflareWebSocket; 1: CloudflareWebSocket };
};

type WebSocketResponseInit = ResponseInit & { webSocket: CloudflareWebSocket };

/** Policy-violation close code: the caller could not be authenticated. */
const CLOSE_UNAUTHORIZED = 1008;

function memberToken(request: Request, url: URL): string | null {
  const header = request.headers.get("x-member-authorization");
  if (header) return header.replace(/^Bearer\s+/i, "").trim() || null;
  const param = url.searchParams.get("member_token") ?? url.searchParams.get("token");
  return param?.trim() || null;
}

export const Route = createFileRoute("/api/speech-engine/ws")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
          return new Response("Expected a WebSocket upgrade", { status: 426 });
        }

        const apiKey = process.env["ELEVENLABS_API_KEY"] ?? process.env["ELEVEN_API_KEY"] ?? null;
        const verdict = await verifySpeechEngineToken(
          request.headers.get(SPEECH_ENGINE_AUTH_HEADER),
          apiKey,
        );
        if (!verdict.ok) {
          console.warn(`[speech-engine] rejected connection: ${verdict.reason}`);
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const token = memberToken(request, url);
        if (!token) {
          return new Response("Member token required", { status: 401 });
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        server.accept();

        // Turn bookkeeping: only the newest event_id is worth generating for.
        let latestEventId = -Infinity;
        let inFlight: AbortController | null = null;

        const send = (frame: unknown) => {
          try {
            server.send(JSON.stringify(frame));
          } catch {
            /* socket already closed */
          }
        };

        const respond = async (turn: ReturnType<typeof parseUserTranscript>) => {
          if (!turn) return;
          const controller = new AbortController();
          inFlight = controller;

          const messages = [
            ...turn.history,
            { role: "user" as const, content: turn.text },
          ];

          try {
            const response = await fetch(new URL("/api/eleven-agent-chat", url.origin), {
              method: "POST",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ model: "athena", stream: true, messages }),
            });

            if (!response.ok || !response.body) {
              console.error(`[speech-engine] conversation call failed: ${response.status}`);
              send(agentResponseFrame(turn.eventId, "", true));
              return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let spoken = false;

            const emit = (text: string) => {
              for (const chunk of chunkReply(text)) {
                if (controller.signal.aborted || latestEventId > turn.eventId) return;
                spoken = true;
                send(agentResponseFrame(turn.eventId, chunk, false));
              }
            };

            while (!controller.signal.aborted && latestEventId <= turn.eventId) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload) as {
                    choices?: { delta?: { content?: unknown } }[];
                  };
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (typeof delta === "string" && delta) emit(delta);
                } catch {
                  /* ignore malformed SSE line */
                }
              }
            }

            if (controller.signal.aborted || latestEventId > turn.eventId) {
              await reader.cancel().catch(() => {});
              return;
            }
            if (!spoken) send(agentResponseFrame(turn.eventId, "", false));
            send(agentResponseFrame(turn.eventId, "", true));
          } catch (error) {
            if ((error as { name?: string })?.name === "AbortError") return;
            console.error("[speech-engine] turn failed", error);
            send(agentResponseFrame(turn.eventId, "", true));
          } finally {
            if (inFlight === controller) inFlight = null;
          }
        };

        server.addEventListener("message", (event: MessageEvent) => {
          const turn = parseUserTranscript(
            typeof event.data === "string" ? event.data : String(event.data ?? ""),
          );
          if (!turn) return;
          if (turn.eventId < latestEventId) return;

          // Barge-in: a newer transcript retires whatever is still generating.
          if (turn.eventId > latestEventId && inFlight) {
            inFlight.abort();
            inFlight = null;
          }
          latestEventId = turn.eventId;
          void respond(turn);
        });

        server.addEventListener("close", () => {
          inFlight?.abort();
          inFlight = null;
        });

        return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit);
      },
    },
  },
});
