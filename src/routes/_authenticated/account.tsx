import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { readAccountIdentity, type AccountIdentity } from "@/lib/account-identity";
import { toast } from "sonner";
import { InstallAppAction } from "@/components/install-app-action";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account settings — Relationship Intelligence" },
      { name: "description", content: "The account you are currently signed in with." },
      { property: "og:title", content: "Account settings" },
      { property: "og:description", content: "The account you are currently signed in with." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Identity always comes from the current authenticated session.
      const { data } = await supabase.auth.getUser();
      if (data.user) setIdentity(readAccountIdentity(data.user));
      const { data: p } = await supabase.from("profiles").select("display_name").maybeSingle();
      setDisplayName((p as { display_name: string | null } | null)?.display_name ?? null);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast("You've signed out.");
    navigate({ to: "/" });
  }

  return (
    <div className="screen-shell safe-top pb-28" data-testid="account-screen">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Account</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
          Account settings
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          The account you are currently signed in with.
        </p>
      </header>

      {loading ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">A moment…</p>
      ) : (
        <section className="mt-8 space-y-3 px-6">
          <Row label="Name" value={displayName ?? "—"} testId="account-name" />
          <Row label="Signed-in email" value={identity?.email ?? "—"} testId="account-email" />
          <Row
            label="Email status"
            value={identity?.emailVerified ? "Verified" : "Not verified"}
            testId="account-email-status"
          />
          <Row
            label="Sign-in method"
            value={identity?.signInMethod ?? "Unknown"}
            testId="account-signin-method"
          />
          {identity?.createdAt && (
            <Row
              label="Member since"
              value={new Date(identity.createdAt).toLocaleDateString()}
              testId="account-created"
            />
          )}
          <p className="pt-1 text-[12px] text-muted-foreground">
            Your email is read-only here. If it needs to change, tell Athena and we'll handle it
            properly.
          </p>
        </section>
      )}

      <div className="mt-8 space-y-2 px-6">
        <Link
          to="/profile"
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-border px-6 py-3 text-center text-[13px] text-muted-foreground"
        >
          Back to your profile
        </Link>
        <button
          data-testid="account-sign-out"
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

function Row({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-2 break-all text-[15px] text-foreground/90">
        {value}
      </p>
    </div>
  );
}
