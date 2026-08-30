// Founder-only synthetic matchmaking QA harness.
//
// Everything on this surface is fictional and synthetic. No real member is
// read, and nothing generated here can enter continuous learning or a real
// matching pool.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { getQaHarnessAccess, runQaHarnessFn } from "@/lib/qa-harness.functions";
import type { QaReport } from "@/lib/qa-harness";
import { SCENARIO_FAMILY_LABEL } from "@/lib/qa-personas";

export const Route = createFileRoute("/_authenticated/qa-matchmaking")({
  head: () => ({
    meta: [
      { title: "Synthetic Matchmaking QA — Relationship Intelligence" },
      {
        name: "description",
        content:
          "Founder-only harness that exercises candidate discovery, hard constraints, pair reasoning and the introduction cap against scripted fictional personas.",
      },
      { property: "og:title", content: "Synthetic Matchmaking QA" },
      {
        property: "og:description",
        content: "Founder-only matchmaking verification against fictional personas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QaMatchmakingScreen,
});

type Mode = "none" | "representative" | "all";

function QaMatchmakingScreen() {
  const access = useServerFn(getQaHarnessAccess);
  const run = useServerFn(runQaHarnessFn);

  const [state, setState] = useState<"checking" | "denied" | "ready">("checking");
  const [mode, setMode] = useState<Mode>("representative");
  const [seed, setSeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<QaReport | null>(null);
  const [text, setText] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await access({});
        if (!cancelled) setState(res.allowed ? "ready" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await run({ data: { aiMatrix: mode, seed } });
      setReport(res.report as QaReport);
      setText(res.text as string);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [run, mode, seed]);

  if (state === "checking") {
    return <div className="p-8 text-sm text-muted-foreground">Checking…</div>;
  }
  if (state === "denied") {
    return <div className="p-8 text-sm text-muted-foreground">Not found.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10" data-testid="qa-matchmaking">
      <h1 className="text-2xl font-light tracking-tight text-foreground">Synthetic matchmaking QA</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Scripted fictional people, run through the same discovery, constraint, reasoning and cap
        logic real introductions use. Nothing here touches a real member, and nothing generated
        here is ever learned from.
      </p>

      <section className="mt-8 space-y-4 rounded-lg border border-border/60 p-5">
        <div className="flex flex-wrap gap-2">
          {(["none", "representative", "all"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full border px-4 py-1.5 text-xs transition ${
                mode === m
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {m === "none"
                ? "Constraints only"
                : m === "representative"
                  ? "Representative reasoning"
                  : "Reason every pair"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={seed} onChange={(e) => setSeed(e.target.checked)} />
          Also seed these personas onto existing synthetic accounts
        </label>
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          data-testid="qa-run"
          className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Running…" : "Run harness"}
        </button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </section>

      {report ? (
        <section className="mt-8 space-y-6" data-testid="qa-report">
          <p className="text-sm text-foreground">
            {report.summary.gatePassed} of {report.pairs.length} gate checks as expected
            {report.aiPairsRun > 0
              ? `; ${report.summary.reasoningPassed} of ${report.aiPairsRun} reasoning checks as expected`
              : ""}
            .
          </p>
          {report.pairs.map((p) => (
            <article key={p.scenarioId} className="rounded-lg border border-border/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {SCENARIO_FAMILY_LABEL[p.family]}
              </p>
              <h2 className="mt-1 text-base text-foreground">
                {p.scenarioId} — {p.pairName}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">{p.intent}</p>
              <dl className="mt-3 space-y-1 text-xs">
                <div>
                  <dt className="inline text-muted-foreground">Expected: </dt>
                  <dd className="inline text-foreground">{p.expectedGate}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Actual: </dt>
                  <dd className="inline text-foreground">
                    {p.actualGate} {p.gatePass ? "✓" : "✗"}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Blockers: </dt>
                  <dd className="inline text-foreground">
                    {p.blockers.length ? p.blockers.join(" | ") : "none"}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Unknowns: </dt>
                  <dd className="inline text-foreground">
                    {p.unknowns.length ? p.unknowns.join(" | ") : "none"}
                  </dd>
                </div>
                {p.reasoning ? (
                  <div>
                    <dt className="inline text-muted-foreground">Athena: </dt>
                    <dd className="inline text-foreground">
                      {p.reasoning.introduced ? "would introduce" : `would not introduce (${p.reasoning.status})`}{" "}
                      {p.reasoning.pass ? "✓" : "✗"} — {p.reasoning.rationale}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))}

          <article className="rounded-lg border border-border/60 p-4">
            <h2 className="text-base text-foreground">Three-open-introduction cap</h2>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {report.capChecks.map((c) => (
                <li key={c.name}>
                  {c.name}: expected {c.expected}, got {c.actual} {c.pass ? "✓" : "✗"}
                </li>
              ))}
            </ul>
          </article>

          <details className="rounded-lg border border-border/60 p-4">
            <summary className="cursor-pointer text-sm text-foreground">Plain-text report</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
              {text}
            </pre>
          </details>
        </section>
      ) : null}
    </div>
  );
}
