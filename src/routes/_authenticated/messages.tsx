import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldBack } from "@/components/field-back";
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
    <div className="surface fade-in-quick" data-testid="messages-screen">
      <FieldBack />
      <div className="surface-top">
        <span aria-hidden style={{ width: "34px" }} />
        <div className="sys" style={{ opacity: 0.6 }}>
          Messages
        </div>
        <span aria-hidden style={{ width: "34px" }} />
      </div>

      <div className="surface-scroll">
        {items === null ? (
          <p className="ms-quiet">A moment…</p>
        ) : items.length === 0 ? (
          <p className="ms-quiet" data-testid="messages-empty">
            No one is here yet. When an introduction opens on both sides, the conversation begins
            here — and it belongs to the two of you.
          </p>
        ) : (
          <ul className="ms-list">
            {items.map((c) => (
              <li key={c.id}>
                <Link
                  data-testid="message-thread-link"
                  to="/messages/$id"
                  params={{ id: c.id }}
                  className="ms-row"
                >
                  <div className="ms-row-top">
                    <span className="ms-who">{c.other_name}</span>
                    {c.last_message_at && <span className="ms-when">{timeAgo(c.last_message_at)}</span>}
                  </div>
                  <p className="ms-prev">
                    {c.preview ? (c.preview.mine ? "You: " : "") + c.preview.body : "Nothing said yet."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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
