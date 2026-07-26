import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Relationship Intelligence — Meet Athena, and be known before you're introduced",
      },
      {
        name: "description",
        content:
          "Athena is the intelligence at the heart of Relationship Intelligence. She takes the time to understand you first — introductions follow, only when it's right.",
      },
      { property: "og:title", content: "Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "A calm, intentional way to be understood — and then, in time, introduced.",
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
    <div className="screen-shell safe-top safe-bottom overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 0%, oklch(0.42 0.08 330 / 0.35), transparent 60%), radial-gradient(80% 50% at 80% 100%, oklch(0.62 0.14 40 / 0.25), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-30"
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.35'/></svg>\")",
        }}
      />

      <main className="relative flex flex-1 flex-col justify-between px-6 pt-14 pb-8 fade-in-slow">
        <header className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Relationship Intelligence
          </span>
        </header>

        <section className="mt-24">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Enter a quieter world
          </p>
          <h1 className="mt-4 font-display text-[3.25rem] leading-[1.02] text-foreground">
            Meet.....
            <br />
            <em className="italic text-primary">Athena</em>
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Before any introduction, there is understanding. Athena is here to know
            you — patiently, without judgment — through a conversation that is
            entirely your own. Introductions follow, in time, and only when they're
            worth arriving.
          </p>
        </section>

        <footer className="mt-10 space-y-3">
          <Link
            to="/auth"
            search={{ mode: "signup" } as never}
            className="block w-full rounded-full bg-primary px-6 py-4 text-center text-[15px] font-medium text-primary-foreground shadow-lg shadow-black/10 transition active:scale-[0.98]"
          >
            Begin
          </Link>
          <Link
            to="/auth"
            className="block w-full rounded-full border border-border/70 bg-background/60 backdrop-blur px-6 py-4 text-center text-[15px] font-medium text-foreground transition active:scale-[0.98]"
          >
            I already have an account
          </Link>
          <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to our community guidelines. Read our{" "}
            <Link to="/privacy" className="underline">
              privacy explanation
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
