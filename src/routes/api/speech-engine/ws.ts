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

/** The init frame is the only place ElevenLabs names the conversation. */
function parseConversationId(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { type?: unknown; conversation_id?: unknown };
    if (data.type !== "init") return null;
    return typeof data.conversation_id === "string" ? data.conversation_id : null;
  } catch {
    return null;
  }
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
        // A live call opened from the app carries no per-member header:
        // ElevenLabs dials this socket itself. The member is resolved from the
        // grant recorded when the browser minted its conversation token, and
        // the header/query form stays available for direct integrations.
        // A direct integration may present its own member token on the
        // upgrade; a call opened from the app does not, and is re-resolved
        // from the grant on every single turn instead.
        const headerToken = memberToken(request, url);
        let conversationId = "";


        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        server.accept();

        // Turn bookkeeping: only the newest event_id is worth generating for.
        let latestEventId = -Infinity;
        let inFlight: AbortController | null = null;

        // Continuity with whatever was said before this live call started.
        // ElevenLabs's own `turn.history` only ever covers turns spoken
        // *within* the current call -- it has no knowledge of a prior text
        // conversation, so a live call opened after typing started cold and
        // re-asked what the member had just answered. Fetched once per
        // connection (not per turn, to avoid a race with the client's own
        // persist() of live turns landing mid-call) from interview_sessions
        // -- the same store the text path already reads and writes, not a
        // second conversation history.
        let priorHistory: { role: "user" | "assistant"; content: string }[] | null = null;
        const priorHistoryFor = async (
          userId: string,
        ): Promise<{ role: "user" | "assistant"; content: string }[]> => {
          if (priorHistory !== null) return priorHistory;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data } = await supabaseAdmin
              .from("interview_sessions")
              .select("messages")
              .eq("user_id", userId)
              .maybeSingle();
            const stored = Array.isArray(data?.messages)
              ? (data!.messages as Array<{ role?: unknown; content?: unknown }>)
              : [];
            priorHistory = stored
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-12)
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: String(m.content ?? ""),
              }));
          } catch {
            // A missing recap is a worse conversation, not a broken one.
            priorHistory = [];
          }
          return priorHistory;
        };
        // ElevenLabs re-delivers the same user_transcript more than once for a
        // single utterance. Answering each copy generated two full replies and
        // two audio streams per turn, which doubled cost and helped tear the
        // room down. One utterance, one answer: a transcript already answered
        // verbatim is ignored, while a genuine revision of the same event id
        // still supersedes it.
        const answered = new Map<number, string>();
        const rememberAnswered = (eventId: number, text: string) => {
          answered.set(eventId, text);
          if (answered.size > 40) {
            const oldest = answered.keys().next();
            if (!oldest.done) answered.delete(oldest.value);
          }
        };


        const send = (frame: unknown) => {
          try {
            server.send(JSON.stringify(frame));
          } catch {
            /* socket already closed */
          }
        };

        /**
         * Silence is Athena's to choose, never a failure's to impose. When a
         * turn cannot be answered she says one plain line and the member knows
         * something went wrong, instead of talking into a dead channel.
         */
        const speakFallback = (eventId: number, reason: string) => {
          console.error(`[speech-engine] turn=${eventId} unanswerable: ${reason}`);
          send(
            agentResponseFrame(
              eventId,
              "Something on my end just dropped out. Give me a second and say that again.",
              false,
            ),
          );
          send(agentResponseFrame(eventId, "", true));
        };

        const respond = async (turn: ReturnType<typeof parseUserTranscript>) => {
          if (!turn) return;
          const controller = new AbortController();
          inFlight = controller;

          // Stage timing: every line carries ms-since-transcript so one turn can
          // be read top-to-bottom without correlating wall clocks.
          const t0 = Date.now();
          const at = (stage: string, extra = "") =>
            console.log(
              `[speech-engine][timing] turn=${turn.eventId} stage=${stage} t+${Date.now() - t0}ms${
                extra ? ` ${extra}` : ""
              }`,
            );
          at("respond-start");

          // Resolved fresh for every turn. Caching a member token for the
          // length of a call is exactly what silenced her: once it aged out,
          // every remaining turn failed identically and invisibly.
          const { resolveTurnCredential } = await import("@/lib/live-voice.server");
          const credential = headerToken
            ? ({ ok: true, userId: "", accessToken: headerToken, renewed: false } as const)
            : await resolveTurnCredential(conversationId);
          at(
            "credential-resolved",
            credential.ok
              ? `ok renewed=${credential.renewed}`
              : `failed reason=${credential.reason}`,
          );
          if (!credential.ok) {
            speakFallback(turn.eventId, `credential ${credential.reason}`);
            return;
          }

          const { signInternalToken, INTERNAL_AUTH_HEADER } = await import(
            "@/lib/internal-auth.server"
          );
          const internalToken = credential.userId
            ? await signInternalToken({ userId: credential.userId, conversationId })
            : null;
          if (credential.userId && !internalToken) {
            speakFallback(turn.eventId, "internal signing secret is not configured");
            return;
          }

          const seed = credential.userId ? await priorHistoryFor(credential.userId) : [];
          const messages = [
            ...seed,
            ...turn.history,
            { role: "user" as const, content: turn.text },
          ];

          try {
            at("llm-call-start", `messages=${messages.length}`);
            const response = await fetch(new URL("/api/eleven-agent-chat", url.origin), {
              method: "POST",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${credential.accessToken}`,
                ...(internalToken ? { [INTERNAL_AUTH_HEADER]: internalToken } : {}),
              },
              body: JSON.stringify({ model: "athena", stream: true, messages }),
            });
            at("llm-headers", `status=${response.status}`);

            if (!response.ok || !response.body) {
              // The body names the actual cause; swallowing it is what made a
              // repeating 401 indistinguishable from Athena thinking.
              const detail = await response.text().catch(() => "");
              speakFallback(
                turn.eventId,
                `conversation call failed ${response.status} ${detail.slice(0, 300)}`,
              );
              return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let spoken = false;

            const emit = (text: string) => {
              for (const chunk of chunkReply(text)) {
                if (controller.signal.aborted || latestEventId > turn.eventId) return;
                if (!spoken) at("first-audio-frame-sent", `chars=${chunk.length}`);
                spoken = true;
                send(agentResponseFrame(turn.eventId, chunk, false));
              }
            };

            let firstByte = true;
            while (!controller.signal.aborted && latestEventId <= turn.eventId) {
              const { done, value } = await reader.read();
              if (done) break;
              if (firstByte) {
                firstByte = false;
                at("llm-first-byte");
              }
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
            if (!spoken) {
              // A 200 that produced no words is still a failed turn.
              speakFallback(turn.eventId, "conversation returned an empty reply");
              return;
            }
            send(agentResponseFrame(turn.eventId, "", true));
            at("final-frame-sent", `spoken=${spoken}`);
          } catch (error) {
            if ((error as { name?: string })?.name === "AbortError") return;
            console.error("[speech-engine] turn failed", error);
            speakFallback(turn.eventId, `threw ${String(error).slice(0, 300)}`);
          } finally {
            if (inFlight === controller) inFlight = null;
          }
        };


        console.log("[speech-engine] upgrade accepted");

        server.addEventListener("message", (event: MessageEvent) => {
          const raw = typeof event.data === "string" ? event.data : String(event.data ?? "");
          let frameType = "";
          try {
            frameType = String((JSON.parse(raw) as { type?: unknown }).type ?? "");
          } catch {
            /* non-JSON frame */
          }

          // Keep-alive: ElevenLabs drops the connection without a pong.
          if (frameType === "ping") {
            send({ type: "pong" });
            console.log(`[speech-engine][timing] ping/pong at ${new Date().toISOString()}`);
            return;
          }
          if (frameType === "close") {
            console.log("[speech-engine] conversation closed by ElevenLabs");
            return;
          }
          if (frameType === "error") {
            console.error(`[speech-engine] error frame: ${raw.slice(0, 300)}`);
            return;
          }

          const init = parseConversationId(raw);
          if (init) {
            conversationId = init;
            console.log("[speech-engine] init frame received");
            return;
          }
          const turn = parseUserTranscript(raw);
          if (!turn) {
            if (frameType) console.warn(`[speech-engine] unusable frame: ${frameType}`);
            return;
          }
          if (turn.eventId < latestEventId) return;

          const priorText = answered.get(turn.eventId);
          if (priorText === turn.text) {
            console.log(
              `[speech-engine][timing] turn=${turn.eventId} stage=duplicate-transcript-ignored at=${new Date().toISOString()} chars=${turn.text.length}`,
            );
            return;
          }

          // Barge-in, or a revision of the same event id: either way whatever
          // is still generating is retired before the new answer starts.
          if (inFlight && (turn.eventId > latestEventId || priorText !== undefined)) {
            inFlight.abort();
            inFlight = null;
          }
          latestEventId = turn.eventId;
          rememberAnswered(turn.eventId, turn.text);
          console.log(
            `[speech-engine][timing] turn=${turn.eventId} stage=transcript-received at=${new Date().toISOString()} chars=${turn.text.length} history=${turn.history.length}`,
          );
          void respond(turn);

        });


        server.addEventListener("close", () => {
          inFlight?.abort();
          inFlight = null;
          if (conversationId) {
            void import("@/lib/live-voice.server").then(({ releaseLiveGrant }) =>
              releaseLiveGrant(conversationId),
            ).catch(() => {});
          }
        });

        return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit);
      },
    },
  },
});
