import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { askInterview, finalizeInterview } from "@/lib/interview.functions";
import { checkExpiredShares, createShareLink, listActiveShares, listRevokedShares, revokeShareById, revokeShareLink } from "@/lib/interview-share.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";


export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "The interview — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: InterviewPage,
});

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { label: "No expiry", status: "none" as const };
  const end = new Date(target).getTime();
  const remaining = end - now;
  if (remaining <= 0) return { label: "Expired", status: "expired" as const };
  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  let status: "urgent" | "soon" | "safe" | "none" | "expired" = "safe";
  if (remaining < 1000 * 60 * 60) status = "urgent";
  else if (remaining < 1000 * 60 * 60 * 24) status = "soon";
  return { label: `${parts.join(" ")} remaining`, status };
}

function ShareExpiry({ expiresAt }: { expiresAt?: string | null }) {
  const { label, status } = useCountdown(expiresAt ?? undefined);
  const color =
    status === "expired"
      ? "text-destructive"
      : status === "urgent"
        ? "text-ember"
        : status === "soon"
          ? "text-amber-600"
          : "text-muted-foreground";
  const dot =
    status === "expired"
      ? "bg-destructive"
      : status === "urgent"
        ? "bg-ember"
        : status === "soon"
          ? "bg-amber-500"
          : "bg-emerald-500";
  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot} ${status === "urgent" || status === "soon" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

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
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [expiresInHours, setExpiresInHours] = useState<number>(0);
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revokedShares, setRevokedShares] = useState<Array<{ id: string; token: string; created_at: string; expires_at: string | null; revoked_at: string | null; revoked_by: string | null; revoked_by_name: string | null; revoked_by_self: boolean }>>([]);
  const [revokedLoaded, setRevokedLoaded] = useState(false);
  const createShare = useServerFn(createShareLink);
  const listShares = useServerFn(listActiveShares);
  const listRevoked = useServerFn(listRevokedShares);
  const revokeOne = useServerFn(revokeShareById);
  const revokeAll = useServerFn(revokeShareLink);
  const checkExpired = useServerFn(checkExpiredShares);

  const sortedShares = useMemo(
    () =>
      [...shares].sort((a, b) => {
        if (a.expires_at && b.expires_at) return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        if (a.expires_at) return -1;
        if (b.expires_at) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [shares],
  );

  const filteredShares = useMemo(() => {
    if (!showActiveOnly) return sortedShares;
    return sortedShares.filter((s) => {
      if (!s.expires_at) return true;
      return new Date(s.expires_at).getTime() > Date.now();
    });
  }, [sortedShares, showActiveOnly]);

  function toggleShowActiveOnly() {
    const next = !showActiveOnly;
    setShowActiveOnly(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ri_show_active_only", String(next));
    }
  }

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
        const savedActiveOnly = window.localStorage.getItem("ri_show_active_only");
        if (savedActiveOnly !== null) {
          setShowActiveOnly(savedActiveOnly === "true");
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

  function urlFor(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/shared/interview/${token}`
      : `/shared/interview/${token}`;
  }

  const refreshShares = useCallback(async () => {
    try {
      const res = await listShares();
      setShares(res.shares);
    } catch { /* ignore */ }
    finally { setSharesLoaded(true); }
  }, [listShares]);

  const refreshRevoked = useCallback(async () => {
    try {
      const res = await listRevoked();
      setRevokedShares(res.revoked);
    } catch { /* ignore */ }
    finally { setRevokedLoaded(true); }
  }, [listRevoked]);

  async function openShare() {
    setShareOpen(true);
    if (!sharesLoaded) await refreshShares();
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && !revokedLoaded) await refreshRevoked();
  }


  async function createNew() {
    setShareBusy(true);
    try {
      const res = await createShare({ data: { expiresInHours: expiresInHours as 0 | 1 | 24 | 168 | 720 } });
      setShares((prev) => [{ id: res.id, token: res.token, created_at: res.created_at, expires_at: res.expires_at }, ...prev]);
      try {
        await navigator.clipboard.writeText(urlFor(res.token));
        toast.success("Link created and copied");
      } catch {
        toast.success("Link created");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create link");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyOne(token: string) {
    try {
      await navigator.clipboard.writeText(urlFor(token));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function revokeShare(id: string) {
    setRevokingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await revokeOne({ data: { id } });
      setShares((prev) => prev.filter((s) => s.id !== id));
      toast.success("Link revoked");
      if (historyOpen || revokedLoaded) refreshRevoked();
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Couldn’t revoke link: ${detail}`);
    } finally {
      setRevokingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function revokeAllShares() {
    setShareBusy(true);
    try {
      await revokeAll();
      setShares([]);
      toast.success("All links revoked");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Please try again.";
      toast.error(`Couldn’t revoke all links: ${detail}`);
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleShowActiveOnly}
                  className={
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] transition " +
                    (showActiveOnly
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground")
                  }
                  aria-pressed={showActiveOnly}
                >
                  <span className={`h-2 w-2 rounded-full ${showActiveOnly ? "bg-primary" : "bg-muted-foreground/50"}`} />
                  Active only
                </button>
                {filteredShares.length > 0 && (
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={revokeAllShares}
                    className="rounded-full border border-destructive/60 bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {shareBusy ? "Revoking…" : "Revoke all"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
            {!sharesLoaded ? (
              <p className="mt-3 text-xs text-muted-foreground">Loading your links…</p>
            ) : filteredShares.length === 0 ? (
              <p className="mt-2 text-xs text-ink-soft">
                {showActiveOnly ? "No active links right now." : "No active links yet. Choose how long a new link should stay active, then create it."}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {filteredShares.map((s) => (
                  <li key={s.id} className="rounded-xl border border-border/60 bg-background px-3 py-2">
                    <div className="truncate text-xs text-foreground">{urlFor(s.token)}</div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      <span>
                        Created {new Date(s.created_at).toLocaleString()}
                        {" · "}
                        <ShareExpiry expiresAt={s.expires_at} />
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyOne(s.token)}
                          className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-foreground hover:border-primary/50"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={shareBusy || revokingIds.has(s.id)}
                          onClick={() => revokeShare(s.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-foreground hover:border-destructive/60 disabled:opacity-60"
                        >
                          {revokingIds.has(s.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Revoking…
                            </>
                          ) : (
                            "Revoke"
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Create new link · expires after</p>
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
              <button
                type="button"
                disabled={shareBusy}
                onClick={createNew}
                className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-60"
              >
                {shareBusy ? "Working…" : "Create link"}
              </button>
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
