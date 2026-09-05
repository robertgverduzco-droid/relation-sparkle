import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { FieldBack } from "@/components/field-back";

export const Route = createFileRoute("/_authenticated/athena/history")({
  head: () => ({
    meta: [
      { title: "Past conversation — Athena" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

type Turn = { role: "user" | "assistant"; content: string; ts?: string };

/**
 * The full transcript — read only. Nothing here writes, and nothing here
 * advertises itself: it is reached from the Athena settings sheet.
 */
function HistoryPage() {
  const [turns, setTurns] = useState<Turn[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("messages")
        .maybeSingle();
      if (cancelled) return;
      const msgs = Array.isArray(data?.messages) ? (data!.messages as Turn[]) : [];
      setTurns(msgs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen-shell safe-top relative pb-16" data-testid="athena-history">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[var(--void)]" />
      <header className="relative px-6 pt-7 pb-4 text-center">
        <span className="font-display text-[13px] tracking-[0.3em] text-muted-foreground">
          PAST CONVERSATION
        </span>
      </header>

      <div className="mx-auto w-full max-w-[36rem] flex-1 overflow-y-auto px-6 py-6">
        {turns === null ? (
          <p className="text-center text-sm text-muted-foreground">A moment…</p>
        ) : turns.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        ) : (
          <div className="space-y-6">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "text-right" : ""}>
                <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t.role === "user" ? "You" : "Athena"}
                </span>
                <div className="prose-athena inline-block max-w-full text-left text-[15px] leading-relaxed text-foreground">
                  <ReactMarkdown>{t.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FieldBack label="Back" />
    </div>
  );
}
