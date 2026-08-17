// F-13 / F-14 — what Athena understands about you, and how to change it.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyUnderstanding, reviseUnderstanding } from "@/lib/understanding.functions";

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
  basis: "stated" | "inferred";
  last_updated: string | null;
  revised: boolean;
};

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

  const [facets, setFacets] = useState<Facet[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("change");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    loadFn({})
      .then((r) => setFacets((r as { facets: Facet[] }).facets))
      .catch(() => setFacets([]));
  }, [loadFn]);

  useEffect(load, [load]);

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

  return (
    <section className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
      <Link to="/profile" className="text-[13px] text-muted-foreground">
        ← Profile
      </Link>
      <h1 className="mt-4 text-2xl font-light tracking-tight text-foreground">
        What I understand about you
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        This is what I&apos;ve come to understand from our conversations — in plain words, not
        scores or labels. If any of it has changed, or I&apos;ve simply got it wrong, tell me.
        You can also ask me to forget something entirely.
      </p>

      {facets === null && (
        <p className="mt-8 text-sm text-muted-foreground">Gathering my thoughts…</p>
      )}

      {facets?.length === 0 && (
        <p className="mt-8 text-sm text-ink-soft">
          We haven&apos;t talked enough yet for me to understand you properly. That&apos;s the
          right order — understanding comes first.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {facets?.map((f) => (
          <article key={f.key} className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] text-foreground">{f.label}</h2>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {f.basis === "stated" ? "you told me" : "I inferred"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.understanding}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {f.held}
              {f.revised ? " · you've revised this before" : ""}
            </p>

            {openKey === f.key ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(KIND_COPY) as Kind[]).map((k) => (
                    <button
                      key={k}
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
        ))}
      </div>
    </section>
  );
}
