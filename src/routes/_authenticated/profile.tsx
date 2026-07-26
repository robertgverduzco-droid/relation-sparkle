import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your profile — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; city: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name, city").maybeSingle();
      setProfile(data);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast("You've signed out.");
    navigate({ to: "/" });
  }

  return (
    <div className="screen-shell safe-top pb-24">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your intelligence</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          {profile?.display_name ?? "Your profile"}
        </h1>
        {profile?.city && <p className="mt-1 text-sm text-ink-soft">{profile.city}</p>}
      </header>

      <section className="mt-8 space-y-3 px-6">
        <Row label="Identity & basics" to="/onboarding" />
        <Row label="Values & self-understanding" to="/onboarding" />
        <Row label="Preferences" to="/onboarding" />
        <Row label="Readiness" to="/onboarding" />
        <Row label="Voice prompts" to="/onboarding" />
        <Row label="Photos" to="/onboarding" />
      </section>

      <div className="mt-10 px-6">
        <button onClick={signOut} className="w-full rounded-full border border-border px-6 py-3 text-sm text-foreground">
          Sign out
        </button>
      </div>

      <MobileTabBar current="profile" />
    </div>
  );
}

function Row({ label, to }: { label: string; to: "/onboarding" }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-5 py-4">
      <span className="text-[15px] text-foreground">{label}</span>
      <span className="text-muted-foreground">→</span>
    </Link>
  );
}
