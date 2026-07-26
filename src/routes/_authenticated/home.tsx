import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, onboarding_stage, onboarding_completed_at")
        .maybeSingle();
      setProfile(data as ProfileRow | null);
      setLoading(false);
      if (data && !data.onboarding_completed_at) {
        navigate({ to: "/onboarding" });
      }
    })();
  }, [navigate]);

  if (loading) return <div className="screen-shell items-center justify-center"><p className="text-sm text-muted-foreground">Loading…</p></div>;

  return (
    <div className="screen-shell safe-top pb-24">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Today</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          Good to see you{profile?.display_name ? <>, <em className="italic text-primary">{profile.display_name.split(" ")[0]}</em></> : ""}.
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your next introduction is being considered with care. We only send one when it feels right.
        </p>
      </header>

      <section className="mt-8 space-y-4 px-6">
        <Card
          title="Sit with the interviewer"
          body="A five-minute conversation that helps us understand who you are beneath the surface. Every introduction we make begins here."
          actionLabel="Begin the interview"
          actionTo="/interview"
        />
        <Card
          title="No open introduction yet"
          body="We're studying your values, readiness, and preferences against the current community. This is deliberate — you'll be notified when someone worth meeting appears."
        />
        <Card
          title="Deepen your profile"
          body="The more we understand you, the better the introductions become. Add a prompt, a photo, or refine what you're looking for."
          actionLabel="Continue building"
          actionTo="/profile"
        />
      </section>

      <MobileTabBar current="home" />
    </div>
  );
}

function Card({ title, body, actionLabel, actionTo }: { title: string; body: string; actionLabel?: string; actionTo?: "/profile" | "/introductions" | "/conversations" | "/interview" }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          {actionLabel} →
        </Link>
      )}
    </article>
  );
}
