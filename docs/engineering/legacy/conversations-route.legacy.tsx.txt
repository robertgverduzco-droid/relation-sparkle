import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({
    meta: [
      { title: "Your conversations with Athena" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversationsPage,
});

type Msg = { role: "user" | "assistant" | "system"; content: string; ts?: string };
type Day = { key: string; label: string; messages: Msg[] };

function ConversationsPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("messages, completed_at")
        .maybeSingle();
      const msgs = Array.isArray(data?.messages) ? (data!.messages as Msg[]) : [];
      setMessages(msgs);
      setCompletedAt((data?.completed_at as string | null) ?? null);
      setLoading(false);
    })();
  }, []);

  const days = useMemo<Day[]>(() => groupByDay(messages), [messages]);
  const userTurnCount = messages.filter((m) => m.role === "user").length;
  const athenaTurnCount = messages.filter((m) => m.role === "assistant").length;

  return (
    <div className="screen-shell safe-top pb-28">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          What you and Athena have said
        </p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          Your conversations
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          This is your quiet record of everything you and Athena have spoken
          about. Only you can see it. Athena reads it too — it's part of how
          she keeps understanding you.
        </p>
        {completedAt && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Foundational conversation completed {new Date(completedAt).toLocaleDateString()}
          </p>
        )}
      </header>

      {loading ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">A moment…</p>
      ) : messages.length === 0 ? (
        <section className="mx-6 mt-8 rounded-3xl border border-border/70 bg-card p-6">
          <h2 className="font-display text-[1.4rem] text-foreground">
            Nothing here yet
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            When you speak with Athena, it will live here for you to return to.
          </p>
          <Link
            to="/athena"
            className="mt-5 block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
          >
            Talk with Athena
          </Link>
        </section>
      ) : (
        <>
          <div className="mx-6 mt-6 grid grid-cols-2 gap-2">
            <Stat label="You spoke" value={`${userTurnCount} turn${userTurnCount === 1 ? "" : "s"}`} />
            <Stat label="Athena replied" value={`${athenaTurnCount} time${athenaTurnCount === 1 ? "" : "s"}`} />
          </div>

          <div className="mt-6 space-y-8 px-6">
            {days.map((day) => (
              <section key={day.key}>
                <div className="sticky top-0 z-10 -mx-6 mb-3 bg-background/80 px-6 py-2 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {day.label}
                  </p>
                </div>
                <ul className="space-y-3">
                  {day.messages.map((m, i) => (
                    <li
                      key={`${day.key}-${i}`}
                      className={`rounded-2xl border p-4 text-[15px] leading-relaxed ${
                        m.role === "user"
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-border/70 bg-card text-foreground/90"
                      }`}
                    >
                      <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {m.role === "user" ? "You" : "Athena"}
                        {m.ts && (
                          <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                            {new Date(m.ts).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 px-6">
            <Link
              to="/athena"
              className="block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
            >
              Continue with Athena
            </Link>
          </div>
        </>
      )}

      <MobileTabBar current="none" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-[1.1rem] text-foreground">{value}</p>
    </div>
  );
}

function groupByDay(messages: Msg[]): Day[] {
  const buckets = new Map<string, Msg[]>();
  const order: string[] = [];
  for (const m of messages) {
    const d = m.ts ? new Date(m.ts) : null;
    const key = d && !Number.isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : "undated";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(m);
  }
  return order.map((key) => {
    const list = buckets.get(key)!;
    let label = "Undated";
    if (key !== "undated") {
      const [y, mo, d] = key.split("-").map(Number);
      const date = new Date(y, mo - 1, d);
      label = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
      });
    }
    return { key, label, messages: list };
  });
}
