// TEMPORARY verification harness for the live-voice credential fix.
//
// It stands where ElevenLabs stands: it mints a Speech Engine token, dials our
// own /api/speech-engine/ws, and drives real turns through the real pipeline.
// It exists to prove that a call outlives its starting access token, and it is
// removed once that is on the record. Member-authenticated; it can only ever
// act as the caller's own account.
import { createFileRoute } from "@tanstack/react-router";

type Frame = { type?: string; event_id?: number; content?: string; is_final?: boolean };

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function mintSpeechEngineToken(apiKey: string): Promise<string> {
  const { SPEECH_ENGINE_ISSUER, SPEECH_ENGINE_SUBJECT, speechEngineSecrets } = await import(
    "@/lib/speech-engine-auth"
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: SPEECH_ENGINE_ISSUER,
        sub: SPEECH_ENGINE_SUBJECT,
        iat: now,
        nbf: now - 5,
        exp: now + 600,
      }),
    ),
  );
  const secret = (await speechEngineSecrets(apiKey))[0]!;
  const key = await crypto.subtle.importKey(
    "raw",
    secret as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${payload}`)),
  );
  return `${header}.${payload}.${base64url(signature)}`;
}

/** A structurally valid token whose expiry is already in the past — exactly
 * what the member's real token becomes deep into a long call. */
function expiredToken(sub: string): string {
  const head = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(
    new TextEncoder().encode(
      JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) - 300, role: "authenticated" }),
    ),
  );
  return `${head}.${body}.expired-signature`;
}

export const Route = createFileRoute("/api/live-selftest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyApiCaller } = await import("@/lib/api-auth.server");
        const caller = await verifyApiCaller(request);
        if (!caller) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json().catch(() => ({}))) as {
          refreshToken?: string;
          turns?: string[];
          breakRefreshToken?: boolean;
        };
        const turns = Array.isArray(body.turns) && body.turns.length ? body.turns : ["Hello."];
        const accessToken = (request.headers.get("authorization") ?? "").slice(7);

        const { elevenApiKey, recordLiveGrant, releaseLiveGrant } = await import(
          "@/lib/live-voice.server"
        );
        const apiKey = elevenApiKey();
        if (!apiKey) return new Response("no speech engine key", { status: 503 });

        const conversationId = `selftest_${crypto.randomUUID()}`;
        await recordLiveGrant({
          conversationId,
          userId: caller.userId,
          accessToken,
          refreshToken: body.breakRefreshToken
            ? "invalid-refresh-token"
            : (body.refreshToken ?? null),
        });

        // Age the credential past its life, as ~40 minutes of conversation
        // would. Nothing else about the call is simulated.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("live_voice_grants")
          .update({ access_token: expiredToken(caller.userId) })
          .eq("conversation_id", conversationId);

        const url = new URL(request.url);
        // fetch() keeps the http(s) scheme; the Upgrade header is what makes
        // it a WebSocket handshake.
        const wsUrl = new URL("/api/speech-engine/ws", url.origin);

        const { SPEECH_ENGINE_AUTH_HEADER } = await import("@/lib/speech-engine-auth");
        const upgrade = await fetch(wsUrl.toString(), {
          headers: {
            Upgrade: "websocket",
            [SPEECH_ENGINE_AUTH_HEADER]: await mintSpeechEngineToken(apiKey),
          },
        });
        const socket = (upgrade as unknown as { webSocket?: WebSocket }).webSocket;
        if (!socket) {
          await releaseLiveGrant(conversationId);
          return Response.json({ ok: false, status: upgrade.status }, { status: 502 });
        }
        (socket as unknown as { accept(): void }).accept();

        const results: {
          turn: number;
          ms: number;
          spoken: string;
          empty: boolean;
        }[] = [];
        let current: { eventId: number; text: string; resolve: () => void } | null = null;

        socket.addEventListener("message", (event: MessageEvent) => {
          let frame: Frame;
          try {
            frame = JSON.parse(String(event.data)) as Frame;
          } catch {
            return;
          }
          if (frame.type !== "agent_response" || !current) return;
          if (frame.event_id !== current.eventId) return;
          if (frame.content) current.text += frame.content;
          if (frame.is_final) current.resolve();
        });

        socket.send(JSON.stringify({ type: "init", conversation_id: conversationId }));

        const history: { role: "user" | "assistant"; content: string }[] = [];
        for (let i = 0; i < turns.length; i += 1) {
          const eventId = (i + 1) * 10;
          const text = turns[i]!;
          history.push({ role: "user", content: text });
          const started = Date.now();
          const spoken = await new Promise<string>((resolve) => {
            const state = {
              eventId,
              text: "",
              resolve: () => resolve(state.text),
            };
            current = state;
            const timer = setTimeout(() => resolve(state.text), 60_000);
            const done = (value: string) => {
              clearTimeout(timer);
              return value;
            };
            state.resolve = () => resolve(done(state.text));
            socket.send(
              JSON.stringify({
                type: "user_transcript",
                event_id: eventId,
                user_transcript: history,
              }),
            );
          });
          history.push({ role: "assistant", content: spoken });
          results.push({
            turn: eventId,
            ms: Date.now() - started,
            spoken: spoken.slice(0, 160),
            empty: spoken.trim().length === 0,
          });
        }

        try {
          socket.close();
        } catch {
          /* already closed */
        }
        await releaseLiveGrant(conversationId);

        return Response.json({ ok: true, conversationId, results });
      },
    },
  },
});
