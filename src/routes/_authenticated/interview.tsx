import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askInterview, finalizeInterview } from "@/lib/interview.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "The interview — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: InterviewPage,
});

type Msg = { role: "user" | "assistant"; content: string; ts?: string };

const OPENING: Msg = {
  role: "assistant",
  content:
    "Hello. Take a breath before we start.\n\nThis is a short conversation — about five minutes — that helps me understand who you are beneath the surface. There are no right answers. Speak the way you'd speak to someone you trust.\n\nTo begin: what's something you find yourself caring deeply about lately?",
};

function InterviewPage() {
  const navigate = useNavigate();
  const ask = useServerFn(askInterview);
  const finalize = useServerFn(finalizeInterview);
  const [messages, setMessages] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [targetTurns, setTargetTurns] = useState<number>(7);
  const [started, setStarted] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("ri_target_turns") : null;
      if (saved) {
        const n = parseInt(saved, 10);
        if (!Number.isNaN(n)) setTargetTurns(n);
      }
      const [sessionRes, intelRes] = await Promise.all([
        supabase.from("interview_sessions").select("messages, completed_at").maybeSingle(),
        supabase.from("user_intelligence").select("interview_target_turns").maybeSingle(),
      ]);
      if (intelRes.data?.interview_target_turns) {
        setTargetTurns(intelRes.data.interview_target_turns);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ri_target_turns", String(intelRes.data.interview_target_turns));
        }
      }
      const data = sessionRes.data;
      if (data && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages as Msg[]);
        setStarted(true);
        if (data.completed_at) setDone(true);
        else setResumed(true);
      }
      setHydrated(true);
    })();
  }, []);

  const persist = useCallback(async (msgs: Msg[], completed: boolean) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase.from("interview_sessions").upsert(
      { user_id: uid, messages: msgs, completed_at: completed ? new Date().toISOString() : null },
      { onConflict: "user_id" },
    );
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, hydrated]);

  useEffect(() => { inputRef.current?.focus(); }, [busy, done]);


  async function send() {
    const text = input.trim();
    if (!text || busy || done) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setResumed(false);
    try {
      if (!started) setStarted(true);
      const res = await ask({ data: { messages: next, targetTurns } });
      const withReply: Msg[] = [...next, { role: "assistant", content: res.reply }];
      setMessages(withReply);
      if (res.done) setDone(true);
      void persist(withReply, res.done);
    } catch (e) {
      void persist(next, false);
      toast.error(e instanceof Error ? e.message : "The interviewer couldn't respond");
    } finally {
      setBusy(false);
    }
  }


  async function saveAndFinish() {
    setSaving(true);
    try {
      await finalize({ data: { messages } });
      toast.success("Saved to your intelligence.");
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const TARGET_TURNS = targetTurns;
  const userTurns = messages.filter((m) => m.role === "user").length;
  const completedTurns = done ? TARGET_TURNS : Math.min(userTurns, TARGET_TURNS);
  const progressPct = (completedTurns / TARGET_TURNS) * 100;
  const showSettings = hydrated && !started && !done;

  const TURN_OPTIONS = [5, 7, 10, 12];
  function chooseTurns(n: number) {
    setTargetTurns(n);
    if (typeof window !== "undefined") window.localStorage.setItem("ri_target_turns", String(n));
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      await supabase
        .from("user_intelligence")
        .upsert({ user_id: uid, interview_target_turns: n }, { onConflict: "user_id" });
    })();
  }

  function adjustDuringSession(n: number) {
    if (n === targetTurns) { setAdjustOpen(false); return; }
    const shorter = n < userTurns;
    const msg = shorter
      ? `You've already had ${userTurns} exchanges. Setting the length to ${n} will wrap the conversation up soon. Continue?`
      : `Change the interview length from ${targetTurns} to ${n} exchanges? The interviewer will pace itself to the new length.`;
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    chooseTurns(n);
    setAdjustOpen(false);
    toast.success(`Interview length set to ${n} exchanges.`);
  }

  return (
    <div className="screen-shell safe-top">
      <header className="px-6 pt-6 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/home" })} className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            ← Leave
          </button>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">The Interview</span>
          {started && !done ? (
            <button
              type="button"
              onClick={() => setAdjustOpen((v) => !v)}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              Length
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>
        {hydrated && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>{done ? "Complete" : "Progress"}</span>
              <span>Turn {completedTurns} of {TARGET_TURNS}</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        {adjustOpen && started && !done && (
          <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Adjust length</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {TURN_OPTIONS.map((n) => {
                const active = n === targetTurns;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => adjustDuringSession(n)}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm transition " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50")
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>


      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {!hydrated ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {resumed && (
              <div className="mx-auto max-w-[90%] rounded-2xl border border-border/60 bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
                Welcome back — picking up where you left off.
              </div>
            )}
            {showSettings && (
              <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card/60 p-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Before we begin</p>
                <p className="mt-2 font-display text-lg text-foreground">How long would you like this to be?</p>
                <p className="mt-1 text-sm text-ink-soft">Choose the number of exchanges. You can change this later.</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {TURN_OPTIONS.map((n) => {
                    const active = n === targetTurns;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => chooseTurns(n)}
                        className={
                          "rounded-full border px-3 py-2 text-sm transition " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50")
                        }
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  About {Math.round(targetTurns * 0.7)}–{Math.round(targetTurns * 1)} minutes. Send your first reply to begin.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {busy && <TypingBubble />}
          </>
        )}

        {done && (
          <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-5">
            <p className="font-display text-lg text-foreground">The interview is complete.</p>
            <p className="mt-1 text-sm text-ink-soft">
              I'll distill what you shared into your Living Profile. You can always add more later.
            </p>
            <button
              onClick={saveAndFinish}
              disabled={saving}
              className="mt-4 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Distilling…" : "Save to my profile"}
            </button>
          </div>
        )}
      </div>

      {!done && (
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="safe-bottom border-t border-border/60 bg-background/90 backdrop-blur px-4 pt-3 pb-3"
        >
          <div className="flex items-end gap-2 rounded-3xl border border-input bg-card px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
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
      )}
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
        <Dot delay="0ms" /><Dot delay="150ms" /><Dot delay="300ms" />
      </div>
    </div>
  );
}
function Dot({ delay }: { delay: string }) {
  return <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: delay }} />;
}
