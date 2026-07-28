import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { listConversations } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MessagesPage,
});

type Conv = Awaited<ReturnType<typeof listConversations>>["conversations"][number];

function MessagesPage() {
  const list = useServerFn(listConversations);
  const [items, setItems] = useState<Conv[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await list();
        setItems(res.conversations);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't load messages.");
      }
    })();
  }, [list]);

  return (
    <div className="screen-shell safe-top pb-28 px-6 pt-8">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Messages</p>
      <h1 className="mt-2 font-display text-[2rem] leading-tight text-foreground">
        Your conversations
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Real conversations open once you both agree to meet.
      </p>

      {items === null ? (
        <p className="mt-10 text-sm text-muted-foreground">A moment…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="font-display text-xl text-foreground">Nothing here yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            When Athena introduces you to someone and you both open the door, your
            conversation will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                to="/messages/$id"
                params={{ id: c.id }}
                className="block rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/60"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-[1.15rem] text-foreground">{c.other_name}</p>
                  {c.last_message_at && (
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {timeAgo(c.last_message_at)}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                  {c.preview
                    ? (c.preview.mine ? "You: " : "") + c.preview.body
                    : "Say hello."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <MobileTabBar current="messages" />
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
