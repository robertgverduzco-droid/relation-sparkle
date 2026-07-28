import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversation,
  sendMessage,
  blockUser,
  reportUser,
} from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversationPage,
});

type Msg = { id: string; mine: boolean; body: string; created_at: string; kind: string };

function ConversationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const block = useServerFn(blockUser);
  const report = useServerFn(reportUser);

  const [other, setOther] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const uidRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await get({ data: { conversation_id: id } });
      setOther(res.other);
      setMessages(res.messages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load conversation.");
      navigate({ to: "/messages" });
    }
  }, [get, id, navigate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      uidRef.current = data.user?.id ?? null;
    })();
    const channel = supabase
      .channel(`conv:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as { id: string; sender_id: string | null; body: string; created_at: string; kind: string };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                mine: row.sender_id === uidRef.current,
                body: row.body,
                created_at: row.created_at,
                kind: row.kind,
              },
            ];
          });
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    try {
      await send({ data: { conversation_id: id, body: text } });
      // realtime will echo; but insert optimistic in case of local echo latency
    } catch (e) {
      setInput(text);
      toast.error(e instanceof Error ? e.message : "Message didn't send.");
    } finally {
      setBusy(false);
    }
  }

  async function doBlock() {
    if (!other) return;
    if (!confirm(`Block ${other.name}? They'll no longer be able to message you and any shared connection will close.`)) return;
    try {
      await block({ data: { user_id: other.id } });
      toast.success("Blocked. You're safe.");
      navigate({ to: "/messages" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't block.");
    }
  }

  async function submitReport(category: "harassment" | "unsafe" | "spam" | "impersonation" | "other", details: string) {
    if (!other) return;
    try {
      await report({ data: { reported_id: other.id, conversation_id: id, category, details: details || undefined } });
      toast.success("Thank you. Athena's safety team will look into this.");
      setReportOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit report.");
    }
  }

  return (
    <div className="screen-shell safe-top flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-border/60 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/messages" })}
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          ← Messages
        </button>
        <span className="font-display text-[1.1rem] text-foreground">{other?.name ?? "…"}</span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
          aria-label="More"
        >
          ⋯
        </button>
      </header>

      {menuOpen && (
        <div className="absolute right-4 top-14 z-30 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          <button
            onClick={() => { setMenuOpen(false); setReportOpen(true); }}
            className="block w-full px-5 py-3 text-left text-sm text-foreground hover:bg-accent"
          >
            Report a concern
          </button>
          <button
            onClick={() => { setMenuOpen(false); void doBlock(); }}
            className="block w-full px-5 py-3 text-left text-sm text-destructive hover:bg-accent"
          >
            Block {other?.name ?? "them"}
          </button>
        </div>
      )}

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground pt-8">
            Say hello — no pressure, no scripts.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  m.mine
                    ? "max-w-[80%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-[15px] text-primary-foreground"
                    : "max-w-[80%] rounded-3xl rounded-bl-lg bg-card border border-border px-4 py-2.5 text-[15px] text-foreground"
                }
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="safe-bottom border-t border-border/60 bg-background/90 backdrop-blur px-3 pt-3 pb-3">
        <div className="flex items-end gap-2 rounded-3xl border border-input bg-card px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(e as unknown as React.FormEvent); } }}
            rows={1}
            placeholder="Write a message"
            className="min-h-[24px] max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>

      {reportOpen && (
        <ReportSheet other={other?.name ?? "them"} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      )}
    </div>
  );
}

function ReportSheet({
  other,
  onClose,
  onSubmit,
}: {
  other: string;
  onClose: () => void;
  onSubmit: (c: "harassment" | "unsafe" | "spam" | "impersonation" | "other", details: string) => void;
}) {
  const [cat, setCat] = useState<"harassment" | "unsafe" | "spam" | "impersonation" | "other">("harassment");
  const [details, setDetails] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl bg-card p-6 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-lg text-foreground">Report a concern about {other}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anything you share is private. Athena's safety team reviews all reports.
        </p>
        <div className="mt-4 space-y-2">
          {(["harassment", "unsafe", "spam", "impersonation", "other"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm ${cat === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground"}`}
            >
              {labelFor(k)}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What happened? (optional)"
          className="mt-3 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSubmit(cat, details)}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Submit
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function labelFor(k: string): string {
  switch (k) {
    case "harassment": return "Harassment or disrespect";
    case "unsafe": return "I felt unsafe";
    case "spam": return "Spam or off-platform pressure";
    case "impersonation": return "This didn't seem like a real person";
    default: return "Something else";
  }
}
