import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
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
