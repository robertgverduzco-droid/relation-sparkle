import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askAthena, reflectAthena } from "@/lib/athena.functions";
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
    "Before I ever introduce you to another person, I'd like the opportunity to understand you.",
    "There are no questionnaires. There are no personality tests. Just a conversation.",
    "Every conversation helps me better understand who you are, so every future introduction can become more meaningful.",
    "Speak naturally. I'll do the same.",
  ];
}

async function playLine(text: string, signal: AbortSignal): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [introducing, setIntroducing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode | null>(null);
  const [askingPreference, setAskingPreference] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastReflectedTurnRef = useRef(0);

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
        supabase.from("interview_sessions").select("messages").maybeSingle(),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      if (cancelled) return;
      const priorMessages = Array.isArray(session?.messages) ? (session!.messages as Msg[]) : [];
      if (priorMessages.length > 0) {
        setMessages(priorMessages);
        lastReflectedTurnRef.current = priorMessages.filter((m) => m.role === "user").length;
        setVoiceMode(stored ?? "text");
        setHydrated(true);
        return;
      }

      // First meeting.
      setHydrated(true);
      setIntroducing(true);
      const useVoice = stored !== "text"; // default to voice on very first meeting
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
          // Reading beat proportional to length
          await wait(Math.min(3200, 700 + lines[i].length * 30));
        }
      }
      if (cancelled) return;
      setIntroducing(false);
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
    // Athena's first real question, opening the conversation.
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
    void persist(next);
  }, [messages, persist]);

  async function askWithRetry(payload: { messages: Msg[] }): Promise<{ reply: string } | null> {
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

  async function send() {
    const text = input.trim();
    if (!text || busy || introducing || askingPreference) return;
    const now = new Date().toISOString();
    const next: Msg[] = [...messages, { role: "user", content: text, ts: now }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await askWithRetry({ messages: next });
      if (!res) {
        void persist(next);
        toast("I'm having a little trouble responding right now. Your message has been saved. Please try again.");
        return;
      }
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

      const userTurns = withReply.filter((m) => m.role === "user").length;
      if (userTurns - lastReflectedTurnRef.current >= 6) {
        lastReflectedTurnRef.current = userTurns;
        void reflect({ data: { messages: withReply } }).catch(() => { /* silent */ });
      }
    } finally {
      setBusy(false);
    }
  }

  const inputDisabled = busy || introducing || !hydrated || askingPreference;
  const placeholder = introducing || !hydrated || askingPreference
    ? ""
    : busy
      ? "…"
      : "Say it the way you'd actually say it";

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
            onClick={() => {
              const next: VoiceMode = voiceMode === "voice" ? "text" : "voice";
              try { localStorage.setItem(VOICE_KEY, next); } catch { /* ignore */ }
              setVoiceMode(next);
            }}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
            title="Toggle voice"
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
                    Continue with voice
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
                <p className="text-xs text-muted-foreground">You can change this later in Settings.</p>
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
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-card px-3 py-2 transition-opacity" style={{ opacity: inputDisabled ? 0.5 : 1 }}>
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
            disabled={inputDisabled}
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
      </form>

      <MobileTabBar current="athena" />
    </div>
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
      <div className="flex items-center gap-1.5 px-1 py-2">
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
