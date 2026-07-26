import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Loader2, Search } from "lucide-react";
import { askInterview, finalizeInterview } from "@/lib/interview.functions";
import { checkExpiredShares, createShareLink, listActiveShares, listRevokedShares, revokeShareById, revokeShareLink } from "@/lib/interview-share.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


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

function splitHighlight(text: string, query: string) {
  if (!query.trim()) return [{ text, match: false }];
  const q = query.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let remaining = text;
  while (remaining.length) {
    const idx = remaining.toLowerCase().indexOf(q);
    if (idx < 0) {
      parts.push({ text: remaining, match: false });
      break;
    }
    if (idx > 0) parts.push({ text: remaining.slice(0, idx), match: false });
    parts.push({ text: remaining.slice(idx, idx + q.length), match: true });
    remaining = remaining.slice(idx + q.length);
  }
  return parts;
}

function Highlight({ text, query }: { text?: string | null; query: string }) {
  if (!text) return null;
  return (
    <>
      {splitHighlight(text, query).map((part, i) =>
        part.match ? (
          <span key={i} className="rounded bg-primary/20 px-0.5 text-foreground">{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
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
  const [revokedPage, setRevokedPage] = useState(0);
  const [revokedSort, setRevokedSort] = useState<"newest" | "oldest">("newest");
  const [revokedSearch, setRevokedSearch] = useState("");
  const debouncedSearch = useDebouncedValue(revokedSearch, 300);
  const [revokedFilters, setRevokedFilters] = useState<Set<string>>(new Set());
  const REVOKED_PAGE_SIZE = 10;
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

  const sortedRevokedShares = useMemo(() => {
    const sorted = [...revokedShares];
    sorted.sort((a, b) => {
      const aTime = a.revoked_at ? new Date(a.revoked_at).getTime() : 0;
      const bTime = b.revoked_at ? new Date(b.revoked_at).getTime() : 0;
      return revokedSort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return sorted;
  }, [revokedShares, revokedSort]);

  function toggleRevokedSort() {
    const next = revokedSort === "newest" ? "oldest" : "newest";
    setRevokedSort(next);
    setRevokedPage(0);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ri_revoked_sort", next);
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
        const savedRevokedSort = window.localStorage.getItem("ri_revoked_sort");
        if (savedRevokedSort === "newest" || savedRevokedSort === "oldest") {
          setRevokedSort(savedRevokedSort);
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

  function revokerCategory(r: (typeof revokedShares)[number]) {
    if (r.revoked_by_self) return { key: "you", label: "You" };
    if (!r.revoked_by) return { key: "system", label: "System" };
    if (r.revoked_by_name) return { key: `name:${r.revoked_by_name}`, label: r.revoked_by_name };
    return { key: "other", label: "Another user" };
  }

  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of revokedShares) {
      const { key, label } = revokerCategory(r);
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [revokedShares]);

  const filteredRevokedShares = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const hasFilters = revokedFilters.size > 0;
    return sortedRevokedShares.filter((r) => {
      const { key } = revokerCategory(r);
      const matchesFilter = !hasFilters || revokedFilters.has(key);
      if (!q) return matchesFilter;
      const url = urlFor(r.token).toLowerCase();
      const by = (r.revoked_by_name ?? "").toLowerCase();
      const matchesSearch = url.includes(q) || r.token.toLowerCase().includes(q) || by.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [sortedRevokedShares, debouncedSearch, revokedFilters]);

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
      setRevokedPage(0);
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
      if (historyOpen || revokedLoaded) refreshRevoked();
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

            <div className="mt-4 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <button
                  type="button"
                  onClick={toggleHistory}
                  className="flex items-center gap-2 hover:text-foreground"
                  aria-expanded={historyOpen}
                >
                  <span>Revocation history</span>
                  <span>{historyOpen ? "Hide" : "Show"}</span>
                </button>
                {historyOpen && revokedLoaded && filteredRevokedShares.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleRevokedSort}
                    className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-foreground hover:border-primary/50"
                    aria-label={`Sort ${revokedSort === "newest" ? "oldest first" : "newest first"}`}
                  >
                    {revokedSort === "newest" ? "Newest first" : "Oldest first"}
                  </button>
                )}
              </div>
              {historyOpen && (
                <div className="mt-2 space-y-2">
                  {revokedLoaded && availableCategories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {availableCategories.map(([key, label]) => {
                        const active = revokedFilters.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setRevokedFilters((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                              setRevokedPage(0);
                            }}
                            className={
                              "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.15em] transition " +
                              (active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground")
                            }
                            aria-pressed={active}
                          >
                            {label}
                          </button>
                        );
                      })}
                      {revokedFilters.size > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRevokedFilters(new Set());
                            setRevokedPage(0);
                          }}
                          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={revokedSearch}
                      onChange={(e) => setRevokedSearch(e.target.value)}
                      placeholder="Search link or ID"
                      className="w-full rounded-full border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  {!revokedLoaded ? (
                    <p className="text-xs text-muted-foreground">Loading history…</p>
                  ) : filteredRevokedShares.length === 0 ? (
                    <p className="text-xs text-ink-soft">
                      {revokedSearch.trim() || revokedFilters.size > 0 ? "No revoked links match your filters." : "No revoked links yet."}
                    </p>
                  ) : (
                    (() => {
                      const totalPages = Math.max(1, Math.ceil(filteredRevokedShares.length / REVOKED_PAGE_SIZE));
                      const page = Math.min(revokedPage, totalPages - 1);
                      const start = page * REVOKED_PAGE_SIZE;
                      const pageItems = filteredRevokedShares.slice(start, start + REVOKED_PAGE_SIZE);
                      return (
                        <>
                          <ul className="space-y-2">
                            {pageItems.map((r) => (
                              <li key={r.id} className="rounded-xl border border-border/60 bg-background px-3 py-2">
                                <div className="truncate text-xs text-muted-foreground line-through">
                                  <Highlight text={urlFor(r.token)} query={debouncedSearch} />
                                </div>
                                <div className="truncate text-[10px] font-mono text-muted-foreground">
                                  Token: <Highlight text={r.token} query={debouncedSearch} />
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                                  <span>
                                    Revoked {r.revoked_at ? new Date(r.revoked_at).toLocaleString() : "—"}
                                    {" · by "}
                                    <span className="text-foreground">
                                      <Highlight
                                        text={r.revoked_by_self ? "you" : r.revoked_by_name || (r.revoked_by ? "another user" : "system")}
                                        query={debouncedSearch}
                                      />
                                    </span>
                                  </span>
                                  <span>Created {new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {totalPages > 1 && (
                            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                              <button
                                type="button"
                                onClick={() => setRevokedPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="rounded-md border border-border/60 px-2 py-1 disabled:opacity-40"
                              >
                                Prev
                              </button>
                              <span>
                                Page {page + 1} of {totalPages} · {filteredRevokedShares.length} total
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevokedPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="rounded-md border border-border/60 px-2 py-1 disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              )}
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
