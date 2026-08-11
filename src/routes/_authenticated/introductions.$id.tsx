import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import {
  listMyIntroductions,
  respondToIntroduction,
} from "@/lib/introductions.functions";

export const Route = createFileRoute("/_authenticated/introductions/$id")({
  head: () => ({
    meta: [
      { title: "Why Athena sees potential — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntroductionDetailPage,
});

type Intro = {
  id: string;
  other_id: string;
  other_name: string;
  other_area: string | null;
  other_age: number | null;
  presentation: string | null;
  confidence: number;
  response: string;
  presented_at: string | null;
};

function IntroductionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const list = useServerFn(listMyIntroductions);
  const respond = useServerFn(respondToIntroduction);
  const [intro, setIntro] = useState<Intro | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await list();
        const found = (res.introductions as Intro[]).find((i) => i.id === id) ?? null;
        setIntro(found);
      } catch {
        setIntro(null);
      }
    })();
  }, [id, list]);

  async function react(response: "accepted" | "declined" | "deferred") {
    if (!intro) return;
    setBusy(true);
    try {
      await respond({ data: { pair_id: intro.id, response } });
      toast.success(
        response === "accepted"
          ? "Athena will let you know when they're open too."
          : response === "deferred"
            ? "Set aside for now."
            : "Passed. Athena will keep looking.",
      );
      navigate({ to: "/introductions" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't record that.");
    } finally {
      setBusy(false);
    }
  }

  if (intro === undefined) {
    return (
      <div className="screen-shell safe-top px-6 pt-10">
        <p className="text-sm text-muted-foreground">A moment…</p>
        <MobileTabBar current="introductions" />
      </div>
    );
  }

  if (intro === null) {
    return (
      <div className="screen-shell safe-top px-6 pt-10">
        <p className="text-sm text-muted-foreground">This introduction isn't available.</p>
        <Link
          to="/introductions"
          className="mt-6 inline-block rounded-full border border-border px-5 py-2 text-sm text-foreground"
        >
          Back to introductions
        </Link>
        <MobileTabBar current="introductions" />
      </div>
    );
  }

  const canRespond = intro.response === "pending" || intro.response === "deferred";

  return (
    <div className="screen-shell safe-top pb-32">
      <header className="px-6 pt-8">
        <Link
          to="/introductions"
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          ← Meet
        </Link>
        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {confidenceLabel(intro.confidence)}
        </p>
        <h1 className="mt-1 font-display text-[2.25rem] leading-tight text-foreground">
          {intro.other_name}
          {intro.other_age != null && (
            <span className="ml-2 text-lg text-ink-soft">{intro.other_age}</span>
          )}
        </h1>
        {intro.other_area && (
          <p className="mt-1 text-sm text-ink-soft">{intro.other_area}</p>
        )}
      </header>

      {intro.presentation && (
        <section className="mx-6 mt-6 rounded-3xl border border-border/70 bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Why Athena sees potential here
          </p>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
            {intro.presentation}
          </p>
        </section>
      )}

      <section className="mx-6 mt-6 rounded-3xl border border-dashed border-border bg-background/40 p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          How to read this
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Athena doesn't rank people by percentage. She may introduce someone
          she isn't yet sure about when her reasoning is genuinely strong.
          What she shows you here is why — the shape of the potential, not a
          score. A meeting is worth it when the reasoning resonates, not when
          a number is high.
        </p>
      </section>

      {canRespond && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[480px] border-t border-border/70 bg-background/90 px-6 py-3 backdrop-blur">
          <div className="flex gap-2">
            <button
              onClick={() => react("accepted")}
              disabled={busy}
              className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Yes, I'm open
            </button>
            <button
              onClick={() => react("deferred")}
              disabled={busy}
              className="rounded-full border border-border px-4 py-3 text-sm text-foreground disabled:opacity-60"
            >
              Not now
            </button>
            <button
              onClick={() => react("declined")}
              disabled={busy}
              className="rounded-full border border-border px-4 py-3 text-sm text-muted-foreground disabled:opacity-60"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      <MobileTabBar current="introductions" />
    </div>
  );
}

function confidenceLabel(c: number): string {
  if (c >= 0.75) return "Athena feels sure";
  if (c >= 0.55) return "Athena feels drawn";
  return "Athena is curious";
}
