import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { PhotoUploader } from "@/components/photo-uploader";
import { DeviceSafetyPanel } from "@/components/device-safety-panel";
import { ConsentPanel } from "@/components/consent-panel";

import { setAccountPaused } from "@/lib/account.functions";
import { amIModerator } from "@/lib/moderation.functions";
import { getFounderStatus } from "@/lib/founder.functions";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Living Profile — Relationship Intelligence" },
      {
        name: "description",
        content: "What Athena is coming to understand about you.",
      },
      { property: "og:title", content: "Your Living Profile" },
      {
        property: "og:description",
        content: "What Athena is coming to understand about you.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = { display_name: string | null; city: string | null; is_paused: boolean | null };
type IntelligenceRow = {
  core_values: unknown;
  life_direction: string | null;
  self_understanding: string | null;
  communication_style: string | null;
  conflict_style: string | null;
  partnership_vision: string | null;
  readiness_summary: string | null;
  last_interview_at: string | null;
};

function ProfilePage() {
  const navigate = useNavigate();
  const pauseFn = useServerFn(setAccountPaused);
  
  const modCheck = useServerFn(amIModerator);
  const founderCheck = useServerFn(getFounderStatus);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [intel, setIntel] = useState<IntelligenceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  // Convenience only — /founder and every founder server fn re-verify the
  // `founder` role server-side from the bearer token on each request.
  const [isFounder, setIsFounder] = useState(false);


  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: i }, mod, founder] = await Promise.all([
        supabase.from("profiles").select("display_name, city, is_paused").maybeSingle(),
        supabase
          .from("user_intelligence")
          .select(
            "core_values, life_direction, self_understanding, communication_style, conflict_style, partnership_vision, readiness_summary, last_interview_at",
          )
          .maybeSingle(),
        modCheck({}).catch(() => ({ moderator: false })),
        founderCheck({}).catch(() => ({ isFounder: false })),
      ]);
      setProfile(p as ProfileRow | null);
      setIntel(i as IntelligenceRow | null);
      setIsModerator(Boolean(mod?.moderator));
      setIsFounder(Boolean(founder?.isFounder));
      setLoading(false);
    })();
  }, [modCheck, founderCheck]);


  async function signOut() {
    await supabase.auth.signOut();
    toast("You've signed out.");
    navigate({ to: "/" });
  }

  async function togglePause() {
    if (!profile) return;
    setBusy(true);
    try {
      const next = !profile.is_paused;
      await pauseFn({ data: { paused: next } });
      setProfile({ ...profile, is_paused: next });
      toast(next ? "Athena has paused your matches." : "Welcome back — matches resumed.");
    } catch {
      toast.error("Couldn't update pause state.");
    } finally {
      setBusy(false);
    }
  }

  // Account deletion now lives in <DeviceSafetyPanel />, where it is gated by
  // step-up reauthentication (F-12). A typed phrase is not enough.


  const values = Array.isArray(intel?.core_values)
    ? (intel!.core_values as string[])
    : [];
  const hasIntel =
    !!intel &&
    (values.length > 0 ||
      intel.life_direction ||
      intel.self_understanding ||
      intel.communication_style ||
      intel.conflict_style ||
      intel.partnership_vision ||
      intel.readiness_summary);

  return (
    <div className="screen-shell safe-top pb-28" data-testid="profile-screen">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Your Living Profile
        </p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          {profile?.display_name ?? "You"}
        </h1>
        {profile?.city && (
          <p className="mt-1 text-sm text-ink-soft">{profile.city}</p>
        )}
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          What Athena is coming to understand about you. This will keep evolving as
          you speak with her — nothing here is fixed or final.
        </p>
        {intel?.last_interview_at && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            Last refined {new Date(intel.last_interview_at).toLocaleDateString()}
          </p>
        )}
      </header>

      {loading ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">A moment…</p>
      ) : !hasIntel ? (
        <section className="mx-6 mt-8 rounded-3xl border border-border/70 bg-card p-6">
          <h2 className="font-display text-[1.4rem] text-foreground">
            Athena is still getting to know you
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Understanding takes conversation. Sit with her for a while — no forms,
            no right answers.
          </p>
          <Link
            to="/athena"
            className="mt-5 block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
          >
            Talk with Athena
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-8 space-y-4 px-6">
            {values.length > 0 && (
              <Card title="What you seem to care about">
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
            <Field label="Where your life is going" value={intel?.life_direction} />
            <Field
              label="How you understand yourself"
              value={intel?.self_understanding}
            />
            <Field
              label="How you tend to communicate"
              value={intel?.communication_style}
            />
            <Field label="How you handle conflict" value={intel?.conflict_style} />
            <Field
              label="What you're building toward"
              value={intel?.partnership_vision}
            />
            <Field label="Where you are right now" value={intel?.readiness_summary} />
          </section>

          <section className="mt-6 px-6">
            <PhotoUploader />
          </section>



          <div className="mt-8 px-6">
            <Link
              data-testid="profile-review-link"
              to="/profile/review"
              className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[15px] text-foreground"
            >
              Correct anything that isn't you
            </Link>
          </div>
        </>
      )}

      <div className="mt-8 space-y-2 px-6">
        <Link
          to="/athena"
          className="block w-full rounded-full bg-primary px-6 py-3 text-center text-[15px] font-medium text-primary-foreground"
        >
          Continue with Athena
        </Link>
        {/* A-04: the legacy /conversations surface (pre-Athena interview
            transcript) is no longer linked. /athena is the canonical
            conversation surface. */}
        <button
          data-testid="profile-pause-toggle"
          data-paused={profile?.is_paused ? "true" : "false"}
          onClick={togglePause}
          disabled={busy || !profile}
          className="w-full rounded-full border border-border px-6 py-3 text-sm text-foreground disabled:opacity-60"
        >
          {profile?.is_paused ? "Resume matches" : "Pause matches"}
        </button>
        {profile?.is_paused && (
          <p className="text-center text-xs text-muted-foreground">
            You're paused. Athena won't create introductions until you resume.
          </p>
        )}
        <Link
          data-testid="profile-understanding-link"
          to="/understanding"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-foreground"
        >
          What Athena understands about you
        </Link>
        <Link
          data-testid="profile-membership-link"
          to="/membership"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-muted-foreground"
        >
          Membership
        </Link>
        <Link


          to="/privacy"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-muted-foreground"
        >
          Privacy
        </Link>
        <Link
          to="/terms"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-muted-foreground"
        >
          Terms of Service
        </Link>
        <Link
          to="/community-guidelines"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-muted-foreground"
        >
          Community Guidelines
        </Link>
        {isModerator && (
          <Link
            to="/moderation"
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-foreground"
          >
            Moderation review
          </Link>
        )}
        {isFounder && (
          <Link
            to="/founder"
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center  text-[13px] text-muted-foreground"
          >
            Founder Dialogue
          </Link>
        )}

        <button
          data-testid="profile-sign-out"
          onClick={signOut}
          className="w-full rounded-full border border-border px-6 py-3 text-sm text-foreground"
        >
          Sign out
        </button>
      </div>

      <section className="mt-6 px-6">
        <ConsentPanel mode="settings" />
      </section>

      <section className="mt-6 px-6">
        <DeviceSafetyPanel />
      </section>



      <MobileTabBar current="profile" />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <Card title={label}>
      <p className="text-[15px] leading-relaxed text-foreground/90">{value}</p>
    </Card>
  );
}
