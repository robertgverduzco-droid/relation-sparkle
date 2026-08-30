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

      <section className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        {/* Monogram — a quiet star mark above the wordmark. */}
        <svg
          aria-hidden
          viewBox="0 0 64 64"
          className="h-11 w-11 transition-all duration-[1400ms]"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(8px)",
            filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--lavender) 55%, transparent))",
          }}
        >
          <path
            d="M32 4 L35.4 26.2 L60 32 L35.4 37.8 L32 60 L28.6 37.8 L4 32 L28.6 26.2 Z"
            fill="color-mix(in oklab, var(--amber-bright) 82%, transparent)"
            opacity="0.55"
          />
          <path
            d="M22 44 L32 18 L42 44 M26.4 36 L37.6 36"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h1
          className="mt-6 font-display leading-none text-foreground transition-all duration-[1600ms]"
          style={{
            fontSize: "clamp(2.5rem, 9vw, 4.25rem)",
            letterSpacing: "0.28em",
            textIndent: "0.28em",
            color: "color-mix(in oklab, var(--amber-bright) 42%, var(--ink))",
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "none" : "translateY(12px)",
            textShadow:
              "0 0 44px color-mix(in oklab, var(--amber) 24%, transparent), 0 0 120px color-mix(in oklab, var(--lavender) 26%, transparent)",
          }}
        >
          ATHENA
        </h1>

        <div
          className="mt-6 flex flex-col items-center gap-3 transition-opacity duration-[1600ms]"
          style={{ opacity: phase >= 2 ? 1 : 0 }}
        >
          <span
            className="block h-px w-16"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--amber-bright) 60%, transparent), transparent)",
            }}
            aria-hidden
          />
          <p className="font-display text-[clamp(1.0625rem,4.2vw,1.375rem)] leading-snug tracking-[0.02em] text-foreground">
            The Next Evolution of Matchmaking
          </p>
          <p className="max-w-[24rem] text-[14px] leading-relaxed text-ink-soft">
            Relationship intelligence that sees the whole you.
          </p>
        </div>

        <footer
          className="mt-12 flex w-full max-w-[21rem] flex-col items-center gap-5 transition-opacity duration-[1200ms]"
          style={{ opacity: phase >= 3 ? 1 : 0, pointerEvents: phase >= 3 ? "auto" : "none" }}
        >
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="group relative flex min-h-[54px] w-full items-center justify-center overflow-hidden rounded-full px-8 text-[15px] font-medium tracking-[0.04em] text-[var(--ink)] transition active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--lavender) 92%, white) 0%, var(--lavender) 46%, color-mix(in oklab, var(--lavender) 72%, var(--void)) 100%)",
              boxShadow:
                "0 20px 60px -20px color-mix(in oklab, var(--lavender) 80%, transparent), 0 0 0 1px color-mix(in oklab, var(--lavender-bright) 40%, transparent) inset",
            }}
          >
            Begin Your Journey
          </Link>
          <Link
            to="/auth"
            className="text-[13px] tracking-[0.03em] text-ink-soft underline-offset-4 transition hover:text-foreground hover:underline"
          >
            Already a member? Sign In
          </Link>
        </footer>
      </section>

    </div>
  );
}
