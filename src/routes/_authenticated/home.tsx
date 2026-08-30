import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyIntroductions } from "@/lib/introductions.functions";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { EndingChoiceCard } from "@/components/ending-choice-card";
import { ReadinessCard } from "@/components/readiness-card";
import { AthenaPresence } from "@/components/athena-presence";
import { LookingState } from "@/components/looking-state";
import { Bell } from "lucide-react";
import { ReturnGreeting } from "@/components/return-greeting";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

type ProfileRow = {
  display_name: string | null;
  onboarding_stage: string;
  onboarding_completed_at: string | null;
};

/** Today (§35): a calm orientation surface. Where am I with Athena right now?
 *  Not a feed, not a dashboard, no metrics, no streaks. */
function Home() {
  const navigate = useNavigate();
  const listIntroductions = useServerFn(listMyIntroductions);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hasStartedAthena, setHasStartedAthena] = useState<boolean>(false);
  const [hasIntroduction, setHasIntroduction] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [athenaSpeaking, setAthenaSpeaking] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }, intros] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, onboarding_stage, onboarding_completed_at")
          .maybeSingle(),
        supabase.from("interview_sessions").select("messages").maybeSingle(),
        listIntroductions().catch(() => ({ introductions: [] as unknown[] })),
      ]);
      setProfile(p as ProfileRow | null);
      const msgs = Array.isArray(s?.messages) ? (s!.messages as unknown[]) : [];
      const started = msgs.length > 0;
      setHasStartedAthena(started);
      setHasIntroduction((intros?.introductions?.length ?? 0) > 0);
      if (p && !p.onboarding_completed_at) {
        navigate({ to: "/onboarding" });
        return;
      }
      // First meeting always happens before the dashboard has context.
      if (!started) {
        navigate({ to: "/athena" });
        return;
      }
      setLoading(false);
    })();
  }, [navigate, listIntroductions]);

  if (loading)
    return (
      <div className="screen-shell items-center justify-center">
        <p className="type-meta">A moment…</p>
      </div>
    );

  const displayName = profile?.display_name ?? null;

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden fade-in-quick"
      data-testid="today-screen"
    >
      {/* Environment — a quiet dimensional field, never a flat dark theme. */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[var(--void)]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 50% -8%, color-mix(in oklab, var(--lavender) 11%, transparent) 0%, transparent 62%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background:
              "radial-gradient(80% 100% at 50% 120%, color-mix(in oklab, var(--amber) 8%, transparent) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="screen-shell safe-top relative z-10 pb-32">
        <header className="px-7 pt-10">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <p className="type-section">Today</p>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="tap-target -mr-2 justify-end text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="mt-8">
            <ReturnGreeting displayName={displayName} onSpeakingChange={setAthenaSpeaking} />
          </div>

          <div className="mt-7 flex items-center gap-3">
            <span
              aria-hidden
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in oklab, var(--lavender) 42%, transparent), transparent)",
              }}
            />
            <AthenaPresence state={athenaSpeaking ? "speaking" : "quiet"} />
          </div>
        </header>

        <div className="mt-10 space-y-10">
          <section className="space-y-5 px-7">
            <EndingChoiceCard />
            <ReadinessCard />
          </section>

          {/* Post-foundational: Athena's own Looking state. It renders only when
              she is genuinely eligible and empty-handed; otherwise readiness and
              hold copy above already own the surface. */}
          {!hasIntroduction && <LookingState />}

          <section className="px-7">
            <p className="type-section">Your journey</p>
            <div className="mt-5 space-y-5">
              <Continuation
                index="01"
                title={hasStartedAthena ? "Continue with Athena" : "Meet Athena"}
                body={
                  hasStartedAthena
                    ? "She remembers where you left off, and she is in no hurry."
                    : "There is nothing to fill out — just a conversation, at your pace."
                }
                to="/athena"
                action={hasStartedAthena ? "Continue" : "Begin"}
                testId="today-link-athena"
                tone="warm"
              />
              <Continuation
                index="02"
                title="Your Living Profile"
                body="What Athena is coming to understand. Correct anything that doesn't sound like you."
                to="/profile"
                action="Open"
                testId="today-link-living-profile"
              />
              {/* A-21: the understanding surface is reachable in one step, not two. */}
              <Continuation
                index="03"
                title="What Athena understands"
                body="Her working picture of you, in her own words — and how it changed."
                to="/understanding"
                action="Read"
                testId="today-link-understanding"
              />
              {/* §5 — the reveal. Reachable once Athena can stand behind it; the
                  screen itself says so plainly when she can't yet. */}
              <Continuation
                index="04"
                title="What Athena understands about you"
                body="Her read of who you are — including one or two things you may not have said out loud."
                to="/reveal"
                action="Read"
                testId="today-link-reveal"
              />
            </div>
          </section>
        </div>

        <MobileTabBar current="home" />
      </div>
    </div>
  );
}

/** An elegant journey section — space, rhythm and light before borders. */
function Continuation({
  index,
  title,
  body,
  to,
  action,
  testId,
  tone = "cool",
}: {
  index?: string;
  title: string;
  body: string;
  to: "/profile" | "/introductions" | "/athena" | "/understanding" | "/reveal";
  action: string;
  /** A-28: stable semantic hook for the authenticated journey walkthrough. */
  testId?: string;
  tone?: "cool" | "warm";
}) {
  const accent = tone === "warm" ? "var(--amber)" : "var(--lavender)";
  return (
    <Link
      to={to}
      data-testid={testId}
      className="group relative block overflow-hidden rounded-[1.5rem] px-6 py-7 transition-colors"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklab, var(--lavender) 5%, transparent) 0%, transparent 62%)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-6 left-0 w-px"
        style={{
          background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 60%, transparent), transparent)`,
        }}
      />
      {index && (
        <span className="block text-[10px] tracking-[0.34em] text-muted-foreground">{index}</span>
      )}
      <h3 className="mt-3 font-display text-[1.5rem] leading-snug text-foreground">{title}</h3>
      <p className="type-body mt-2 max-w-[30rem] text-ink-soft">{body}</p>
      <span
        className="mt-5 inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {action}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}


