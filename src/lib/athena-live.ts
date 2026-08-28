// Athena Live Conversation — browser transport.
//
// The member's browser holds a WebRTC call with ElevenLabs, which does the
// hearing and the speaking. Athena's actual reasoning runs on our own server:
// ElevenLabs calls back into /api/speech-engine/ws for every turn, where the
// existing conversation pipeline answers. There is still exactly one Athena.
//
// Text mode and TTS remain the fallback and are untouched. This module owns
// only the live speech channel: microphone in, Athena's voice out, and a
// running transcript so the conversation record stays continuous with
// everything typed before or after it.

import { Conversation } from "@elevenlabs/client";
import { acquireMicrophone, micFailureMessage } from "@/lib/mic-access";
import {
  classifySessionStatus,
  classifyThrown,
  liveFailureMessage,
  webrtcSupported,
  type LiveFailure,
} from "@/lib/live-failures";

export type LiveTurn = { role: "user" | "assistant"; content: string };

export type LiveStatus =
  | "idle"
  | "connecting"
  | "listening" // channel open, member has the floor
  | "speaking" // Athena has the floor
  | "ended"
  | "error";

export type LiveHandlers = {
  onStatus: (status: LiveStatus) => void;
  /** A completed turn, ready to be appended to the transcript. */
  onTurn: (turn: LiveTurn) => void;
  /** Athena's in-progress words, so text appears as she speaks it. */
  onPartial: (text: string) => void;
  onError: (message: string) => void;
};

type LiveConversation = Awaited<ReturnType<typeof Conversation.startSession>>;

export class AthenaLiveSession {
  private conversation: LiveConversation | null = null;
  private stream: MediaStream | null = null;
  private closed = false;
  private started = false;
  private authHeaders: Record<string, string> = {};
  private conversationId = "";
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly handlers: LiveHandlers) {}

  async start(authHeaders: Record<string, string>, priorTurns: LiveTurn[] = []): Promise<void> {
    // One session per instance, always: a second press can never open a second
    // microphone channel or a second Athena voice.
    if (this.started) return;
    this.started = true;
    this.handlers.onStatus("connecting");
    this.authHeaders = authHeaders;

    if (!webrtcSupported()) {
      this.failLive("unsupported-browser", "no RTCPeerConnection");
      return;
    }

    // Audio comes first, so a permission problem is never confused with an
    // initialization problem. Once the microphone is open, nothing below may
    // ask the member to enable microphone access.
    const mic = await acquireMicrophone({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (!mic.ok) {
      this.fail(micFailureMessage(mic.reason));
      return;
    }
    this.stream = mic.stream;
    if (this.closed) return this.cleanup();

    try {
      // A long call outlives the access token it started with. The renewal
      // credential is handed over once, at the door, so the server can keep
      // the conversation authenticated without the browser being asked again
      // mid-sentence.
      let refreshToken: string | null = null;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        refreshToken = data.session?.refresh_token ?? null;
      } catch {
        /* a call without renewal is still better than no call */
      }

      const res = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        this.failLive(classifySessionStatus(res.status), `session endpoint ${res.status}`);
        return;
      }
      let conversationToken = "";
      try {
        const body = (await res.json()) as {
          conversationToken?: string;
          conversationId?: string;
        };
        conversationToken = body.conversationToken ?? "";
        this.conversationId = body.conversationId ?? "";
      } catch (error) {
        this.failLive("session-failed", `unreadable session response: ${String(error)}`);
        return;
      }
      if (!conversationToken) {
        this.failLive("session-failed", "session response carried no conversation token");
        return;
      }
      if (this.closed) return this.cleanup();
      this.startCredentialHeartbeat();


      // The SDK opens and owns its own capture track; ours existed only to
      // establish permission cleanly, and holding it would keep a second
      // microphone stream alive for the whole call.
      this.releaseMicrophone();

      this.conversation = await Conversation.startSession({
        conversationToken,
        connectionType: "webrtc",
        onConnect: () => {
          if (this.closed) return;
          this.handlers.onStatus("listening");
          // Continuity: Athena resumes with everything already said today.
          const recap = priorTurns
            .slice(-12)
            .map((t) => `${t.role === "user" ? "Member" : "Athena"}: ${t.content}`)
            .join("\n");
          if (recap) this.guide(`Earlier in this same conversation:\n${recap}`);
        },
        onModeChange: ({ mode }) => {
          if (this.closed) return;
          this.handlers.onStatus(mode === "speaking" ? "speaking" : "listening");
          if (mode === "listening") this.handlers.onPartial("");
        },
        onMessage: ({ message, role }) => {
          const text = (message ?? "").trim();
          if (!text) return;
          this.handlers.onPartial("");
          this.handlers.onTurn({ role: role === "user" ? "user" : "assistant", content: text });
        },
        onDisconnect: (details) => {
          if (this.closed) return;
          if (details?.reason === "error") {
            this.failLive("disconnected", details.message ?? "session dropped", "session");
            return;
          }
          this.stop();
        },
        onError: (message) => {
          if (this.closed) return;
          this.failLive("connection-failed", String(message ?? "unknown"), "session");
        },
      });
    } catch (error) {
      // The microphone was already granted and open, so this can only be an
      // initialization failure. It is never reported as a permission problem.
      this.failLive(classifyThrown(error), String((error as Error)?.message ?? error));
    }
  }

  /**
   * Deliver internal guidance mid-session. It reaches Athena's reasoning as
   * context, never as something spoken or referenced back to the member.
   */
  guide(text: string): void {
    if (!text || !this.conversation) return;
    try {
      this.conversation.sendContextualUpdate(text);
    } catch {
      /* the conversation is closing */
    }
  }

  /**
   * Athena yields the floor immediately when the member takes it. Barge-in is
   * detected by the voice layer itself; this only clears what is on screen.
   */
  interrupt(): void {
    this.handlers.onPartial("");
    if (!this.closed) this.handlers.onStatus("listening");
  }

  stop(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopCredentialHeartbeat();
    void this.release();
    this.cleanup();
    this.handlers.onStatus("ended");
  }

  /**
   * A call can outlive the access token it started with — that is what once
   * left Athena silent mid-conversation. The browser refreshes its own session
   * in the background, so it hands the current credential forward periodically
   * while the call is open, rather than the server chasing a token the browser
   * has already rotated.
   */
  private startCredentialHeartbeat(): void {
    const push = async () => {
      if (this.closed || !this.conversationId) return;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session?.access_token) return;
        await fetch("/api/live-credential", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: this.conversationId,
            refreshToken: session.refresh_token ?? null,
          }),
        });
      } catch {
        /* the server-side renewal path remains as the fallback */
      }
    };
    void push();
    this.heartbeat = setInterval(() => void push(), 4 * 60_000);
  }

  private stopCredentialHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  /**
   * The credential handed over at the door ages out mid-call. Cleanup and
   * diagnostics that reused that snapshot silently 401'd once the call ran
   * past the token's life, so both now ask the browser session for the current
   * credential and fall back to the original headers only if that fails.
   */
  private async currentAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) return { ...this.authHeaders, Authorization: `Bearer ${token}` };
    } catch {
      /* fall through to the headers we started with */
    }
    return this.authHeaders;
  }

  /** The grant that binds this call to the member has no life after it. */
  private async release(): Promise<void> {
    if (!this.conversationId) return;
    const conversationId = this.conversationId;
    this.conversationId = "";
    try {
      await fetch("/api/live-release", {
        method: "POST",
        headers: { ...(await this.currentAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
        keepalive: true,
      });
    } catch {
      /* the grant expires on its own */
    }
  }


  /**
   * Failure after the microphone is open: continuous conversation could not
   * initialize or could not stay open. Never phrased as a permission problem;
   * the precise technical cause goes to the server, not to the member.
   */
  private failLive(reason: LiveFailure, detail: string, stage = "start"): void {
    if (this.closed) return;
    void this.report(reason, detail, stage);
    this.fail(liveFailureMessage(reason));
  }

  private async report(reason: string, detail: string, stage: string): Promise<void> {
    try {
      await fetch("/api/live-diagnostic", {
        method: "POST",
        headers: { ...this.authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail, stage }),
        keepalive: true,
      });
    } catch {
      /* diagnostics never affect what the member sees */
    }
  }

  private fail(message: string): void {
    this.closed = true;
    void this.release();
    this.handlers.onError(message);
    this.handlers.onStatus("error");
    this.cleanup();
  }

  private releaseMicrophone(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private cleanup(): void {
    try {
      void this.conversation?.endSession?.();
    } catch {
      /* already closing */
    }
    this.conversation = null;
    this.releaseMicrophone();
  }
}
