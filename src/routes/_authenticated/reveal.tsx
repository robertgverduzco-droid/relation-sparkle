import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AthenaPresence } from "@/components/athena-presence";
import { WaitingState } from "@/components/waiting-state";
import { REVEAL_COPY, type Reveal } from "@/lib/reveal";
import { confirmReveal, flagReveal, getReveal } from "@/lib/reveal.functions";

export const Route = createFileRoute("/_authenticated/reveal")({
  component: RevealScreen,
  head: () => ({
    meta: [
      { title: "What Athena understands about you | Athena" },
      {
        name: "description",
        content:
          "Athena's read of who you are, drawn from your conversation — including one or two things you may not have said out loud.",
      },
      { property: "og:title", content: "What Athena understands about you" },
      {
        property: "og:description",
        content: "A considered read of who you are, before anything is asked of you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/**
 * §5 — the reveal. The single moment that has to land: proof that fifteen
 * minutes of real conversation produces something a swipe never could. The
 * member reads it, and either confirms it as theirs or flags it as wrong —
 * two genuinely different actions, not one button. Only confirming locks it.
 * Payment comes after this, never before.
 */
function RevealScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  // review: reading it. amending: the "what's wrong" textarea is open.
  // working: a flag was just submitted, waiting on Athena. capped: a second
  // flag arrived after the one-rewrite budget was already spent.
  const [phase, setPhase] = useState<"review" | "amending" | "working" | "capped">("review");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [justRevised, setJustRevised] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getReveal();
        setReady(res.ready);
        setReveal(res.reveal);
      } catch {
        toast.error("Athena couldn't bring that up just now.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function confirm() {
    setSaving(true);
    try {
      await confirmReveal({});
      void navigate({ to: "/membership" });
    } catch {
      toast.error("That didn't save. Try once more.");
      setSaving(false);
    }
  }

  async function submitFlag() {
    const text = note.trim();
    if (!text) return;
    setPhase("working");
    try {
      const res = await flagReveal({ data: { note: text } });
      setReveal(res.reveal);
      setNote("");
      if (res.capped) {
        setPhase("capped");
      } else {
        setJustRevised(res.regenerated);
        setPhase("review");
      }
    } catch {
      toast.error(REVEAL_COPY.flagFailed);
      setPhase("amending");
    }
  }

  function continueUnconfirmed() {
    void navigate({ to: "/membership" });
  }

  function holdForNow() {
    void navigate({ to: "/athena" });
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <AthenaPresence state="processing" showLabel={false} />
      </div>
    );
  }

  if (!ready || !reveal) {
    return (
      <div>
        <WaitingState
          headline="Not yet."
          body="Athena doesn't have enough of you to say something worth reading. Keep talking to her — she'll bring this to you when she can stand behind it."
        />
      </div>
    );
  }

  if (phase === "working") {
    return (
      <div className="px-6 py-10">
        <AthenaPresence state="processing" showLabel={false} />
        <p className="mt-4 text-sm text-muted-foreground">{REVEAL_COPY.amendWorking}</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10" data-testid="reveal-screen">
      <AthenaPresence state="quiet" showLabel={false} />
      <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {REVEAL_COPY.eyebrow}
      </p>
      <h1 className="type-athena mt-2 text-foreground">{REVEAL_COPY.title}</h1>
      <p className="type-body mt-3 max-w-[32rem] text-ink-soft">{REVEAL_COPY.intro}</p>

      {justRevised && (
        <p
          className="mt-4 text-xs italic text-muted-foreground"
          data-testid="reveal-revised-notice"
        >
          {REVEAL_COPY.regeneratedNotice}
        </p>
      )}

      <p className="type-body mt-7 max-w-[34rem] whitespace-pre-line text-foreground">
        {reveal.summary}
      </p>

      <h2 className="mt-9 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {REVEAL_COPY.insightsHeading}
      </h2>
      <ul className="mt-3 space-y-4">
        {reveal.insights.map((insight, i) => (
          <li key={i} className="rounded-2xl border border-border/60 bg-card px-4 py-4">
            <p className="font-display text-[16px] leading-snug text-foreground">
              {insight.observation}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{insight.because}</p>
          </li>
        ))}
      </ul>

      {phase === "capped" && (
        <div
          className="mt-6 rounded-2xl border border-border/60 bg-card px-4 py-4"
          data-testid="reveal-capped"
        >
          <p className="text-sm leading-relaxed text-foreground">{REVEAL_COPY.cappedBody}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={continueUnconfirmed}
              data-testid="reveal-capped-continue"
              className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground"
            >
              {REVEAL_COPY.cappedContinue}
            </button>
            <button
              onClick={holdForNow}
              data-testid="reveal-capped-hold"
              className="text-sm text-muted-foreground"
            >
              {REVEAL_COPY.cappedHold}
            </button>
          </div>
        </div>
      )}

      {phase === "amending" && (
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {REVEAL_COPY.amendPrompt}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            autoFocus
            className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </label>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={confirm}
          disabled={saving}
          data-testid="reveal-confirm"
          className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : REVEAL_COPY.confirm}
        </button>
        {phase === "amending" ? (
          <button
            onClick={submitFlag}
            disabled={!note.trim()}
            data-testid="reveal-amend-submit"
            className="rounded-full border border-border px-6 py-3 text-sm text-foreground disabled:opacity-40"
          >
            {REVEAL_COPY.amendSubmit}
          </button>
        ) : (
          phase === "review" && (
            <button
              onClick={() => setPhase("amending")}
              data-testid="reveal-amend"
              className="text-sm text-muted-foreground"
            >
              {REVEAL_COPY.amend}
            </button>
          )
        )}
      </div>
    </div>
  );
}
