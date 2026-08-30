import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { CounterpartPhotography } from "@/components/counterpart-photography";
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
  response: string;
  presented_at: string | null;
};

/**
 * A short, restrained thought before the portrait — enough for the member to
 * know why this person is here, never a compatibility essay. The remainder of
 * Athena's reasoning waits until the member asks for it.
 */
function framing(presentation: string | null): string | null {
  if (!presentation) return null;
  const first = presentation.trim().split(/(?<=[.?!])\s+/)[0] ?? "";
  return first.length > 0 ? first : null;
}

function IntroductionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const list = useServerFn(listMyIntroductions);
  const respond = useServerFn(respondToIntroduction);
  const [intro, setIntro] = useState<Intro | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [depth, setDepth] = useState(false);
  const depthRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (depth) depthRef.current?.focus();
  }, [depth]);

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
        <p className="text-sm text-muted-foreground" role="status">A moment…</p>
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
  const lead = framing(intro.presentation);

  return (
    <div className="screen-shell safe-top pb-40" data-testid="introduction-detail">
      <header className="px-6 pt-8">
        <Link
          to="/introductions"
          className="inline-block min-h-11 text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          ← Meet
        </Link>
        <h1 className="mt-3 font-display text-[2.25rem] leading-tight text-foreground">
          {intro.other_name}
          {intro.other_age != null && (
            <span className="ml-2 text-lg text-ink-soft">{intro.other_age}</span>
          )}
        </h1>
        {intro.other_area && (
          <p className="mt-1 text-sm text-ink-soft">{intro.other_area}</p>
        )}
        {lead && (
          <p
            data-testid="introduction-framing"
            className="mt-4 text-[15px] leading-relaxed text-foreground/90"
          >
            {lead}
          </p>
        )}
      </header>

      {/* Portrait first, then further photographs by the member's own choice. */}
      <CounterpartPhotography
        pairId={intro.id}
        name={intro.other_name}
        onDepth={() => setDepth(true)}
      />

      {depth && (
        <div ref={depthRef} tabIndex={-1} data-testid="introduction-depth">
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
        </div>
      )}

      {canRespond && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[480px] border-t border-border/70 bg-background/90 px-6 py-3 backdrop-blur">
          <div className="flex gap-2">
            <button
              data-testid="introduction-accept"
              onClick={() => react("accepted")}
              disabled={busy}
              className="min-h-11 flex-1 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Yes, I'm open
            </button>
            <button
              data-testid="introduction-defer"
              onClick={() => react("deferred")}
              disabled={busy}
              className="min-h-11 rounded-full border border-border px-4 py-3 text-sm text-foreground disabled:opacity-60"
            >
              Not now
            </button>
            <button
              data-testid="introduction-decline"
              onClick={() => react("declined")}
              disabled={busy}
              className="min-h-11 rounded-full border border-border px-4 py-3 text-sm text-muted-foreground disabled:opacity-60"
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

