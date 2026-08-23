// Athena Live Conversation — browser transport (WebRTC).
//
// Text mode and TTS remain the fallback and are untouched. This module owns
// only the live speech-to-speech channel: microphone in, Athena's voice out,
// and a running transcript so the conversation record stays continuous with
// everything typed before or after it.

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

const REALTIME_URL = "https://api.openai.com/v1/realtime/calls";

export class AthenaLiveSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private closed = false;
  private assistantBuffer = "";

  constructor(private readonly handlers: LiveHandlers) {}

  async start(authHeaders: Record<string, string>, priorTurns: LiveTurn[] = []): Promise<void> {
    this.handlers.onStatus("connecting");

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
      const res = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        this.failInit(
          res.status === 503
            ? "Your microphone is fine — continuous conversation isn't available right now. You can still speak a message or type here."
            : "Your microphone is fine — I couldn't open the continuous conversation. Please try again, or type here.",
        );
        return;
      }
      const { clientSecret } = (await res.json()) as { clientSecret: string };
      if (this.closed) return this.cleanup();

      const pc = new RTCPeerConnection();
      this.pc = pc;

      this.audio = document.createElement("audio");
      this.audio.autoplay = true;
      pc.ontrack = (e) => {
        if (this.audio) this.audio.srcObject = e.streams[0] ?? null;
      };
      this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream!));

      const dc = pc.createDataChannel("oai-events");
      this.dc = dc;
      dc.onmessage = (e) => this.onEvent(e.data as string);
      dc.onopen = () => {
        // Continuity: Athena resumes with everything already said today.
        for (const turn of priorTurns.slice(-12)) {
          this.send({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: turn.role,
              content: [
                {
                  type: turn.role === "user" ? "input_text" : "output_text",
                  text: turn.content,
                },
              ],
            },
          });
        }
        this.handlers.onStatus("listening");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answer = await fetch(REALTIME_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });
      if (!answer.ok) {
        this.fail("I couldn't open a live conversation just now. Please try again.");
        return;
      }
      const sdp = await answer.text();
      if (this.closed) return this.cleanup();
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch {
      this.fail("Microphone access is needed for a live conversation.");
    }
  }

  /**
   * Deliver internal guidance mid-session. A live session's instructions are
   * fixed when it opens, so breadth-first correction during the foundational
   * conversation arrives as a system item. It is never spoken or referenced.
   */
  guide(text: string): void {
    if (!text) return;
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** Athena yields the floor immediately when the member takes it. */
  interrupt(): void {
    this.send({ type: "response.cancel" });
    this.assistantBuffer = "";
    this.handlers.onPartial("");
    if (!this.closed) this.handlers.onStatus("listening");
  }


  stop(): void {
    this.closed = true;
    this.cleanup();
    this.handlers.onStatus("ended");
  }

  private send(payload: unknown): void {
    if (this.dc?.readyState === "open") {
      try {
        this.dc.send(JSON.stringify(payload));
      } catch {
        /* channel closing */
      }
    }
  }

  private onEvent(raw: string): void {
    let evt: { type?: string; transcript?: string; delta?: string };
    try {
      evt = JSON.parse(raw);
    } catch {
      return;
    }
    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        this.assistantBuffer = "";
        this.handlers.onPartial("");
        this.handlers.onStatus("listening");
        break;
      case "response.output_audio.delta":
        this.handlers.onStatus("speaking");
        break;
      case "response.output_audio_transcript.delta":
        this.assistantBuffer += evt.delta ?? "";
        this.handlers.onPartial(this.assistantBuffer);
        break;
      case "response.output_audio_transcript.done": {
        const text = (evt.transcript ?? this.assistantBuffer).trim();
        this.assistantBuffer = "";
        this.handlers.onPartial("");
        if (text) this.handlers.onTurn({ role: "assistant", content: text });
        break;
      }
      case "response.done":
        if (!this.closed) this.handlers.onStatus("listening");
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const text = (evt.transcript ?? "").trim();
        if (text) this.handlers.onTurn({ role: "user", content: text });
        break;
      }
      case "error":
        this.handlers.onError("Something interrupted the live conversation.");
        break;
      default:
        break;
    }
  }

  private fail(message: string): void {
    this.handlers.onError(message);
    this.handlers.onStatus("error");
    this.cleanup();
  }

  private cleanup(): void {
    try {
      this.dc?.close();
    } catch { /* ignore */ }
    try {
      this.pc?.close();
    } catch { /* ignore */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audio) {
      this.audio.srcObject = null;
      this.audio = null;
    }
    this.dc = null;
    this.pc = null;
    this.stream = null;
  }
}
