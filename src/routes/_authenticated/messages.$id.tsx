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
import { ReportSheet } from "@/components/report-sheet";
import { FieldBack } from "@/components/field-back";
import { ArrowRight, ChevronLeft } from "lucide-react";

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

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  };

  let lastDay = "";

  return (
    <div className="surface" data-testid="conversation-screen">
      <FieldBack />
      <div className="surface-top">
        <button
          onClick={() => navigate({ to: "/messages" })}
          className="vbtn"
          aria-label="Back to messages"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
        </button>
        <div className="ms-name">{other?.name ?? "…"}</div>
        <button onClick={() => setMenuOpen((v) => !v)} className="vbtn" aria-label="More">
          <span className="text-[var(--lavender)] opacity-60">⋯</span>
        </button>
      </div>

      {menuOpen && (
        <div className="ms-menu">
          <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}>Report a concern</button>
          <button
            className="ms-menu-warn"
            onClick={() => { setMenuOpen(false); void doBlock(); }}
          >
            Block {other?.name ?? "them"}
          </button>
        </div>
      )}

      <div ref={scrollerRef} className="surface-scroll ms-thread">
        {messages.length === 0 ? (
          <p className="ms-quiet">Nothing said yet. There is no right way to start.</p>
        ) : (
          messages.map((m) => {
            const day = dayLabel(m.created_at);
            const rule = day !== lastDay ? day : null;
            lastDay = day;
            const athena = m.kind === "system" || m.kind === "safety_notice";
            return (
              <div key={m.id}>
                {rule && (
                  <div className="day-rule">
                    <span className="line" />
                    <span className="sys">{rule}</span>
                    <span className="line" />
                  </div>
                )}
                {athena ? (
                  <div className="ms-athena">
                    <div className="sys">Athena</div>
                    <p>{m.body}</p>
                  </div>
                ) : (
                  <div className={`turn ${m.mine ? "mine" : "theirs"}`}>
                    <div className="whom">{m.mine ? "You" : (other?.name ?? "Them")}</div>
                    <p>{m.body}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={submit} className="ms-compose">
        <div className="ms-box">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(e as unknown as React.FormEvent); } }}
            rows={1}
            placeholder={other ? `Write to ${other.name}` : "Write a message"}
          />
          <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
            <ArrowRight className="h-[17px] w-[17px]" strokeWidth={1.4} />
          </button>
        </div>
      </form>

      {reportOpen && (
        <ReportSheet other={other?.name ?? "them"} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      )}
    </div>
  );
}

