import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  getFounderIntelligence,
  governHypothesis,
  runIntelligencePass,
} from "@/lib/intelligence.functions";
import { getClosetAnalytics } from "@/lib/closet.functions";


export const Route = createFileRoute("/_authenticated/founder/intelligence")({
  head: () => ({
    meta: [
      { title: "Founder Intelligence — Relationship Intelligence" },
      {
        name: "description",
        content:
          "What Athena has observed, what she suspects, and what she has been permitted to believe.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FounderIntelligenceScreen,
});

type Data = Awaited<ReturnType<typeof getFounderIntelligence>>;

const ACTIONS = [
  { key: "promote_experimental", label: "Let her try it" },
  { key: "promote_canonical", label: "Make it canonical" },
  { key: "acknowledge_education_conflict", label: "Acknowledge conflict" },
  { key: "clear_sensitivity", label: "Clear sensitivity" },
  { key: "demote", label: "Withdraw influence" },
  { key: "retire", label: "Retire" },
  { key: "block", label: "Block permanently" },
] as const;

function FounderIntelligenceScreen() {
  const load = useServerFn(getFounderIntelligence);
  const govern = useServerFn(governHypothesis);
  const pass = useServerFn(runIntelligencePass);

  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await load({});
      setData(d);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(hypothesisId: string, action: (typeof ACTIONS)[number]["key"]) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await govern({ data: { hypothesisId, action } });
      setMessage(
        res.ok
          ? `Done. Intelligence version ${res.version}.`
          : `Held back — ${res.blockers?.join(" ")}`,
      );
      await refresh();
    } catch {
      setMessage("That did not go through.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Gathering what I know…</p>
      </section>
    );
  }

  if (state === "denied" || !data) {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">This page isn’t available.</p>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background px-5 py-8">
      <header className="mx-auto max-w-2xl">
        <h1 className="text-lg font-medium text-foreground">What I have learned</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Intelligence version {data.intelligenceVersion} · nothing here has reached a member
          unless you have promoted it.
        </p>
      </header>

      <section className="mx-auto mt-8 max-w-2xl space-y-7">
        {data.briefing.map((s) => (
          <article key={s.heading}>
            <h2 className="text-sm font-medium text-foreground">{s.heading}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </p>
          </article>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Patterns I am watching</h2>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await pass({});
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40"
          >
            Re-examine
          </button>
        </div>

        {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}

        {data.hypotheses.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            None yet. I have not seen enough completed introductions to notice anything worth
            calling a pattern.
          </p>
        )}

        <ul className="mt-4 space-y-4">
          {data.hypotheses.map((h) => (
            <li key={h.id} className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-sm leading-relaxed text-foreground">{h.statement}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {h.status} · {h.confidence} · influence: {h.influence} · {h.supporting} for /{" "}
                {h.contradicting} against across {h.applicableCases} cases
                {h.sensitivity !== "clear" && ` · sensitivity: ${h.sensitivity}`}
                {h.challengesEducation && " · argues with my education"}
              </p>
              {h.alternativeExplanations.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  It could also be: {h.alternativeExplanations.join("; ")}.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    disabled={busy}
                    onClick={() => act(h.id, a.key)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground disabled:opacity-40"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ClosetPanel />
    </section>
  );
}

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

function ClosetPanel() {
  const load = useServerFn(getClosetAnalytics);
  const [data, setData] = useState<Awaited<ReturnType<typeof getClosetAnalytics>> | null>(null);

  useEffect(() => {
    void load({})
      .then(setData)
      .catch(() => setData(null));
  }, [load]);

  if (!data) return null;
  const m = data.metrics;

  return (
    <section className="mx-auto mt-12 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">The closet (experiment)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        A joke, not a product. Nothing is optimised toward this.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        {[
          ["Seen", `${m.impressions} (${m.uniqueShown} members)`],
          ["Clicked", `${m.clicks} (${m.uniqueClicked} members)`],
          ["Click-through", pct(m.clickThroughRate)],
          ["Clicked more than once", pct(m.repeatClickRate)],
          ["With rapport", pct(m.rapport.withRapport.clickThroughRate)],
          ["Without rapport", pct(m.rapport.withoutRapport.clickThroughRate)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border/70 bg-card p-3">
            <dt>{k}</dt>
            <dd className="mt-1 text-sm text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {data.phenomenon && (
        <p className="mt-3 text-xs text-muted-foreground">{data.phenomenon}</p>
      )}
    </section>
  );
}

