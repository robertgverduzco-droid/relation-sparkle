import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import {
  listMyNotifications,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsScreen,
});

type Row = {
  id: string;
  category: string;
  event_type: string;
  title: string;
  body: string | null;
  action_path: string | null;
  read_at: string | null;
  created_at: string;
};

type Prefs = {
  messages: boolean;
  introductions: boolean;
  reflection: boolean;
  athena: boolean;
  relationship: boolean;
  product_updates: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; note: string }[] = [
  { key: "messages", label: "Messages", note: "When someone you're connected with writes." },
  { key: "introductions", label: "Introductions", note: "When Athena has someone for you to consider." },
  { key: "reflection", label: "Reflections", note: "After a meeting, once — never repeatedly." },
  { key: "athena", label: "Athena", note: "When Athena has something meaningful to share." },
  { key: "relationship", label: "Relationship journey", note: "Focus Mode and endings." },
  { key: "product_updates", label: "Product updates", note: "Rare, and off unless you want them." },
];

function NotificationsScreen() {
  const navigate = useNavigate();
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const readPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(updateNotificationPreferences);

  const [rows, setRows] = useState<Row[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [n, p] = await Promise.all([list(), readPrefs()]);
    setRows((n as { notifications: Row[] }).notifications);
    setPrefs(p as Prefs);
    setLoading(false);
  }, [list, readPrefs]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(row: Row) {
    if (!row.read_at) {
      await markRead({ data: { id: row.id } });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)),
      );
    }
    if (row.action_path) navigate({ to: row.action_path });
  }

  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await savePrefs({ data: next });
  }

  return (
    <div className="screen-shell safe-top pb-24">
      <header className="flex items-center gap-3 px-6 pt-8">
        <Link to="/home" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl text-foreground">Notifications</h1>
      </header>

      <p className="mt-2 px-6 text-sm text-ink-soft">
        Athena only reaches out when something real has happened. Nothing here is designed to pull you back.
      </p>

      <section className="mt-6 space-y-3 px-6">
        {loading && <p className="text-sm text-muted-foreground">A moment…</p>}
        {!loading && rows.length === 0 && (
          <p className="rounded-3xl border border-border/70 bg-card p-6 text-sm text-ink-soft">
            Nothing right now. That's usually a good sign.
          </p>
        )}
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => void open(row)}
            className={`w-full rounded-3xl border p-5 text-left transition-colors ${
              row.read_at ? "border-border/60 bg-card/60" : "border-primary/40 bg-card"
            }`}
          >
            <h3 className="font-display text-lg text-foreground">{row.title}</h3>
            {row.body && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{row.body}</p>}
          </button>
        ))}
      </section>

      <section className="mt-10 px-6">
        <h2 className="font-display text-lg text-foreground">What you'd like to hear about</h2>
        <ul className="mt-4 space-y-3">
          {PREF_LABELS.map(({ key, label, note }) => (
            <li
              key={key}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4"
            >
              <div>
                <p className="text-sm text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs ? prefs[key] : false}
                aria-label={label}
                onClick={() => void toggle(key)}
                className={`mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  prefs?.[key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`block h-5 w-5 translate-y-[2px] rounded-full bg-background transition-transform ${
                    prefs?.[key] ? "translate-x-[22px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Account and safety messages always reach you — they're never marketing.
        </p>
      </section>

      <MobileTabBar current="none" />
    </div>
  );
}
