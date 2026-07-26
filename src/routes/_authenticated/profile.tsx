import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Living Profile — Relationship Intelligence" },
      { name: "description", content: "Review the Living Profile the AI has built with you." },
      { property: "og:title", content: "Your Living Profile" },
      { property: "og:description", content: "Review the Living Profile the AI has built with you." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = { display_name: string | null; city: string | null };
type IntelligenceRow = {
  core_values: unknown;
  life_direction: string | null;
  self_understanding: string | null;
  communication_style: string | null;
  conflict_style: string | null;
  partnership_vision: string | null;
  readiness_summary: string | null;
  last_interview_at: string | null;
  profile_approved_at: string | null;
};

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [intel, setIntel] = useState<IntelligenceRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: i }] = await Promise.all([
        supabase.from("profiles").select("display_name, city").maybeSingle(),
        supabase
          .from("user_intelligence")
          .select(
            "core_values, life_direction, self_understanding, communication_style, conflict_style, partnership_vision, readiness_summary, last_interview_at, profile_approved_at"
          )
          .maybeSingle(),
      ]);
      setProfile(p as ProfileRow | null);
      setIntel(i as IntelligenceRow | null);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast("You've signed out.");
    navigate({ to: "/" });
  }

  const values = Array.isArray(intel?.core_values) ? (intel!.core_values as string[]) : [];
  const hasIntel =
    !!intel &&
    (values.length > 0 ||
      intel.life_direction ||
      intel.self_understanding ||
      intel.communication_style ||
      intel.conflict_style ||
      intel.partnership_vision ||
      intel.readiness_summary);
  const approved = !!intel?.profile_approved_at;

  return (
    <div className="screen-shell safe-top pb-28">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your Living Profile</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          {profile?.display_name ?? "You"}
        </h1>
        {profile?.city && <p className="mt-1 text-sm text-ink-soft">{profile.city}</p>}
        {intel?.last_interview_at && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Last updated {new Date(intel.last_interview_at).toLocaleDateString()}
            {approved ? " · approved by you" : " · pending your review"}
          </p>
        )}
      </header>

      {loading ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">Loading…</p>
      ) : !hasIntel ? (
        <section className="mx-6 mt-8 rounded-3xl border border-border/70 bg-card p-6">
          <h2 className="font-display text-[1.4rem] text-foreground">Your profile is still forming</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Complete a short AI interview so we can begin your Living Profile.
          </p>
          <Link
            to="/interview"
            className="mt-5 block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
          >
            Begin the interview
          </Link>
        </section>
      ) : (
        <>
          {!approved && (
            <section className="mx-6 mt-6 rounded-3xl border border-primary/40 bg-primary/5 p-5">
              <p className="text-[13px] uppercase tracking-[0.2em] text-primary">Review needed</p>
              <p className="mt-2 text-[15px] text-foreground">
                Read what the AI has understood about you. Correct anything that isn’t right,
                then approve it so introductions can begin.
              </p>
              <Link
                to="/profile/review"
                className="mt-4 block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
              >
                Review & approve
              </Link>
            </section>
          )}

          <section className="mt-8 space-y-4 px-6">
            {values.length > 0 && (
              <Card title="Core values">
                <div className="flex flex-wrap gap-2">
                  {values.map((v) => (
                    <span
                      key={v}
                      className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[13px] text-foreground"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </Card>
            )}
            <Field label="Life direction" value={intel?.life_direction} />
            <Field label="Self-understanding" value={intel?.self_understanding} />
            <Field label="Communication style" value={intel?.communication_style} />
            <Field label="Conflict style" value={intel?.conflict_style} />
            <Field label="Partnership vision" value={intel?.partnership_vision} />
            <Field label="Readiness" value={intel?.readiness_summary} />
          </section>

          <div className="mt-8 px-6">
            <Link
              to="/profile/review"
              className="block w-full rounded-full border border-border px-6 py-3 text-center text-[15px] text-foreground"
            >
              {approved ? "Edit profile" : "Review & approve"}
            </Link>
          </div>
        </>
      )}

      <div className="mt-8 space-y-2 px-6">
        <Link
          to="/privacy"
          className="block w-full rounded-full border border-border px-6 py-3 text-center text-[13px] text-muted-foreground"
        >
          Privacy
        </Link>
        <button
          onClick={signOut}
          className="w-full rounded-full border border-border px-6 py-3 text-sm text-foreground"
        >
          Sign out
        </button>
      </div>

      <MobileTabBar current="profile" />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Card title={label}>
      <p className="text-[15px] leading-relaxed text-foreground/90">{value}</p>
    </Card>
  );
}
