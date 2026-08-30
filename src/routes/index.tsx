import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ConnectionField } from "@/components/connection-field";
import { AthenaPresence } from "@/components/athena-presence";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meet Athena — The Next Evolution of Matchmaking" },
      {
        name: "description",
        content:
          "Athena is a calm, intelligent presence who takes the time to understand you first — introductions follow, only when it's right.",
      },
      { property: "og:title", content: "Meet Athena" },
      { property: "og:description", content: "The Next Evolution of Matchmaking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

/** Arrival (§22–§24). Deep field, slow independent motion, the field quietly
 *  organizes, Athena arrives, one clear next action. Nothing else. */
function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (reduced) return;
    // Returning members skip the ceremony entirely (§24).
    const seen = typeof window !== "undefined" && window.localStorage.getItem("athena.arrived");
    if (seen) {
      setPhase(3);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1900);
    const t3 = setTimeout(() => {
      setPhase(3);
      try {
        window.localStorage.setItem("athena.arrived", "1");
      } catch {
        /* private mode — the ceremony simply replays */
      }
    }, 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reduced]);

  return (
    <div
      data-athena-landing
      className="screen-shell safe-top safe-bottom relative overflow-hidden"
    >
      <ConnectionField intensity={phase >= 1 ? "attending" : "quiet"} />

      <div className="relative flex flex-1 flex-col justify-between px-6 pt-16 pb-8">
        <div className="pt-2">
          <div
            className="transition-opacity duration-700"
            style={{ opacity: phase >= 2 ? 1 : 0 }}
          >
            <AthenaPresence state="quiet" showLabel={false} />
          </div>
        </div>

        <section className="text-center">
          <h1 className="text-foreground" aria-label="Meet Athena">
            <span
              className="block text-[0.8125rem] font-normal uppercase tracking-[0.34em] text-muted-foreground transition-opacity duration-1000"
              style={{ opacity: phase >= 1 ? 1 : 0 }}
            >
              Meet
            </span>
            <span
              className="type-arrival mt-4 block transition-all duration-1000"
              style={{
                opacity: phase >= 1 ? 1 : 0,
                transform: phase >= 1 ? "none" : "translateY(10px)",
              }}
            >
              Athena
            </span>
          </h1>
          <p
            className="mx-auto mt-7 max-w-[22rem] text-[16px] leading-relaxed text-ink-soft transition-opacity duration-1000"
            style={{ opacity: phase >= 2 ? 1 : 0 }}
          >
            The Next Evolution of Matchmaking.
          </p>
        </section>

        <footer
          className="space-y-3 transition-opacity duration-700"
          style={{ opacity: phase >= 3 ? 1 : 0, pointerEvents: phase >= 3 ? "auto" : "none" }}
        >
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition active:scale-[0.99]"
          >
            Begin
          </Link>
          <Link
            to="/auth"
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border-strong px-6 text-[15px] font-medium text-foreground transition active:scale-[0.99]"
          >
            I already have an account
          </Link>
        </footer>
      </div>
    </div>
  );
}
