// Minimal WebSocket plumbing proof — NOT the ElevenLabs integration.
// Accepts a WebSocket upgrade, sends a greeting, echoes one message back.
// Delete or repurpose once the real speech-engine route replaces it.
import { createFileRoute } from "@tanstack/react-router";

// Cloudflare Workers WebSocket API — present in the workerd runtime but not
// in the default TS lib types.
declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

type WebSocketResponseInit = ResponseInit & { webSocket: WebSocket };

export const Route = createFileRoute("/api/ws-echo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
          return new Response("Expected a WebSocket upgrade", { status: 426 });
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        server.accept();
        server.send(JSON.stringify({ type: "hello", from: "athena-ws-echo" }));

        server.addEventListener("message", (event: MessageEvent) => {
          server.send(
            JSON.stringify({ type: "echo", received: String(event.data ?? "") }),
          );
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        } as WebSocketResponseInit);
      },
    },
  },
});
