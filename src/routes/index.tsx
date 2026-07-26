import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { LandingBackground } from "@/components/landing-background";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Meet Athena — The Next Evolution of Matchmaking",
      },
      {
        name: "description",
        content:
          "Athena is a calm, intelligent presence who takes the time to understand you first — introductions follow, only when it's right.",
      },
      { property: "og:title", content: "Meet Athena" },
      {
        property: "og:description",
        content: "The Next Evolution of Matchmaking.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  return (
    <div className="screen-shell safe-top safe-bottom overflow-hidden relative">
      <LandingBackground />

      <main className="relative flex flex-1 flex-col justify-between px-6 pt-14 pb-8 fade-in-slow">
        <div />

        <section className="mt-20 text-center">
          <h1 className="font-display leading-none text-ink">
            <span className="block text-[1rem] font-normal tracking-[0.22em] text-ink-soft/80 uppercase">
              Meet
            </span>
            <span className="mt-5 block text-[4.5rem] tracking-tight" aria-label="Athena">
              Athena.
            </span>
          </h1>
          <p className="mt-8 text-[17px] leading-relaxed text-ink-soft">
            The Next Evolution of Matchmaking.
          </p>
        </section>

        <footer className="mt-10 space-y-3">
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="block w-full rounded-full bg-[#1a2540] px-6 py-4 text-center text-[15px] font-medium text-white shadow-lg shadow-black/10 transition active:scale-[0.98]"
          >
            Begin
          </Link>
          <Link
            to="/auth"
            className="block w-full rounded-full border border-white/70 bg-white/60 backdrop-blur px-6 py-4 text-center text-[15px] font-medium text-[#1a2540] transition active:scale-[0.98]"
          >
            I already have an account
          </Link>
        </footer>
      </main>
    </div>
  );
}
