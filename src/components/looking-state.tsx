import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getWaitingState } from "@/lib/waiting.functions";
import { AthenaPresence } from "@/components/athena-presence";
import { WaitingState } from "@/components/waiting-state";

type Copy = { headline: string; body: string; note: string | null; invitation: string | null };
type State = {
  phase: "not_ready" | "held" | "looking" | "introduction_available";
  earlyCommunity: boolean;
  hasCandidateInProgress: boolean;
  copy: Copy | null;
};

/**
 * Today — Looking state (§35/§36). Athena is eligible to consider and has
 * nothing to bring forward. Calm and useful rather than empty: what is true,
 * and one ordinary way forward. No counts, no activity, no queue, no
 * countdown, no scores, no streaks, no engagement bait.
 *
 * The region below the invitation is deliberately reserved: future local
 * recommendations, activities and planning (V2 concierge — NOT implemented,
 * not sellable) can occupy this space without a redesign.
 */
export function LookingState() {
  const fetchWaiting = useServerFn(getWaitingState);
  const [s, setS] = useState<State | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchWaiting()
      .then((res) => alive && setS(res as State))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [fetchWaiting]);

  // Never a dead end: if Athena's state cannot be read, the calm generic
  // waiting copy still stands.
  if (failed) return <WaitingState />;
  if (!s) return null;
  if (s.phase !== "looking" || !s.copy) return null;

  return (
    <section className="px-6 py-10" aria-label="Athena is looking" data-testid="today-looking-state">
      <AthenaPresence state="quiet" showLabel={false} />
      <h2 className="type-athena mt-5 text-foreground">{s.copy.headline}</h2>
      <p className="type-body mt-3 max-w-[32rem] text-ink-soft">{s.copy.body}</p>
      {s.copy.note && (
        <p className="type-body mt-3 max-w-[32rem] text-ink-soft">{s.copy.note}</p>
      )}

      <div className="mt-6 space-y-1">
        <Link
          to="/athena"
          data-testid="looking-continue-athena"
          className="hairline block py-5 first:border-t-0 transition-colors hover:bg-surface/40"
        >
          <h3 className="font-display text-[1.25rem] leading-snug text-foreground">
            Continue talking with Athena
          </h3>
          <p className="type-body mt-1.5 text-ink-soft">
            {s.copy.invitation ?? "Whenever you feel like it. There's nothing you need to finish."}
          </p>
          <span className="mt-3 inline-block text-sm text-primary">Continue →</span>
        </Link>
      </div>
    </section>
  );
}
