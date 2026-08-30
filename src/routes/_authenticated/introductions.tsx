import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import {
  considerIntroductions,
  listMyIntroductions,
} from "@/lib/introductions.functions";

export const Route = createFileRoute("/_authenticated/introductions")({
  head: () => ({
    meta: [
      { title: "Meet — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntroductionsPage,
});

type Intro = {
  id: string;
  other_id: string;
  other_name: string;
  other_area: string | null;
  other_age: number | null;
  presentation: string | null;
  response: string;
  presented_at: string | null;
};

function IntroductionsPage() {
  const list = useServerFn(listMyIntroductions);
  const consider = useServerFn(considerIntroductions);
  const [items, setItems] = useState<Intro[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await list();
      setItems(res.introductions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load introductions.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function reflectNow() {
    setBusy(true);
    try {
      await consider();
      await refresh();
      toast.success("Athena has reflected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Athena couldn't reflect right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen-shell safe-top pb-28 px-6 pt-8" data-testid="introductions-screen">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Meet</p>
      <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
        When Athena has <em className="italic text-primary">someone</em> in mind.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        No swiping. No inventory. Only people Athena has come to understand well enough to
        consider — and then, when she believes it's worth your attention, she reflects it here.
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Athena keeps up to three introductions active at a time. Close out an existing one by
        meeting, passing, or reflecting — then she'll consider the next.
      </p>

      <div className="mt-6">
        <button
          data-testid="introductions-reflect"
          onClick={reflectNow}
          disabled={busy}
          className="rounded-full border border-border px-4 py-2 text-[13px] text-foreground disabled:opacity-40"
        >
          {busy ? "Athena is thinking…" : "Ask Athena to reflect"}
        </button>
      </div>

      {items === null ? (
        <p className="mt-10 text-sm text-muted-foreground">A moment…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="font-display text-xl text-foreground">Nothing waiting yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Introductions arrive when they're worth arriving. Keep speaking with Athena.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((it) => (
            <li
              key={it.id}
              data-testid="introduction-card"
              className="rounded-3xl border border-border/70 bg-card p-5"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[1.35rem] text-foreground">
                  {it.other_name}
                  {it.other_age != null && (
                    <span className="ml-2 text-sm text-ink-soft">{it.other_age}</span>
                  )}
                </h2>
              </div>
              {it.other_area && (
                <p className="mt-0.5 text-sm text-ink-soft">{it.other_area}</p>
              )}
              {it.presentation && (
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
                  {it.presentation}
                </p>
              )}
              <Link
                data-testid="introduction-reasoning-link"
                to="/introductions/$id"
                params={{ id: it.id }}
                className="mt-3 inline-block text-[13px] text-primary underline underline-offset-2"
              >
                Why Athena sees potential here →
              </Link>
              <div className="mt-5 flex gap-2">
                {it.response === "pending" || it.response === "deferred" ? (
                  <>
                    <button
                      data-testid="introduction-accept"
                      onClick={() => react(it.id, "accepted")}
                      className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                    >
                      Yes, I'm open
                    </button>
                    <button
                      data-testid="introduction-defer"
                      onClick={() => react(it.id, "deferred")}
                      className="rounded-full border border-border px-4 py-2.5 text-sm text-foreground"
                    >
                      Not now
                    </button>
                    <button
                      data-testid="introduction-decline"
                      onClick={() => react(it.id, "declined")}
                      className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground"
                    >
                      Pass
                    </button>
                  </>
                ) : it.response === "accepted" ? (
                  <p className="text-sm text-ink-soft">
                    You're open. Athena will let you know when they are too.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">You passed on this one.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <MobileTabBar current="introductions" />
    </div>
  );
}

