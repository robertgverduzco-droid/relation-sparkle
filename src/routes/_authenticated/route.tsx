import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Email verification gate: unverified users can complete auth but cannot
    // reach the dashboard, matchmaking, or Athena until they confirm.
    if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at) {
      if (!location.pathname.startsWith("/verify")) {
        throw redirect({ to: "/auth", search: { verify: 1 } as never });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
