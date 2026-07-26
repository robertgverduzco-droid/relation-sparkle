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

function AthenaPage() {
  const navigate = useNavigate();
  const ask = useServerFn(askAthena);
  const reflect = useServerFn(reflectAthena);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastReflectedTurnRef = useRef(0);

  // Hydrate from Supabase, or ask Athena to introduce herself.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("messages")
        .maybeSingle();
      const stored = Array.isArray(data?.messages) ? (data!.messages as Msg[]) : [];
      if (stored.length > 0) {
        setMessages(stored);
        lastReflectedTurnRef.current = stored.filter((m) => m.role === "user").length;
        setHydrated(true);
        return;
      }
      // First-time: let Athena introduce herself naturally.
      try {
        const res = await ask({ data: { messages: [] } });
        const intro: Msg[] = [
          { role: "assistant", content: res.reply, ts: new Date().toISOString() },
        ];
        setMessages(intro);
        void persist(intro);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Athena is quiet right now.");
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

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
    if (!hydrated) return;
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, hydrated]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
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

      // Every ~6 user turns, quietly refine Athena's understanding.
      const userTurns = withReply.filter((m) => m.role === "user").length;
      if (userTurns - lastReflectedTurnRef.current >= 6) {
        lastReflectedTurnRef.current = userTurns;
        void reflect({ data: { messages: withReply } }).catch(() => {
          /* silent — understanding evolves; a missed pass is fine */
        });
      }
    } catch (e) {
      void persist(next);
      toast.error(e instanceof Error ? e.message : "Athena couldn't respond just now.");
    } finally {
      setBusy(false);
    }
  }

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
          <p className="text-center text-sm text-muted-foreground">A moment…</p>
        ) : (
          <>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {busy && <TypingBubble />}
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
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-card px-3 py-2">
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
            placeholder={busy ? "…" : "Say it the way you'd actually say it"}
            disabled={busy}
            className="min-h-[24px] max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
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

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
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
