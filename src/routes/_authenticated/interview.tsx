import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askInterview, finalizeInterview } from "@/lib/interview.functions";
import { checkExpiredShares, createShareLink, listActiveShares, revokeShareById } from "@/lib/interview-share.functions";
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<Array<{ id: string; token: string; created_at: string; expires_at: string | null }>>([]);
  const [sharesLoaded, setSharesLoaded] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(0);
  const createShare = useServerFn(createShareLink);
  const listShares = useServerFn(listActiveShares);
  const revokeOne = useServerFn(revokeShareById);
  const checkExpired = useServerFn(checkExpiredShares);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem("ri_target_turns");
        if (saved) {
          const n = parseInt(saved, 10);
          if (!Number.isNaN(n)) setTargetTurns(n);
        }
        const savedExpiry = window.localStorage.getItem("ri_share_expiry_hours");
        if (savedExpiry !== null) {
          const n = parseInt(savedExpiry, 10);
          if (!Number.isNaN(n)) setExpiresInHours(n);
        }
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
      // Notify user of any shared links that expired since last visit.
      try {
        const res = await checkExpired();
        if (res.expired > 0) {
          toast.message(
            res.expired === 1
              ? "Your shared transcript link has expired."
              : `${res.expired} shared transcript links have expired.`,
            { description: "Viewers can no longer access it. Create a new link to share again." },
          );
        }
      } catch { /* ignore */ }
    })();
  }, [checkExpired]);

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

  const shareUrl = shareToken && typeof window !== "undefined"
    ? `${window.location.origin}/shared/interview/${shareToken}`
    : null;

  async function openShare() {
    setShareOpen(true);
    if (shareToken) return;
    try {
      const res = await fetchShare();
      if (res.token) {
        setShareToken(res.token);
        setShareExpiresAt(res.expires_at);
      }
    } catch { /* ignore */ }
  }

  async function createOrCopy() {
    setShareBusy(true);
    try {
      let token = shareToken;
      let expires_at = shareExpiresAt;
      if (!token) {
        const res = await createShare({ data: { expiresInHours: expiresInHours as 0 | 1 | 24 | 168 | 720 } });
        token = res.token;
        expires_at = res.expires_at;
        setShareToken(token);
        setShareExpiresAt(expires_at);
      }
      const url = `${window.location.origin}/shared/interview/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.success("Share link ready");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create link");
    } finally {
      setShareBusy(false);
    }
  }

  async function revoke() {
    if (typeof window !== "undefined" && !window.confirm("Revoke this link? Anyone with it will lose access.")) return;
    setShareBusy(true);
    try {
      await revokeShare();
      setShareToken(null);
      setShareExpiresAt(null);
      toast.success("Link revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't revoke");
    } finally {
      setShareBusy(false);
    }
  }



  async function send() {
    const text = input.trim();
    if (!text || busy || done) return;
    const now = new Date().toISOString();
    const next: Msg[] = [...messages, { role: "user", content: text, ts: now }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setResumed(false);
    try {
      if (!started) setStarted(true);
      const res = await ask({ data: { messages: next, targetTurns } });
      const withReply: Msg[] = [...next, { role: "assistant", content: res.reply, ts: new Date().toISOString() }];
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

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 54;
    const marginTop = 64;
    const marginBottom = 54;
    const maxW = pageW - marginX * 2;
    let y = marginTop;

    const fmt = (ts?: string) => (ts ? new Date(ts).toLocaleString() : "—");
    const line = (h: number) => {
      if (y + h > pageH - marginBottom) { doc.addPage(); y = marginTop; }
    };

    // Header
    doc.setFont("times", "bold"); doc.setFontSize(18);
    doc.text("The Interview", marginX, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
    doc.text(`Exported ${new Date().toLocaleString()}`, marginX, y); y += 14;
    doc.text(`Status: ${done ? "Completed" : "In progress"}   ·   Turn ${completedTurns} of ${TARGET_TURNS}`, marginX, y);
    y += 20;
    doc.setDrawColor(200); doc.line(marginX, y, pageW - marginX, y); y += 18;
    doc.setTextColor(20);

    for (const m of messages) {
      const speaker = m.role === "user" ? "You" : "Interviewer";
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(120);
      line(14);
      doc.text(`${speaker}   ·   ${fmt(m.ts)}`, marginX, y); y += 14;
      doc.setFont("times", "normal"); doc.setFontSize(11); doc.setTextColor(20);
      const lines = doc.splitTextToSize(m.content, maxW) as string[];
      for (const ln of lines) {
        line(15);
        doc.text(ln, marginX, y); y += 15;
      }
      y += 10;
    }

    if (done) {
      line(28);
      doc.setDrawColor(200); doc.line(marginX, y, pageW - marginX, y); y += 16;
      doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text("Interview completed.", marginX, y);
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`interview-transcript-${stamp}.pdf`);
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
          <div className="flex items-center gap-3">
            {started && !done && (
              <button
                type="button"
                onClick={() => setAdjustOpen((v) => !v)}
                className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
              >
                Length
              </button>
            )}
            {hydrated && messages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={openShare}
                  className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
                >
                  Export
                </button>
              </>
            )}
            {!(started && !done) && !(hydrated && messages.length > 1) && <span className="w-10" />}
          </div>
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
        {shareOpen && (
          <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Shareable link</p>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            {shareUrl ? (
              <>
                <p className="mt-2 text-xs text-ink-soft">
                  {shareExpiresAt
                    ? `Anyone with this link can read your transcript until ${new Date(shareExpiresAt).toLocaleString()} or you revoke it.`
                    : "Anyone with this link can read your transcript until you revoke it."}
                </p>
                <div className="mt-2 truncate rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-foreground">
                  {shareUrl}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={createOrCopy}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-60"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={revoke}
                    className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-foreground hover:border-destructive/60 disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs text-ink-soft">
                  No active link. Choose how long it should stay active, then create it.
                </p>
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Expires after</p>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {[
                      { h: 0, label: "Never" },
                      { h: 1, label: "1 hr" },
                      { h: 24, label: "24 hrs" },
                      { h: 168, label: "7 days" },
                      { h: 720, label: "30 days" },
                    ].map((o) => {
                      const active = o.h === expiresInHours;
                      return (
                        <button
                          key={o.h}
                          type="button"
                          onClick={() => {
                            setExpiresInHours(o.h);
                            if (typeof window !== "undefined") {
                              window.localStorage.setItem("ri_share_expiry_hours", String(o.h));
                            }
                          }}
                          className={
                            "rounded-full border px-2 py-1.5 text-[11px] transition " +
                            (active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary/50")
                          }
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={shareBusy}
                  onClick={createOrCopy}
                  className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-60"
                >
                  {shareBusy ? "Creating…" : "Create share link"}
                </button>
              </>
            )}
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
            <button
              onClick={exportPdf}
              className="mt-2 w-full rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:border-primary/50"
            >
              Download transcript (PDF)
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
