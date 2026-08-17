import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getEndingChoice, chooseEndingPath } from "@/lib/relationship.functions";

type Pending = {
  id: string;
  choice: "rest" | "resume" | "talk" | null;
  hold_until: string | null;
  other_name: string | null;
  intro: string;
  paths: Array<{ key: "rest" | "resume" | "talk"; label: string; detail: string }>;
  rest_days: number;
  rest_elapsed?: boolean;
  rest_elapsed_invitation?: string;
};

/**
 * The three paths Athena offers after a relationship ends.
 * Doctrine: docs/constitution/cross-cutting/relationship-journey.md
 */
export function EndingChoiceCard() {
  const load = useServerFn(getEndingChoice);
  const choose = useServerFn(chooseEndingPath);
  const [pending, setPending] = useState<Pending | null>(null);
  const [ack, setAck] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((res) => {
        if (alive) setPending((res.pending as Pending | null) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [load]);

  if (!pending) return null;

  const onChoose = async (key: "rest" | "resume" | "talk") => {
    setBusy(true);
    try {
      const res = await choose({ data: { transition_id: pending.id, choice: key } });
      setAck(res.acknowledgement);
      setPending({ ...pending, choice: key });
    } catch {
      setAck(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      data-testid="ending-choice"
      data-choice={pending.choice ?? "none"}
      className="rounded-3xl border border-primary/30 bg-card p-6 shadow-sm"
    >
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        From Athena
      </p>
      <h3 className="mt-2 font-display text-xl text-foreground">
        {pending.other_name ? `About ${pending.other_name}` : "About what just ended"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pending.intro}</p>

      {pending.rest_elapsed && pending.choice === "rest" && !ack ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-ink-soft"
        >
          {pending.rest_elapsed_invitation}
        </p>
      ) : null}

      {ack ? (
        <p className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-ink-soft">
          {ack}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {pending.paths.map((p) => {
          const selected = pending.choice === p.key;
          return (
            <button
              key={p.key}
              data-testid={`ending-path-${p.key}`}
              onClick={() => void onChoose(p.key)}
              disabled={busy}
              className={`w-full rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">{p.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {p.detail}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        You can change this whenever you'd like. Nothing is final.
      </p>
    </article>
  );
}
