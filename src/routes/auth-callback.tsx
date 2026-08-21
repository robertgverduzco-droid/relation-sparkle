import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  destinationFor,
  isMissingVerifier,
  readCallbackLink,
} from "@/lib/auth-callback";

/**
 * Single landing point for every Supabase email link (signup confirmation,
 * resend, magic link, email change).
 *
 * Why this route exists: verification links used to point at /home, a
 * protected route whose gate redirects unauthenticated visitors to /auth —
 * discarding the `code` / `token_hash` the auth client still needed to
 * consume, and swallowing any `error_description` the link came back with.
 *
 * Why it no longer depends on the device: the link is a one-time GET, and on
 * desktop a mail scanner or browser prefetch often spends it before the
 * member clicks. That first GET *does* confirm the address; the member's click
 * then arrives as `#error=access_denied&error_code=otp_expired`. Treating that
 * as "already confirmed — sign in" instead of "invalid link" is what makes a
 * fresh email work on iPhone, Chrome, Safari, laptop or desktop alike.
 *
 * Link shapes handled, in order:
 *   - #access_token=&refresh_token=   implicit session (set explicitly)
 *   - ?token_hash=&type=              verifyOtp — device independent
 *   - ?code=                          PKCE exchange — same browser only
 *   - error / otp_expired             already consumed, or genuinely broken
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

function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let alive = true;

    const go = (dest: string) => {
      // Tokens never linger in history.
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace(dest);
    };

    const settle = async (fallback: "consumed" | "error", detail?: string) => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u?.email_confirmed_at || u?.phone_confirmed_at) {
        setMessage("Verified. Taking you in…");
        go(destinationFor("verified"));
        return;
      }
      go(destinationFor(fallback, detail));
    };

    (async () => {
      const link = readCallbackLink(window.location.href);

      if (link.kind === "error") {
        go(destinationFor("error", link.detail));
        return;
      }

      if (link.kind === "consumed") {
        // The address was confirmed by whatever spent the link first.
        setMessage("Your email is already confirmed…");
        await settle("consumed");
        return;
      }

      try {
        if (link.kind === "session") {
          const { error } = await supabase.auth.setSession({
            access_token: link.accessToken,
            refresh_token: link.refreshToken,
          });
          if (error) throw error;
        } else if (link.kind === "token_hash") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: link.tokenHash,
            type: link.type,
          });
          if (error) throw error;
        } else if (link.kind === "code") {
          const { error } = await supabase.auth.exchangeCodeForSession(link.code);
          // Opening the link on a different browser than sign-up means this
          // browser holds no PKCE verifier. Normal, not a broken link.
          if (error && isMissingVerifier(error.message)) {
            if (!alive) return;
            await settle("consumed");
            return;
          }
          if (error) throw error;
        } else {
          if (!alive) return;
          await settle("error", "That link did not include a verification token.");
          return;
        }
      } catch (err) {
        if (!alive) return;
        const detail = err instanceof Error ? err.message : "This link is no longer valid.";
        // A spent token is the common case and is not a failure for the member.
        await settle(/expired|invalid|already/i.test(detail) ? "consumed" : "error", detail);
        return;
      }

      if (!alive) return;
      await settle("consumed");
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

