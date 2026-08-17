import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askAthena, reflectAthena, completeFoundationalConversation } from "@/lib/athena.functions";
import { logUsage } from "@/lib/messaging.functions";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/athena")({
  head: () => ({
    meta: [
      { title: "Athena — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AthenaPage,
});

type Msg = { role: "user" | "assistant"; content: string; ts?: string };
type VoiceMode = "voice" | "text";
const VOICE_KEY = "athena-voice-mode";

function buildIntro(firstName: string | null): string[] {
  const greeting = firstName ? `Hello, ${firstName}.` : "Hello.";
  return [
    greeting,
    "I'm Athena.",
    "It's a pleasure to finally meet you.",
    "Our first conversation is designed to help me build a strong foundation for understanding who you are. By the end of our conversation, I'll know enough to begin identifying people who appear highly compatible with you. Every conversation we have after that helps me understand you more deeply, allowing me to continually refine and improve the introductions I make over time.",
    "Before I ever introduce you to another person, I'd like the opportunity to understand you.",
    "There are no questionnaires. There are no personality tests. Just a conversation.",
    "Every conversation helps me better understand who you are, so every future introduction can become more meaningful.",
    "Speak naturally. I'll do the same.",
  ];
}

/** Bearer token for the voice endpoints, which authenticate every request. */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function playLine(text: string, signal: AbortSignal): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await new Promise<void>((resolve) => {
      const done = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onended = done;
      audio.onerror = done;
      signal.addEventListener("abort", () => { audio.pause(); done(); }, { once: true });
      audio.play().catch(done);
    });
  } catch {
    /* silent */
  }
}

function AthenaPage() {
  const navigate = useNavigate();
  const ask = useServerFn(askAthena);
  const reflect = useServerFn(reflectAthena);
  const complete = useServerFn(completeFoundationalConversation);
  const logUsageFn = useServerFn(logUsage);
  const readMembership = useServerFn(getMyMembership);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [introducing, setIntroducing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode | null>(null);
  const [askingPreference, setAskingPreference] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showClosingCard, setShowClosingCard] = useState(false);
  const [completing, setCompleting] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastReflectedTurnRef = useRef(0);
  const conversationStartRef = useRef<number>(Date.now());
  const timeAcknowledgedRef = useRef(false);
  const foundationCompleteRef = useRef(false);
  const flushingRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);


  const persist = useCallback(async (msgs: Msg[]) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase.from("interview_sessions").upsert(
      { user_id: uid, messages: msgs, completed_at: null },
      { onConflict: "user_id" },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    (async () => {
      const stored = typeof window !== "undefined" ? (localStorage.getItem(VOICE_KEY) as VoiceMode | null) : null;

      const [{ data: session }, { data: profile }] = await Promise.all([
        supabase.from("interview_sessions").select("messages, completed_at").maybeSingle(),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      if (cancelled) return;
      foundationCompleteRef.current = Boolean(session?.completed_at);
      const priorMessages = Array.isArray(session?.messages) ? (session!.messages as Msg[]) : [];
      if (priorMessages.length > 0) {
        setMessages(priorMessages);
        lastReflectedTurnRef.current = priorMessages.filter((m) => m.role === "user").length;
        setVoiceMode(stored ?? "text");
        setHydrated(true);
        conversationStartRef.current = Date.now();
        return;
      }


      // First meeting.
      setHydrated(true);
      setIntroducing(true);
      const useVoice = stored !== "text";
      setVoiceMode(stored ?? "voice");

      const firstName = (profile?.display_name as string | null)?.split(" ")[0] ?? null;
      const lines = buildIntro(firstName);
      const accumulated: Msg[] = [];
      await wait(500);
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;
        await wait(i === 0 ? 300 : 500);
        if (cancelled) return;
        accumulated.push({ role: "assistant", content: lines[i], ts: new Date().toISOString() });
        setMessages([...accumulated]);
        if (useVoice) {
          await playLine(lines[i], abort.signal);
        } else {
          await wait(Math.min(3200, 700 + lines[i].length * 30));
        }
      }
      if (cancelled) return;
      setIntroducing(false);
      conversationStartRef.current = Date.now();
      void persist(accumulated);
      if (!stored) {
        setAskingPreference(true);
      }
    })();
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [persist]);

  useEffect(() => {
    if (!hydrated) return;
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, introducing, hydrated, askingPreference]);

  useEffect(() => {
    if (!introducing && !busy && !askingPreference) inputRef.current?.focus();
  }, [busy, introducing, askingPreference]);

  const choosePreference = useCallback(async (mode: VoiceMode) => {
    try { localStorage.setItem(VOICE_KEY, mode); } catch { /* ignore */ }
    setVoiceMode(mode);
    setAskingPreference(false);
    const opening = "What's something you've been thinking about recently?";
    const abort = new AbortController();
    setIntroducing(true);
    await wait(400);
    const next: Msg[] = [
      ...messages,
      { role: "assistant", content: opening, ts: new Date().toISOString() },
    ];
    setMessages(next);
    if (mode === "voice") await playLine(opening, abort.signal);
    setIntroducing(false);
    conversationStartRef.current = Date.now();
    void persist(next);
  }, [messages, persist]);

  async function askWithRetry(payload: {
    messages: Msg[];
    elapsedMinutes: number;
    timeAcknowledged: boolean;
  }): Promise<{ reply: string; pacing?: string; timeAcknowledged?: boolean } | null> {
    try {
      return await ask({ data: payload });
    } catch {
      await wait(600);
      try {
        return await ask({ data: payload });
      } catch {
        return null;
      }
    }
  }

  // Keep a live ref of messages so unmount/beforeunload flush uses the latest.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Durable backup: if the user leaves after adding new turns, best-effort
  // fire a final reflect. The graceful closing card is the primary path;
  // this only exists to avoid losing insight if they never confirm it.
  // Deduped via flushingRef and lastReflectedTurnRef.
  const flushReflect = useCallback(() => {
    if (flushingRef.current) return;
    const msgs = messagesRef.current;
    const userTurns = msgs.filter((m) => m.role === "user").length;
    if (userTurns <= lastReflectedTurnRef.current) return;
    flushingRef.current = true;
    lastReflectedTurnRef.current = userTurns;
    reflect({ data: { messages: msgs } })
      .catch(() => { /* silent */ })
      .finally(() => { flushingRef.current = false; });
  }, [reflect]);

  useEffect(() => {
    if (!hydrated) return;
    const onHide = () => flushReflect();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      flushReflect();
    };
  }, [hydrated, flushReflect]);

  async function finalizeAndLeave() {
    if (completing) return;
    setCompleting(true);
    try {
      // 1. Save current transcript.
      await persist(messagesRef.current);
      // 2. Run one final reflect so understanding is fully up to date.
      try {
        await reflect({ data: { messages: messagesRef.current } });
        lastReflectedTurnRef.current = messagesRef.current.filter((m) => m.role === "user").length;
      } catch { /* non-fatal */ }
      // 3. Mark session complete and force matchmaking.
      try { await complete({}); } catch { /* non-fatal */ }
      foundationCompleteRef.current = true;
      toast("Athena has what she needs for now. She'll begin reflecting.");
      // 4. Membership is offered only after the foundation exists — never before.
      let entitled = false;
      try { entitled = (await readMembership()).entitled; } catch { /* non-fatal */ }
      navigate({ to: entitled ? "/home" : "/membership" });
    } finally {
      setCompleting(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || introducing || askingPreference) return;
    const now = new Date().toISOString();
    const next: Msg[] = [...messages, { role: "user", content: text, ts: now }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const elapsedMinutes = (Date.now() - conversationStartRef.current) / 60000;
      const res = await askWithRetry({
        messages: next,
        elapsedMinutes,
        timeAcknowledged: timeAcknowledgedRef.current,
      });
      if (!res) {
        void persist(next);
        toast("I'm having a little trouble responding right now. Your message has been saved. Please try again.");
        return;
      }
      if (res.timeAcknowledged) timeAcknowledgedRef.current = true;
      const withReply: Msg[] = [
        ...next,
        { role: "assistant", content: res.reply, ts: new Date().toISOString() },
      ];
      setMessages(withReply);
      void persist(withReply);
      if (voiceMode === "voice") {
        const abort = new AbortController();
        void playLine(res.reply, abort.signal);
      }

      // Log usage for later billing (Stripe deferred). Rough estimate: 4 chars/token.
      void logUsageFn({
        data: {
          kind: voiceMode === "voice" ? "athena_voice" : "athena_text",
          input_tokens: Math.ceil(text.length / 4),
          output_tokens: Math.ceil((res.reply?.length ?? 0) / 4),
          model: "openai/gpt-5.5",
        },
      }).catch(() => { /* silent */ });

      const userTurns = withReply.filter((m) => m.role === "user").length;
      if (userTurns - lastReflectedTurnRef.current >= 6) {
        lastReflectedTurnRef.current = userTurns;
        void reflect({ data: { messages: withReply } }).catch(() => { /* silent */ });
      }

      // Athena's server-side pacing tells us when she's offering to close
      // this foundational conversation gracefully. Show the closing card
      // once — only if the foundation isn't already marked complete.
      if (res.pacing === "offer_return" && !foundationCompleteRef.current) {
        setShowClosingCard(true);
      }
    } finally {
      setBusy(false);
    }
  }


  // ---- Voice input (mic) ----
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || transcribing || busy) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast("Voice input isn't available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Pick the best supported mime; Safari uses mp4, others webm.
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidates.find((c) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        stopStream();
        if (blob.size < 1024) {
          setRecording(false);
          setTranscribing(false);
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
          fd.append("file", blob, `voice.${ext}`);
          const res = await fetch("/api/stt", {
            method: "POST",
            body: fd,
            headers: await authHeader(),
          });

          if (!res.ok) {
            toast("I couldn't hear that clearly. Please try again.");
            return;
          }
          const { text } = (await res.json()) as { text?: string };
          const clean = (text ?? "").trim();
          if (!clean) {
            toast("I didn't catch that. Please try again.");
            return;
          }
          setInput((prev) => (prev ? `${prev.trimEnd()} ${clean}` : clean));
          requestAnimationFrame(() => inputRef.current?.focus());
        } catch {
          toast("Voice input didn't go through. Please try again.");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast("Microphone permission is needed to speak with Athena.");
      stopStream();
    }
  }, [recording, transcribing, busy, stopStream]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    setRecording(false);
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* ignore */ }
    } else {
      stopStream();
    }
  }, [stopStream]);

  useEffect(() => () => { stopStream(); }, [stopStream]);

  const inputDisabled = busy || introducing || !hydrated || askingPreference || transcribing;
  const placeholder = introducing || !hydrated || askingPreference
    ? ""
    : transcribing
      ? "Transcribing…"
      : recording
        ? "Listening…"
        : busy
          ? "…"
          : "Say it — or type it";

  return (
    <div className="screen-shell safe-top pb-24">
      <header className="px-6 pt-6 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/home" })}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
          >
            ← Home
          </button>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Athena</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
            title="Voice settings"
          >
            {voiceMode === "voice" ? "Voice" : "Text"}
          </button>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {!hydrated ? (
          <p className="text-center text-sm text-muted-foreground fade-in-slow">
            Athena is preparing to meet you…
          </p>
        ) : (
          <>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {(busy || introducing) && <TypingBubble />}
            {askingPreference && (
              <div className="fade-in-slow pt-4 flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">How would you like to continue?</p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  <button
                    onClick={() => void choosePreference("voice")}
                    className="rounded-2xl border border-input bg-card px-4 py-3 text-left text-[15px] hover:bg-accent transition"
                  >
                    Continue with voice & text
                    <span className="block text-xs text-muted-foreground mt-1">Athena speaks while text appears in sync.</span>
                  </button>
                  <button
                    onClick={() => void choosePreference("text")}
                    className="rounded-2xl border border-input bg-card px-4 py-3 text-left text-[15px] hover:bg-accent transition"
                  >
                    Continue with text only
                    <span className="block text-xs text-muted-foreground mt-1">Athena communicates silently through text.</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">You can change this anytime.</p>
              </div>
            )}
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="safe-bottom border-t border-border/60 bg-background/90 backdrop-blur px-4 pt-3 pb-3"
      >
        <div
          className="flex items-end gap-2 rounded-3xl border border-input bg-card px-2 py-2 transition-opacity"
          style={{ opacity: inputDisabled && !recording ? 0.5 : 1 }}
        >
          <button
            type="button"
            onClick={() => (recording ? stopRecording() : void startRecording())}
            disabled={busy || introducing || askingPreference || transcribing}
            title={recording ? "Stop and transcribe" : "Speak to Athena"}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-40 ${
              recording
                ? "bg-primary text-primary-foreground animate-pulse"
                : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            {recording ? <StopIcon /> : <MicIcon />}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={placeholder}
            disabled={inputDisabled && !recording}
            className="min-h-[24px] max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || inputDisabled}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {recording && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Listening — tap the button again when you're done.
          </p>
        )}
      </form>

      {settingsOpen && (
        <VoiceSettingsSheet
          current={voiceMode ?? "text"}
          onClose={() => setSettingsOpen(false)}
          onChoose={(mode) => {
            try { localStorage.setItem(VOICE_KEY, mode); } catch { /* ignore */ }
            setVoiceMode(mode);
            setSettingsOpen(false);
          }}
        />
      )}

      {showClosingCard && (
        <ClosingSheet
          busy={completing}
          onKeepTalking={() => setShowClosingCard(false)}
          onFinish={() => {
            setShowClosingCard(false);
            void finalizeAndLeave();
          }}
        />
      )}

      <MobileTabBar current="athena" />

    </div>
  );
}

function VoiceSettingsSheet({
  current,
  onClose,
  onChoose,
}: {
  current: VoiceMode;
  onClose: () => void;
  onChoose: (m: VoiceMode) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background border-t border-border/60 p-6 pb-8 fade-in-slow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <h2 className="text-lg font-display mb-1">Voice settings</h2>
        <p className="text-sm text-muted-foreground mb-5">How would you like Athena to respond?</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChoose("voice")}
            className={`rounded-2xl border px-4 py-3 text-left text-[15px] transition ${
              current === "voice" ? "border-primary bg-accent" : "border-input hover:bg-accent"
            }`}
          >
            Voice & Text
            <span className="block text-xs text-muted-foreground mt-1">Athena speaks aloud while text appears in sync.</span>
          </button>
          <button
            onClick={() => onChoose("text")}
            className={`rounded-2xl border px-4 py-3 text-left text-[15px] transition ${
              current === "text" ? "border-primary bg-accent" : "border-input hover:bg-accent"
            }`}
          >
            Text Only
            <span className="block text-xs text-muted-foreground mt-1">Athena communicates silently through text.</span>
          </button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          You can speak to Athena at any time by tapping the microphone — whichever mode you're in.
        </p>
      </div>
    </div>
  );
}

function ClosingSheet({
  busy,
  onKeepTalking,
  onFinish,
}: {
  busy: boolean;
  onKeepTalking: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-t-3xl bg-background border-t border-border/60 p-6 pb-8 fade-in-slow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <h2 className="text-lg font-display mb-2">A natural place to pause</h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          Athena has enough of a foundation to begin thinking carefully about who
          you might connect with. You can keep talking as long as you'd like —
          every conversation from here refines her understanding — or close for
          now and let her start reflecting.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onFinish}
            disabled={busy}
            className="rounded-full bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Saving…" : "Finish for now"}
          </button>
          <button
            onClick={onKeepTalking}
            disabled={busy}
            className="rounded-full border border-border px-6 py-3 text-[15px] text-foreground disabled:opacity-60"
          >
            Keep talking
          </button>
        </div>
      </div>
    </div>
  );
}


function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex fade-in-slow ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground"
            : "max-w-[90%] text-[15px] leading-relaxed text-foreground"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:font-display">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 px-1 py-2" role="status" aria-live="polite">
        <span className="sr-only">Athena is thinking</span>
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}
function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}
