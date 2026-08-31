// F-13 / F-14 — what Athena understands about you, and how to change it.
// Depth model: understanding is grouped by specialist lens, deepens as
// evidence accumulates, and quietly marks what has evolved since you last
// read it. No counts, no scores, no completeness meters.
import { BASIS_LABEL, type FacetBasis } from "@/lib/facets";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyUnderstanding,
  markUnderstandingReviewed,
  reviseUnderstanding,
} from "@/lib/understanding.functions";

export const Route = createFileRoute("/_authenticated/understanding")({
  head: () => ({
    meta: [
      { title: "What Athena Understands About You | Athena" },
      {
        name: "description",
        content:
          "Review, change, correct, or remove anything Athena has come to understand about you.",
      },
      { property: "og:title", content: "What Athena Understands About You" },
      {
        property: "og:description",
        content: "Your living profile, in your own hands.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnderstandingScreen,
});

type Facet = {
  key: string;
  label: string;
  understanding: string;
  held: string;
  basis: FacetBasis;
  last_updated: string | null;
  revised: boolean;
  lens: string;
  stage: "early" | "developing" | "mature";
  depth: string;
  evolved: boolean;
};

type Lens = { key: string; label: string; facets: Facet[] };

type Loaded = { facets: Facet[]; lenses: Lens[]; stillLearning: string | null };

type Kind = "change" | "correction" | "removal";

const KIND_COPY: Record<Kind, { title: string; help: string; cta: string }> = {
  change: {
    title: "This has changed",
    help: "It was true, and it isn't any more. I'll keep the old understanding as history, not as who you are now.",
    cta: "Tell me what's true now",
  },
  correction: {
    title: "This is wrong",
    help: "I misread you. Tell me what I got wrong and I'll hold this area more carefully.",
    cta: "Tell me what I misunderstood",
  },
  removal: {
    title: "Remove this",
    help: "I'll delete this understanding and how I arrived at it. Nothing about it stays behind.",
    cta: "Remove it",
  },
};

function UnderstandingScreen() {
  const loadFn = useServerFn(getMyUnderstanding);
  const reviseFn = useServerFn(reviseUnderstanding);
  const markReviewed = useServerFn(markUnderstandingReviewed);

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [openLens, setOpenLens] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("change");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    loadFn({})
      .then((r) => setData(r as Loaded))
      // A failed read is not the same fact as "we haven't talked enough yet".
      // Saying the second when the first happened tells the member something
      // untrue about their own understanding.
      .catch(() => setFailed(true));
  }, [loadFn]);


  useEffect(load, [load]);

  // Recorded once the member has actually seen the page, so "evolved since you
  // last read this" stays truthful. Never surfaced as activity or a count.
  useEffect(() => {
    if (!data) return;
    markReviewed({}).catch(() => {});
  }, [data, markReviewed]);

  async function submit(facetKey: string) {
    setBusy(true);
    try {
      const res = (await reviseFn({
        data: { facet_key: facetKey, kind, statement: statement || undefined },
      })) as { message: string };
      toast(res.message);
      setOpenKey(null);
      setStatement("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  function renderFacet(f: Facet) {
    return (
      <article
        key={f.key}
        data-testid="understanding-facet"
        data-facet={f.key}
        data-lens={f.lens}
        data-stage={f.stage}
        className="rounded-2xl border border-border/70 bg-card p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] text-foreground">
            {f.label}
            {f.evolved && (
              <span
                data-testid={`understanding-evolved-${f.key}`}
                aria-label="This has evolved since you last read it"
                className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
              />
            )}
          </h3>
          <span
            data-testid={`understanding-basis-${f.key}`}
            data-basis={f.basis}
            className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {BASIS_LABEL[f.basis]}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {f.understanding}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {f.held} · {f.depth}
          {f.revised ? " · you've revised this before" : ""}
        </p>

        {openKey === f.key ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_COPY) as Kind[]).map((k) => (
                <button
                  key={k}
                  data-testid={`understanding-revision-kind-${k}`}
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-4 py-2 text-[13px] ${
                    kind === k
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-ink-soft"
                  }`}
                >
                  {KIND_COPY[k].title}
                </button>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed text-ink-soft">{KIND_COPY[kind].help}</p>
            {kind !== "removal" && (
              <textarea
                data-testid="understanding-revision-statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="In your own words…"
                aria-label="In your own words"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpenKey(null);
                  setStatement("");
                }}
                className="flex-1 rounded-full border border-border px-5 py-3 text-sm text-foreground"
              >
                Cancel
              </button>
              <button
                data-testid="understanding-revision-submit"
                disabled={busy}
                onClick={() => submit(f.key)}
                className={`flex-1 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-50 ${
                  kind === "removal"
                    ? "border border-destructive/60 text-destructive"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {busy ? "Saving…" : KIND_COPY[kind].cta}
              </button>
            </div>
          </div>
        ) : (
          <button
            data-testid="understanding-revise-open"
            onClick={() => {
              setOpenKey(f.key);
              setKind("change");
              setStatement("");
            }}
            className="mt-3 text-[13px] text-primary"
          >
            Change, correct, or remove this
          </button>
        )}
      </article>
    );
  }

  return (
    <section className="mx-auto w-full max-w-lg px-5 pb-28 pt-8" data-testid="understanding-screen">
      <Link to="/profile" className="text-[13px] text-muted-foreground">
        ← Profile
      </Link>
      <h1 className="mt-4 text-2xl font-light tracking-tight text-foreground">
        What I understand about you
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        This is what I&apos;ve come to understand from our conversations — in plain words, not
        scores or labels. It grows as we talk. Open whichever part you care about. If any of it has
        changed, or I&apos;ve simply got it wrong, tell me. You can also ask me to forget something
        entirely.
      </p>

      {data === null && !failed && (
        <p className="mt-8 text-sm text-muted-foreground">Gathering my thoughts…</p>
      )}

      {failed && (
        <div className="mt-8" data-testid="understanding-unavailable">
          <p className="text-sm text-ink-soft">
            I couldn&apos;t bring this up just now — that&apos;s me, not you. Nothing has changed
            about what I understand.
          </p>
          <button onClick={load} className="mt-3 text-[13px] text-primary">
            Try again
          </button>
        </div>
      )}

      {!failed && data?.facets.length === 0 && (
        <p className="mt-8 text-sm text-ink-soft">
          We haven&apos;t talked enough yet for me to understand you properly. That&apos;s the
          right order — understanding comes first.
        </p>
      )}


      <div className="mt-6 space-y-3">
        {data?.lenses.map((lens) => {
          const open = openLens === lens.key;
          const evolved = lens.facets.some((f) => f.evolved);
          return (
            <div
              key={lens.key}
              data-testid="understanding-lens"
              data-lens={lens.key}
              className="rounded-3xl border border-border/70 bg-card/40"
            >
              <button
                data-testid={`understanding-lens-toggle-${lens.key}`}
                aria-expanded={open}
                onClick={() => setOpenLens(open ? null : lens.key)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="text-[15px] text-foreground">
                  {lens.label}
                  {evolved && !open && (
                    <span
                      aria-label="Something here has evolved since you last read it"
                      className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
                    />
                  )}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && <div className="space-y-3 px-3 pb-3">{lens.facets.map(renderFacet)}</div>}
            </div>
          );
        })}
      </div>

      {data?.stillLearning && (
        <div
          data-testid="understanding-still-learning"
          className="mt-6 rounded-3xl border border-border/50 p-5"
        >
          <h2 className="text-[15px] text-foreground">What I&apos;m still learning</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{data.stillLearning}</p>
        </div>
      )}
    </section>
  );
}
