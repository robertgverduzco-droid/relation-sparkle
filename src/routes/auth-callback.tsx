import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single landing point for every Supabase email link (signup confirmation,
 * resend, magic link, email change).
 *
 * Why this route exists: verification links used to point at /home, a
 * protected route whose gate redirects unauthenticated visitors to /auth —
 * discarding the `code` / `token_hash` the auth client still needed to
 * consume, and swallowing any `error_description` the link came back with.
 * The member saw Athena open, nothing was verified, and no reason was shown.
 *
 * This route is public, client-only, and consumes the link before any gate
 * runs. It handles all three link shapes:
 *   - ?token_hash=&type=   (verifyOtp — works across browsers/devices)
 *   - ?code=               (PKCE exchange — same browser as sign-up)
 *   - #access_token=...    (implicit; the client picks it up itself)
 */
export const Route = createFileRoute("/auth-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirming your email — Relationship Intelligence" },
      {
        name: "description",
        content: "Completing email verification for your Relationship Intelligence membership.",
      },
      { property: "og:title", content: "Confirming your email — Relationship Intelligence" },
      {
        property: "og:description",
        content: "Completing email verification for your Relationship Intelligence membership.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

type OtpType = "signup" | "magiclink" | "recovery" | "invite" | "email_change" | "email";

function toAuth(error?: string): void {
  const dest = error
    ? `/auth#error_description=${encodeURIComponent(error)}`
    : "/auth?verify=1";
  window.location.replace(dest);
}

function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let alive = true;
    (async () => {
      const url = new URL(window.location.href);
      const q = url.searchParams;
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      const linkError =
        q.get("error_description") ??
        q.get("error") ??
        hash.get("error_description") ??
        hash.get("error");
      if (linkError) {
        toAuth(linkError.replace(/\+/g, " "));
        return;
      }

      const tokenHash = q.get("token_hash") ?? q.get("token");
      const type = (q.get("type") as OtpType | null) ?? "signup";
      const code = q.get("code");

      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
      } catch (err) {
        // A consumed or expired link is the common case; report it honestly
        // rather than dropping the member into a silent verification loop.
        if (!alive) return;
        const detail = err instanceof Error ? err.message : "This link is no longer valid.";
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (u?.email_confirmed_at || u?.phone_confirmed_at) {
          window.location.replace("/home");
          return;
        }
        toAuth(detail);
        return;
      }

      if (!alive) return;
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u?.email_confirmed_at || u?.phone_confirmed_at) {
        setMessage("Verified. Taking you in…");
        window.location.replace("/home");
        return;
      }
      // Token consumed but this browser holds no session (cross-device open):
      // the address is confirmed server-side; ask them to sign in.
      toAuth(
        tokenHash || code
          ? "Your email is confirmed. Please sign in to continue."
          : "That link did not include a verification token.",
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="screen-shell safe-top safe-bottom flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm text-ink-soft" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
