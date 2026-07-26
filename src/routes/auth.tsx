import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/home" },
        });
        if (error) throw error;
        toast.success("Welcome. Check your email to confirm your account.");
        navigate({ to: "/home" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error("Google sign-in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/home" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen-shell safe-top safe-bottom px-6 pt-10 pb-10">
      <Link to="/" className="text-xs uppercase tracking-[0.25em] text-muted-foreground">← Back</Link>

      <div className="mt-10 fade-in-slow">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {isSignup ? "Begin your profile" : "Welcome back"}
        </p>
        <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] text-foreground">
          {isSignup ? <>Let's build your <em className="italic text-primary">intelligence</em>.</> : <>Sign in to <em className="italic text-primary">continue</em>.</>}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {isSignup ? "This is where a slower, more intentional way of meeting people begins." : "Your matches, conversations, and reflections are waiting."}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-medium text-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Email</span>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" inputMode="email"
            className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-ring"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Password</span>
          <input
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-[15px] text-foreground outline-none focus:border-ring"
          />
        </label>
        <button
          type="submit" disabled={busy}
          className="w-full rounded-full bg-primary px-6 py-4 text-center text-[15px] font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <button
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isSignup ? "Sign in" : "Begin your profile"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.2 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.4 0 10.2-2.1 13.8-5.5l-6.4-5.3C29.3 34.7 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 33.1C9.3 39.6 16 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.4 5.3C40.9 35.9 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
