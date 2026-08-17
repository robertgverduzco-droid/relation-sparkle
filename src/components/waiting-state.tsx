import { AthenaPresence } from "@/components/athena-presence";

/**
 * Waiting (§36) is a designed state, not an absence. Calm confidence: Athena
 * has not found a reason to interrupt yet. No search animation, no counts,
 * no queue, no countdown, no teasers.
 */
export function WaitingState({
  headline = "Nothing to interrupt you with yet.",
  body = "Athena hasn't found a reason to introduce you to someone. When she does, it will be because there's a real reason — not because time has passed.",
}: {
  headline?: string;
  body?: string;
}) {
  return (
    <section className="px-6 py-10" aria-label="Waiting">
      <AthenaPresence state="quiet" showLabel={false} />
      <h2 className="type-athena mt-5 text-foreground">{headline}</h2>
      <p className="type-body mt-3 max-w-[30rem] text-ink-soft">{body}</p>
    </section>
  );
}
