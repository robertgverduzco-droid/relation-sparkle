import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { decideAppeal, getOpenAppealsForReview } from "@/lib/appeals.functions";

export const Route = createFileRoute("/_authenticated/founder/appeals")({
  head: () => ({
    meta: [
      { title: "Appeal Review — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FounderAppealsScreen,
});

type Appeal = Awaited<ReturnType<typeof getOpenAppealsForReview>>["appeals"][number];

function FounderAppealsScreen() {
  const load = useServerFn(getOpenAppealsForReview);
  const decide = useServerFn(decideAppeal);

  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load({});
      setAppeals(res.appeals);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(appeal: Appeal, decision: "grant" | "uphold") {
    setBusyId(appeal.id);
    setMessage(null);
    try {
      const note = notes[appeal.id]?.trim() || undefined;
      await decide({ data: { appeal_id: appeal.id, decision, note } });
      setMessage(
        decision === "grant"
          ? `Granted ${appeal.member_name}'s appeal — the hold is lifted.`
          : `Upheld the hold on ${appeal.member_name}'s account.`,
      );
      await refresh();
    } catch {
      setMessage("That didn't go through.");
    } finally {
      setBusyId(null);
    }
  }

  if (state === "loading") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Gathering what's waiting…</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">This page isn't available.</p>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background px-5 py-8">
      <header className="mx-auto max-w-2xl">
        <h1 className="text-lg font-medium text-foreground">Appeal review</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Granting lifts the hold immediately. Upholding keeps it in place. Either way the member is
          told, and this can't be revisited once decided.
        </p>
        {message && <p className="mt-3 text-xs text-foreground">{message}</p>}
      </header>

      <section className="mx-auto mt-8 max-w-2xl space-y-6">
        {appeals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>
        ) : (
          appeals.map((a) => (
            <article key={a.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{a.member_name}</p>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {a.severity} • {a.conduct_category}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                What they were told
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{a.behavior_note}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Their appeal
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {a.statement}
              </p>
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Note for the member (optional)
                </span>
                <textarea
                  value={notes[a.id] ?? ""}
                  onChange={(e) => setNotes((cur) => ({ ...cur, [a.id]: e.target.value }))}
                  maxLength={1000}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs text-foreground"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => void act(a, "grant")}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
                >
                  Grant
                </button>
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => void act(a, "uphold")}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40"
                >
                  Uphold
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
