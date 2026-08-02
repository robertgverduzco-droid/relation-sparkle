import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";

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

function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hasStartedAthena, setHasStartedAthena] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, onboarding_stage, onboarding_completed_at")
          .maybeSingle(),
        supabase.from("interview_sessions").select("messages").maybeSingle(),
      ]);
      setProfile(p as ProfileRow | null);
      const msgs = Array.isArray(s?.messages) ? (s!.messages as unknown[]) : [];
      const started = msgs.length > 0;
      setHasStartedAthena(started);
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
  }, [navigate]);

  if (loading)
    return (
      <div className="screen-shell items-center justify-center">
        <p className="text-sm text-muted-foreground">A moment…</p>
      </div>
    );

  const firstName = profile?.display_name?.split(" ")[0] ?? null;

  return (
    <div className="screen-shell safe-top pb-24">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Today</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          Welcome back
          {firstName ? (
            <>
              , <em className="italic text-primary">{firstName}</em>
            </>
          ) : (
            ""
          )}
          .
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Athena has already begun understanding you. Introductions will follow, in time — always after understanding.
        </p>
      </header>

      <section className="mt-8 space-y-4 px-6">
        <EndingChoiceCard />
        <Card
          title={hasStartedAthena ? "Continue your conversation with Athena" : "Meet Athena"}
          body={
            hasStartedAthena
              ? "Pick up where you left off. Athena remembers, and she is in no hurry."
              : "Athena would like to get to know you. There is nothing to fill out — just a conversation, at your pace."
          }
          actionLabel={hasStartedAthena ? "Continue" : "Begin"}
          actionTo="/athena"
        />
        <Card
          title="No introductions yet"
          body="Introductions arrive when they are worth arriving. Athena is quietly listening for a fit."
        />
        <Card
          title="Your Living Profile"
          body="See what Athena is coming to understand about you. Correct anything that doesn't sound like you."
          actionLabel="Open"
          actionTo="/profile"
        />
      </section>

      <MobileTabBar current="home" />
    </div>
  );
}

function Card({
  title,
  body,
  actionLabel,
  actionTo,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: "/profile" | "/introductions" | "/athena";
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {actionLabel} →
        </Link>
      )}
    </article>
  );
}
