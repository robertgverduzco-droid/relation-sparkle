// F-13 / F-14 — what Athena understands about you, and how to change it.
// Screen 6 ("You") of the Orb Field. Understanding is grouped by how sure she
// is, in her own words. No counts, no scores, no completeness meters.
import { BASIS_LABEL, type FacetBasis } from "@/lib/facets";
import { FieldBack } from "@/components/field-back";
import { createFileRoute } from "@tanstack/react-router";
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

// Confidence bands, straight off the evidence ladder. What she'd stake
// something on, what is still forming, and what is honestly only a guess.
type Band = "sure" | "form" | "guess";

const BAND_OF: Record<FacetBasis, Band> = {
  repeated_pattern: "sure",
  observed: "sure",
  self_report: "form",
  unestablished: "form",
  inferred: "guess",
  hypothesis: "guess",
};

const BAND_LABEL: Record<Band, string> = {
  sure: "Sure of it",
  form: "Still forming",
  guess: "Only a guess",
};

const COUNT_WORD = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const countWord = (n: number) => COUNT_WORD[n] ?? String(n);

function UnderstandingScreen() {
  const loadFn = useServerFn(getMyUnderstanding);
  const reviseFn = useServerFn(reviseUnderstanding);
  const markReviewed = useServerFn(markUnderstandingReviewed);

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
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

  function renderFacet(f: Facet, band: Band) {
    const open = openKey === f.key;
    return (
      <div
        key={f.key}
        data-testid="understanding-facet"
        data-facet={f.key}
        data-lens={f.lens}
        data-stage={f.stage}
        data-basis={f.basis}
        className={band === "sure" ? "you-facet" : "you-facet dim"}
      >
        <div className="said">
          {f.understanding}
          {f.evolved && (
            <span
              data-testid={`understanding-evolved-${f.key}`}
              aria-label="This has evolved since you last read it"
              className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--lavender)] align-middle"
            />
          )}
        </div>
        <div className="from">
          <span data-testid={`understanding-basis-${f.key}`}>{BASIS_LABEL[f.basis]}</span> · {f.held}
          {f.revised ? " · you've revised this before" : ""}
        </div>

        {open ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_COPY) as Kind[]).map((k) => (
                <button
                  key={k}
                  data-testid={`understanding-revision-kind-${k}`}
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-4 py-2 text-[13px] ${
                    kind === k
                      ? "border-[var(--lavender)] text-[var(--ink)]"
                      : "border-[rgba(168,151,212,0.18)] text-[var(--lavender-dim)]"
                  }`}
                >
                  {KIND_COPY[k].title}
                </button>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--lavender-dim)]">
              {KIND_COPY[kind].help}
            </p>
            {kind !== "removal" && (
              <textarea
                data-testid="understanding-revision-statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="In your own words…"
                aria-label="In your own words"
                className="w-full rounded-2xl border border-[rgba(168,151,212,0.18)] bg-transparent px-4 py-3 text-sm text-[var(--ink)]"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpenKey(null);
                  setStatement("");
                }}
                className="flex-1 rounded-full border border-[rgba(168,151,212,0.18)] px-5 py-3 text-sm text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                data-testid="understanding-revision-submit"
                disabled={busy}
                onClick={() => submit(f.key)}
                className="flex-1 rounded-full border border-[var(--lavender)] px-5 py-3 text-sm text-[var(--ink)] disabled:opacity-50"
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
            className="mt-3 text-[12px] text-[var(--lavender-dim)]"
          >
            Change, correct, or remove this
          </button>
        )}
      </div>
    );
  }

  const facets = data?.facets ?? [];
  const bands: { key: Band; facets: Facet[] }[] = (["sure", "form", "guess"] as Band[])
    .map((b) => ({ key: b, facets: facets.filter((f) => BAND_OF[f.basis] === b) }))
    .filter((b) => b.facets.length > 0);

  return (
    <div className="surface fade-in-quick" data-testid="understanding-screen">
      <FieldBack />

      <div className="surface-top">
        <span aria-hidden style={{ width: "34px" }} />
        <div className="sys" style={{ opacity: 0.6 }}>
          What I understand
        </div>
        <span aria-hidden style={{ width: "34px" }} />
      </div>

      <div className="surface-scroll">
        <div className="you-open">
          <div className="lede">
            This is what I have of you so far. Not a summary — the parts I would stake something on,
            and the parts I am still turning over.
          </div>
          <p>
            I have written it the way I would say it. If any of it has changed, or I have simply got
            it wrong, tell me.
          </p>
        </div>

        {data === null && !failed && (
          <div className="you-band">
            <p className="type-meta">Gathering my thoughts…</p>
          </div>
        )}

        {failed && (
          <div className="you-band" data-testid="understanding-unavailable">
            <p className="text-sm leading-relaxed text-[var(--ink)] opacity-70">
              I couldn&apos;t bring this up just now — that&apos;s me, not you. Nothing has changed
              about what I understand.
            </p>
            <button onClick={load} className="mt-3 text-[13px] text-[var(--lavender)]">
              Try again
            </button>
          </div>
        )}

        {!failed && data?.facets.length === 0 && (
          <div className="you-band">
            <p className="text-sm leading-relaxed text-[var(--ink)] opacity-70">
              We haven&apos;t talked enough yet for me to understand you properly. That&apos;s the
              right order — understanding comes first.
            </p>
          </div>
        )}

        {bands.map((b) => (
          <div key={b.key} className="you-band" data-testid={`understanding-band-${b.key}`}>
            <div className="you-band-head">
              <div className={`sys ${b.key}`}>{BAND_LABEL[b.key]}</div>
              <div className="sys" style={{ opacity: 0.4 }}>
                {countWord(b.facets.length)}
              </div>
            </div>
            {b.facets.map((f) => renderFacet(f, b.key))}
          </div>
        ))}

        {data?.stillLearning && (
          <div className="you-foot" data-testid="understanding-still-learning">
            <div className="sys">What I&apos;m still learning</div>
            <p>{data.stillLearning}</p>
          </div>
        )}

        {facets.length > 0 && (
          <div className="you-foot">
            <div className="sys">If I have you wrong</div>
            <p>
              Tell me in conversation and I will change it. I would rather be corrected than
              accurate about the wrong person.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
