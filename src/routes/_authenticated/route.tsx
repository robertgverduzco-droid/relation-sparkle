import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Rescue auth-link parameters that older emails point at protected routes.
    // Without this the gate redirects to /auth and destroys the token before
    // the auth client can consume it, leaving the account unverified.
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      const hasLinkParams =
        u.searchParams.has("code") ||
        u.searchParams.has("token_hash") ||
        u.searchParams.has("token") ||
        u.searchParams.has("error_description") ||
        u.hash.includes("access_token=") ||
        u.hash.includes("error_description=");
      if (hasLinkParams) {
        window.location.replace(`/auth-callback${u.search}${u.hash}`);
        throw new Error("redirecting to auth callback");
      }
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Email verification gate: unverified members can hold a session but
    // cannot reach the dashboard, matchmaking, or Athena until they confirm.
    // The verification state lives on the public /auth screen (?verify=1) —
    // there is no separate /verify route.
    if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at) {
      throw redirect({ to: "/auth", search: { verify: 1 } as never });
    }
    return { user: data.user };
  },

  component: () => <Outlet />,
});
