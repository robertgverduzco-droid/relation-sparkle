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
    <article
      className="relative overflow-hidden rounded-[1.5rem] px-6 py-7"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklab, var(--lavender) 7%, transparent) 0%, transparent 66%)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: r.considering ? "var(--lavender-bright)" : "var(--lavender-dim)",
            boxShadow: r.considering
              ? "0 0 14px color-mix(in oklab, var(--lavender) 70%, transparent)"
              : undefined,
          }}
        />
        <span className="type-section">From Athena</span>
      </div>
      <h3 className="mt-4 font-display text-[1.375rem] leading-snug text-foreground">{label}</h3>
      <p className="mt-3 max-w-[30rem] text-[15px] leading-relaxed text-ink-soft">{r.message}</p>
    </article>
  );
}

