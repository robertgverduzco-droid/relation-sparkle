import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AthenaPresence } from "@/components/athena-presence";
import { WaitingState } from "@/components/waiting-state";
import { REVEAL_COPY, type Reveal } from "@/lib/reveal";
import { confirmReveal, getReveal } from "@/lib/reveal.functions";

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
 * member reads it, corrects it if it's wrong, and confirms. Payment comes
 * after this, never before.
 */
function RevealScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [amending, setAmending] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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
      await confirmReveal({ data: { member_note: note.trim() || undefined } });
      void navigate({ to: "/membership" });
    } catch {
      toast.error("That didn't save. Try once more.");
      setSaving(false);
    }
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

  return (
    <div className="px-6 py-10" data-testid="reveal-screen">
      <AthenaPresence state="quiet" showLabel={false} />
      <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {REVEAL_COPY.eyebrow}
      </p>
      <h1 className="type-athena mt-2 text-foreground">{REVEAL_COPY.title}</h1>
      <p className="type-body mt-3 max-w-[32rem] text-ink-soft">{REVEAL_COPY.intro}</p>

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

      {amending && (
        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {REVEAL_COPY.amendPrompt}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </label>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={confirm}
          disabled={saving}
          data-testid="reveal-confirm"
          className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : REVEAL_COPY.confirm}
        </button>
        {!amending && (
          <button onClick={() => setAmending(true)} className="text-sm text-muted-foreground">
            {REVEAL_COPY.amend}
          </button>
        )}
      </div>
    </div>
  );
}
