import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requestPasswordRecovery, completePasswordRecovery } from "@/lib/recovery.functions";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — Relationship Intelligence" },
      {
        name: "description",
        content:
          "Request a secure recovery link or set a new password for your Relationship Intelligence membership.",
      },
      { property: "og:title", content: "Reset your password — Relationship Intelligence" },
      {
        property: "og:description",
        content: "Recover access to your membership with a secure, expiring link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "request" | "sent" | "set" | "invalid";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // A recovery link returns here with either an error in the URL hash or a
  // short-lived recovery session established by the auth client.
  useEffect(() => {
    let alive = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = hash.get("error_description") ?? hash.get("error");
    if (err) {
      setLinkError(err.replace(/\+/g, " "));
      setPhase("invalid");
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPhase("set");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) setPhase("set");
    });
    return () => {
      alive = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestPasswordRecovery({
        data: { email, origin: window.location.origin },
      });
      toast.success(res.message);
      setPhase("sent");
    } catch {
      // The server never distinguishes outcomes; neither do we.
      setPhase("sent");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Anyone holding an old session on another device loses it now.
      await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
      await completePasswordRecovery({ data: {} }).catch(() => undefined);
      toast.success("Password updated. You're signed in on this device only.");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen-shell safe-top safe-bottom px-6 pt-10 pb-10">
      <Link to="/auth" className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        ← Back to sign in
      </Link>

      <div className="mt-10 fade-in-slow">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account recovery</p>
        <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] text-foreground">
          {phase === "set" ? (
            <>
              Choose a new <em className="italic text-primary">password</em>.
            </>
          ) : (
            <>
              Let's get you back <em className="italic text-primary">in</em>.
            </>
          )}
        </h1>
      </div>

      {phase === "invalid" && (
        <p className="mt-6 rounded-2xl border border-destructive/40 bg-card p-4 text-[13px] text-foreground">
          That recovery link is no longer valid{linkError ? ` (${linkError})` : ""}. Links expire
          quickly and can only be used once. Request a fresh one below.
        </p>
      )}

      {phase === "sent" ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink-soft">
            If that address belongs to an account, a recovery link is on its way. It expires
            shortly and can be used once.
          </p>
          <button
            onClick={() => setPhase("request")}
            className="w-full rounded-full border border-border px-6 py-3.5 text-sm text-foreground"
          >
            Use a different address
          </button>
        </div>
      ) : phase === "set" ? (
        <form onSubmit={submitNewPassword} className="mt-8 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              New password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-ring"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Confirm password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-ring"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-4 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Saving…" : "Set new password"}
          </button>
          <p className="pt-1 text-[12px] text-muted-foreground">
            Every other device signed into this account will be signed out.
          </p>
        </form>
      ) : (
        <form onSubmit={submitRequest} className="mt-8 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-ring"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-4 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send recovery link"}
          </button>
          <p className="pt-1 text-[12px] text-muted-foreground">
            For your privacy, we give the same answer whether or not an account exists.
          </p>
        </form>
      )}
    </div>
  );
}
