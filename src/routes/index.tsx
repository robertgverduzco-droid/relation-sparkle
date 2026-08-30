import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ArrivalScene } from "@/components/arrival-scene";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Athena — The Next Evolution of Matchmaking" },
      {
        name: "description",
        content:
          "Athena is a calm, intelligent presence who takes the time to understand you first — introductions follow, only when it's right.",
      },
      { property: "og:title", content: "Athena" },
      { property: "og:description", content: "The Next Evolution of Matchmaking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

/** Arrival. A cinematic opening: void, horizon, and one clear way forward. */
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
    // Returning members skip the ceremony entirely.
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
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--void)]"
    >
      <ArrivalScene awake={phase >= 1} />

      <main className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        <p
          className="text-[0.6875rem] uppercase tracking-[0.5em] text-[color-mix(in_oklab,var(--amber-bright)_78%,transparent)] transition-opacity duration-[1400ms]"
          style={{ opacity: phase >= 1 ? 1 : 0 }}
        >
          Relationship Intelligence
        </p>

        <h1
          className="mt-8 font-display leading-[0.92] text-foreground transition-all duration-[1600ms]"
          style={{
            fontSize: "clamp(3.75rem, 13vw, 9rem)",
            letterSpacing: "0.06em",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(14px)",
            textShadow:
              "0 0 60px color-mix(in oklab, var(--amber) 26%, transparent), 0 0 140px color-mix(in oklab, var(--lavender) 20%, transparent)",
          }}
        >
          ATHENA
        </h1>

        <div
          className="mt-8 flex flex-col items-center gap-4 transition-opacity duration-[1600ms]"
          style={{ opacity: phase >= 2 ? 1 : 0 }}
        >
          <span
            className="block h-px w-24"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--amber-bright) 70%, transparent), transparent)",
            }}
            aria-hidden
          />
          <p className="font-display text-[clamp(1.25rem,3.2vw,1.875rem)] leading-snug text-foreground">
            The Next Evolution of Matchmaking
          </p>
          <p className="max-w-[34rem] text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">
            Relationship intelligence that sees the whole you.
          </p>
        </div>

        <footer
          className="mt-14 flex w-full max-w-[26rem] flex-col items-stretch gap-3 transition-opacity duration-[1200ms]"
          style={{ opacity: phase >= 3 ? 1 : 0, pointerEvents: phase >= 3 ? "auto" : "none" }}
        >
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="group relative flex min-h-[56px] items-center justify-center overflow-hidden rounded-full px-8 text-[15px] font-medium tracking-wide text-[var(--void)] transition active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(135deg, var(--amber-bright) 0%, var(--amber) 44%, var(--lavender) 100%)",
              boxShadow: "0 18px 60px -22px color-mix(in oklab, var(--amber) 70%, transparent)",
            }}
          >
            Begin Your Journey
          </Link>
          <Link
            to="/auth"
            className="flex min-h-[52px] items-center justify-center rounded-full border border-border-strong px-8 text-[14px] text-ink-soft transition hover:border-[color-mix(in_oklab,var(--lavender)_55%,transparent)] hover:text-foreground active:scale-[0.99]"
          >
            Already a member? Sign In
          </Link>
        </footer>
      </main>
    </div>
  );
}
