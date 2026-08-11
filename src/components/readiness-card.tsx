import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyReadiness } from "@/lib/readiness.functions";

type Readiness = {
  state: "A" | "B" | "C";
  considering: boolean;
  message: string;
  hold: string | null;
};

/**
 * Readiness, in Athena's voice. Never a score, never a rank, never a queue
 * position — only what is true and what happens next.
 */
export function ReadinessCard() {
  const fetchReadiness = useServerFn(getMyReadiness);
  const [r, setR] = useState<Readiness | null>(null);

  useEffect(() => {
    let alive = true;
    fetchReadiness()
      .then((res) => {
        if (alive) setR(res as Readiness);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetchReadiness]);

  if (!r) return null;

  const label =
    r.state === "C"
      ? "Athena is considering introductions"
      : r.state === "B"
        ? "Athena is still getting to know you"
        : "Not yet — and that's alright";

  return (
    <article className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <span
        className={`inline-block h-2 w-2 rounded-full ${r.considering ? "bg-primary" : "bg-muted-foreground/50"}`}
        aria-hidden
      />
      <h3 className="mt-3 font-display text-xl text-foreground">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.message}</p>
    </article>
  );
}
