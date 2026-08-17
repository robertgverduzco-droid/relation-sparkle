import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listMyConnections } from "@/lib/connections.functions";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Connections — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

type Conn = { id: string; other_id: string; other_name: string; status: string; opened_at: string };

const STATUS_LABEL: Record<string, string> = {
  open: "just opened",
  meeting_planned: "meeting planned",
  met: "reflecting",
};

function ConnectionsPage() {
  const list = useServerFn(listMyConnections);
  const [conns, setConns] = useState<Conn[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await list();
        setConns(res.connections);
      } catch {
        setConns([]);
      }
    })();
  }, [list]);

  return (
    <div className="screen-shell safe-top pb-24 px-6 pt-8" data-testid="connections-screen">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Connections</p>
      <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
        The people you both said <em className="italic text-primary">yes</em> to.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        When you and someone Athena introduced you to both accept, a quiet space opens here to plan how you'll meet — and to
        reflect afterwards.
      </p>

      <div className="mt-8 space-y-3">
        {conns === null ? (
          <p className="text-sm text-muted-foreground">A moment…</p>
        ) : conns.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
            <p className="font-display text-xl text-foreground">Nothing open yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              A connection opens the moment both people say yes to an introduction.
            </p>
          </div>
        ) : (
          conns.map((c) => (
            <Link
              key={c.id}
              data-testid="connection-card"
              to="/connections/$id"
              params={{ id: c.id }}
              className="block rounded-3xl border border-border bg-card px-5 py-4 transition hover:border-primary/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-lg text-foreground">{c.other_name}</p>
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                opened {new Date(c.opened_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </Link>
          ))
        )}
      </div>

      <MobileTabBar current="introductions" />
    </div>
  );
}
