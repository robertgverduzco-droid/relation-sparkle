import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FieldBack } from "@/components/field-back";
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
      <div className="surface" data-testid="introduction-detail">
        <FieldBack />
        <div className="surface-scroll px-[26px]">
          <p className="sys" role="status">
            A moment…
          </p>
        </div>
      </div>
    );
  }

  if (intro === null) {
    return (
      <div className="surface">
        <FieldBack />
        <div className="surface-scroll px-[26px]">
          <p className="sys">This introduction isn't available.</p>
          <Link to="/introductions" className="meet-quiet inline-block text-left">
            Back to Meet
          </Link>
        </div>
      </div>
    );
  }

  const canRespond = intro.response === "pending" || intro.response === "deferred";
  const lead = framing(intro.presentation);
  const where = [
    intro.other_age != null ? `${intro.other_age}` : null,
    intro.other_area,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="surface fade-in-quick" data-testid="introduction-detail">
      <FieldBack />
      <div className="surface-top">
        <span aria-hidden style={{ width: 34 }} />
        <span className="sys sys-amber">Someone in focus</span>
        <span aria-hidden style={{ width: 34 }} />
      </div>

      <div className="surface-scroll">
        {/* One person. One portrait, then the reason she is here. */}
        <CounterpartPhotography
          pairId={intro.id}
          name={intro.other_name}
          onDepth={() => setDepth(true)}
        />

        <h1 className="meet-name">{intro.other_name}</h1>
        {where && <p className="meet-where">{where}</p>}

        {lead && (
          <div className="meet-reason" data-testid="introduction-framing">
            <span className="sys">Why her</span>
            <p>{lead}</p>
          </div>
        )}

        {depth && (
          <div ref={depthRef} tabIndex={-1} data-testid="introduction-depth">
            {intro.presentation && (
              <section className="meet-reason">
                <span className="sys">Why Athena sees potential here</span>
                <p>{intro.presentation}</p>
              </section>
            )}

            <section className="meet-held">
              <span className="sys">How to read this</span>
              <p>
                Athena doesn't rank people by percentage. She may introduce
                someone she isn't yet sure about when her reasoning is genuinely
                strong. What she shows you here is why — the shape of the
                potential, not a score. A meeting is worth it when the reasoning
                resonates, not when a number is high.
              </p>
            </section>
          </div>
        )}

        {canRespond && (
          <div className="meet-actions">
            <button
              type="button"
              data-testid="introduction-accept"
              onClick={() => react("accepted")}
              disabled={busy}
              className="meet-yes"
            >
              <span className="go">Say yes to meeting {intro.other_name}</span>
              <span className="arrow" aria-hidden>
                →
              </span>
            </button>
            <button
              type="button"
              data-testid="introduction-defer"
              onClick={() => react("deferred")}
              disabled={busy}
              className="meet-quiet"
            >
              Not now
            </button>
            <button
              type="button"
              data-testid="introduction-decline"
              onClick={() => react("declined")}
              disabled={busy}
              className="meet-quiet"
            >
              Not this one
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
