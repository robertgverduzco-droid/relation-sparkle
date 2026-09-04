import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldBack } from "@/components/field-back";
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
  lapsed_at?: string | null;
};

/** The first sentence of Athena's reasoning — the rest waits on the person's
 *  own surface. Presentation only; the text itself comes from the loader. */
function lede(presentation: string | null): string | null {
  if (!presentation) return null;
  const first = presentation.trim().split(/(?<=[.?!])\s+/)[0] ?? "";
  return first.length > 0 ? first : null;
}

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
    <div className="surface fade-in-quick" data-testid="introductions-screen">
      <FieldBack />
      <div className="surface-top">
        <span aria-hidden style={{ width: 34 }} />
        <span className="sys sys-amber">Meet</span>
        <span aria-hidden style={{ width: 34 }} />
      </div>

      <div className="surface-scroll">
        <div className="meet-reason">
          <span className="sys">When someone is in mind</span>
          <p>
            No swiping, and no inventory. Only people I have come to understand
            well enough to consider — and when I believe it is worth your
            attention, I say so here.
          </p>
          <p className="quiet">
            I keep up to three introductions open at a time. Close one out by
            meeting, passing, or setting it aside, and I will consider the next.
          </p>
        </div>

        {items === null ? (
          <p className="mx-[26px] sys" role="status">
            A moment…
          </p>
        ) : items.length === 0 ? (
          <div className="meet-held">
            <span className="sys">Nothing waiting</span>
            <p>
              Introductions arrive when they are worth arriving. Keep speaking
              with me.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((it) => {
              const where = [
                it.other_age != null ? `${it.other_age}` : null,
                it.other_area,
              ]
                .filter(Boolean)
                .join(" · ");
              const line = lede(it.presentation);
              return (
                <li key={it.id} data-testid="introduction-card">
                  <Link
                    data-testid="introduction-detail-link"
                    to="/introductions/$id"
                    params={{ id: it.id }}
                    className="meet-row"
                  >
                    <span className="who">{it.other_name}</span>
                    {where && (
                      <span className="meet-where mx-0 mt-2 block">{where}</span>
                    )}
                    {line && <span className="line block">{line}</span>}
                    <span className="sys sys-amber mt-4 block">
                      {it.response === "pending" ? "Waiting on you →" : "Read →"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="meet-actions">
          <button
            type="button"
            data-testid="introductions-reflect"
            onClick={reflectNow}
            disabled={busy}
            className="meet-quiet text-left"
          >
            {busy ? "Athena is thinking…" : "Ask Athena to reflect"}
          </button>
        </div>
      </div>
    </div>
  );
}
