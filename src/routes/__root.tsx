import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { hasAuthLinkParams } from "@/lib/auth-callback";

import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AppLock } from "@/components/app-lock";

import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="screen-shell items-center justify-center px-6">
      <div className="text-center fade-in-slow">
        <p className="font-display text-6xl text-foreground">404</p>
        <h2 className="mt-4 text-lg text-foreground">This page isn't here.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Some paths simply don't lead anywhere. Let's return to the beginning.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="screen-shell items-center justify-center px-6">
      <div className="text-center">
        <h1 className="font-display text-2xl text-foreground">Something interrupted this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Take a breath. Try again — or return to the beginning.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // Literal sRGB of --field (oklch(0.155 0.012 268)); meta tags cannot read CSS vars.
      { name: "theme-color", content: "#030304" },

      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Relationship Intelligence" },
      { title: "Relationship Intelligence — Meet someone who fits your life" },
      { name: "description", content: "A calm, intelligent introduction platform. Values, readiness and depth first — never a swipe deck." },
      { property: "og:title", content: "Relationship Intelligence" },
      { property: "og:description", content: "A calm, intelligent introduction platform. Values, readiness and depth first — never a swipe deck." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Auth email links do not always land where we asked. When a redirect target
  // is not on the project's allow-list, Supabase falls back to the site root,
  // so a confirmation can arrive at "/" with the session — or an
  // already-spent-link error — in the fragment. Hand it to /auth-callback from
  // whatever route receives it, before the page renders over it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasAuthLinkParams(window.location.href)) return;
    const { search, hash } = window.location;
    window.location.replace(`/auth-callback${search}${hash}`);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);


  return (
    <QueryClientProvider client={queryClient}>
      {/* Exactly one <main> landmark for the whole app. */}
      <main>
        <Outlet />
      </main>
      <PWAInstallPrompt />

      <AppLock />

      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
