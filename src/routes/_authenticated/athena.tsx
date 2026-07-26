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

function buildIntro(firstName: string | null): string[] {
  const greeting = firstName ? `Hello, ${firstName}.` : "Hello.";
  return [
    greeting,
    "I'm Athena.",
    "It's a pleasure to finally meet you.",
    "Before I ever introduce you to another person, I'd like the opportunity to understand you.",
    "There are no questionnaires. There are no right answers. Simply speak naturally — every conversation helps me better understand who you are.",
    "Whenever you're ready… what's something you've been thinking about recently?",
  ];
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

  // Hydrate from Supabase, or let Athena introduce herself with a scripted first meeting.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: session }, { data: profile }] = await Promise.all([
        supabase.from("interview_sessions").select("messages").maybeSingle(),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      if (cancelled) return;
      const stored = Array.isArray(session?.messages) ? (session!.messages as Msg[]) : [];
      if (stored.length > 0) {
        setMessages(stored);
        lastReflectedTurnRef.current = stored.filter((m) => m.role === "user").length;
        setHydrated(true);
        return;
      }
      // First meeting — Athena speaks first, on her own terms.
      setHydrated(true);
      setIntroducing(true);
      const firstName = (profile?.display_name as string | null)?.split(" ")[0] ?? null;
      const lines = buildIntro(firstName);
      const accumulated: Msg[] = [];
      // Small opening beat before the first word.
      await wait(600);
      for (let i = 0; i < lines.length; i++) {
        if (cancelled) return;
        // Typing indicator beat before each line.
        await wait(i === 0 ? 400 : 900);
        if (cancelled) return;
        accumulated.push({
          role: "assistant",
          content: lines[i],
          ts: new Date().toISOString(),
        });
        setMessages([...accumulated]);
      }
      if (cancelled) return;
      setIntroducing(false);
      void persist(accumulated);
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  useEffect(() => {
    if (!hydrated) return;
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, introducing, hydrated]);

  useEffect(() => {
    if (!introducing && !busy) inputRef.current?.focus();
  }, [busy, introducing]);

  async function send() {
    const text = input.trim();
    if (!text || busy || introducing) return;
    const now = new Date().toISOString();
    const next: Msg[] = [...messages, { role: "user", content: text, ts: now }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next } });
      const withReply: Msg[] = [
        ...next,
        { role: "assistant", content: res.reply, ts: new Date().toISOString() },
      ];
      setMessages(withReply);
      void persist(withReply);

      const userTurns = withReply.filter((m) => m.role === "user").length;
      if (userTurns - lastReflectedTurnRef.current >= 6) {
        lastReflectedTurnRef.current = userTurns;
        void reflect({ data: { messages: withReply } }).catch(() => {
          /* silent — understanding evolves; a missed pass is fine */
        });
      }
    } catch {
      void persist(next);
      // Never surface developer/system errors in Athena's voice.
      toast("Athena is gathering her thoughts. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const inputDisabled = busy || introducing || !hydrated;
  const placeholder = introducing || !hydrated
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
          <span className="w-10" />
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
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-card px-3 py-2 transition-opacity" style={{ opacity: introducing ? 0.5 : 1 }}>
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
