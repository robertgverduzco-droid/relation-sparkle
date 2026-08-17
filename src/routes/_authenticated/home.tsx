import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyIntroductions } from "@/lib/introductions.functions";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { EndingChoiceCard } from "@/components/ending-choice-card";
import { ReadinessCard } from "@/components/readiness-card";
import { AthenaPresence } from "@/components/athena-presence";
import { WaitingState } from "@/components/waiting-state";
import { Bell } from "lucide-react";

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

  const firstName = profile?.display_name?.split(" ")[0] ?? null;

  return (
    <div className="screen-shell safe-top pb-28 fade-in-quick">
      <header className="px-6 pt-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <p className="type-section">Today</p>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="tap-target -mr-2 justify-end text-muted-foreground"
          >
            <Bell className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          </Link>
        </div>
        <h1 className="type-page-title mt-3 text-foreground">
          Welcome back{firstName ? <>, {firstName}</> : ""}.
        </h1>
        <div className="mt-4">
          <AthenaPresence state="quiet" />
        </div>
      </header>

      <div className="mt-8 space-y-8">
        <section className="px-6">
          <EndingChoiceCard />
          <ReadinessCard />
        </section>

        {!hasIntroduction && <WaitingState />}

        <section className="space-y-1 px-6">
          <Continuation
            title={hasStartedAthena ? "Continue with Athena" : "Meet Athena"}
            body={
              hasStartedAthena
                ? "She remembers where you left off, and she is in no hurry."
                : "There is nothing to fill out — just a conversation, at your pace."
            }
            to="/athena"
            action={hasStartedAthena ? "Continue" : "Begin"}
          />
          <Continuation
            title="Your Living Profile"
            body="What Athena is coming to understand. Correct anything that doesn't sound like you."
            to="/profile"
            action="Open"
          />
        </section>
      </div>

      <MobileTabBar current="home" />
    </div>
  );
}

/** Space, alignment and typography before card + border + shadow (§11). */
function Continuation({
  title,
  body,
  to,
  action,
}: {
  title: string;
  body: string;
  to: "/profile" | "/introductions" | "/athena";
  action: string;
}) {
  return (
    <Link
      to={to}
      className="hairline block py-5 transition-colors first:border-t-0 hover:bg-surface/40"
    >
      <h3 className="font-display text-[1.375rem] leading-snug text-foreground">{title}</h3>
      <p className="type-body mt-1.5 text-ink-soft">{body}</p>
      <span className="mt-3 inline-block text-sm text-primary">{action} →</span>
    </Link>
  );
}
