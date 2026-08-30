import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ArrivalScene } from "@/components/arrival-scene";

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

/** Arrival. The approved Variant E presence sequence, then one way forward. */
function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [skip, setSkip] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/home" });
  }, [loading, user, navigate]);

  // Returning members skip the ceremony entirely.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem("athena.arrived") === "1";
    } catch {
      /* private mode — the ceremony simply replays */
    }
    setSkip(seen);
    if (!seen) {
      try {
        window.localStorage.setItem("athena.arrived", "1");
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <div
      data-athena-landing
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--void)]"
    >
      {skip === null ? null : (
        <ArrivalScene
          skip={skip}
          footer={
            <div className="flex flex-col items-center gap-5">
              <Link
                to="/auth"
                search={{ mode: "signup" } as never}
                className="flex min-h-[52px] w-full items-center justify-center rounded-full px-8 text-[14px] font-light tracking-[0.18em] uppercase transition active:scale-[0.99]"
                style={{
                  color: "var(--ink)",
                  border: "1px solid color-mix(in oklab, var(--lavender) 60%, transparent)",
                  background: "rgba(168,151,212,0.06)",
                }}
              >
                Begin Your Journey
              </Link>
              <Link
                to="/auth"
                className="text-[12px] tracking-[0.18em] uppercase underline-offset-4 transition hover:underline"
                style={{ color: "color-mix(in oklab, var(--ink) 50%, transparent)" }}
              >
                Already a member? Sign In
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
