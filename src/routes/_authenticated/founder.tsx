import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  getFounderStatus,
  getFounderHistory,
  sendFounderMessage,
} from "@/lib/founder.functions";

export const Route = createFileRoute("/_authenticated/founder")({
  head: () => ({
    meta: [
      { title: "Founder Dialogue — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FounderDialogueScreen,
});

type Turn = { role: "founder" | "athena"; content: string };

function FounderDialogueScreen() {
  const status = useServerFn(getFounderStatus);
  const history = useServerFn(getFounderHistory);
  const send = useServerFn(sendFounderMessage);

  const [state, setState] = useState<"checking" | "denied" | "ready">("checking");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await status({});
        if (!mounted) return;
        if (!s.isFounder) {
          setState("denied");
          return;
        }
        const h = await history({});
        if (!mounted) return;
        setTurns(h.turns as Turn[]);
        setState("ready");
      } catch {
        if (mounted) setState("denied");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [status, history]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((t) => [...t, { role: "founder", content: message }]);
    setBusy(true);
    try {
      const res = await send({ data: { message } });
      setTurns((t) => [...t, { role: "athena", content: res.reply }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "athena", content: "Something went wrong reaching me just now. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Checking…</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">
          This page isn’t available.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60 px-5 py-4">
        <h1 className="text-base font-medium text-foreground">Founder Dialogue</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          System governance. No member information is reachable here.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {turns.length === 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ask me about the system, Robert — doctrine, my education, where runtime and
            Constitution disagree, where the product makes my role harder.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={
              t.role === "founder"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary/10 px-4 py-3 text-sm text-foreground"
                : "max-w-[95%] whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            }
          >
            {t.content}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">Athena is thinking…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-border/60 px-5 py-4">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Speak with Athena about the system…"
            className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
