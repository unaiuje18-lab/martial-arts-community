import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError, installGlobalErrorHandlers } from "../lib/lovable-error-reporting";
import { installPerformanceObservers } from "../lib/metrics";
import { IncidentsPanel } from "@/components/IncidentsPanel";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { auth as localAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { useRouterState } from "@tanstack/react-router";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [incidentId, setIncidentId] = useState<string | null>(null);
  useEffect(() => {
    const id = reportLovableError(error, { boundary: "tanstack_root_error_component" });
    setIncidentId(id);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {incidentId && (
          <p className="mt-3 text-xs font-mono text-muted-foreground">
            Incident ID: <span className="text-foreground">{incidentId}</span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Martial Arts Community" },
      { name: "description", content: "Mobile-first martial arts training, learning and community. Vertical video feed, technique duels, and a private training tracker." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Martial Arts Community" },
      { property: "og:description", content: "Mobile-first martial arts training, learning and community. Vertical video feed, technique duels, and a private training tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Martial Arts Community" },
      { name: "twitter:description", content: "Mobile-first martial arts training, learning and community. Vertical video feed, technique duels, and a private training tracker." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3bb879dd-6406-4268-a8a5-a1f3aa557858/id-preview-f2a5683b--3bcbb2f5-2426-478d-86b6-829d3268ed26.lovable.app-1781017091204.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3bb879dd-6406-4268-a8a5-a1f3aa557858/id-preview-f2a5683b--3bcbb2f5-2426-478d-86b6-829d3268ed26.lovable.app-1781017091204.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
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
      <head>
        <HeadContent />
      </head>
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
  const location = useRouterState({ select: (s) => s.location });
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    installGlobalErrorHandlers();
    installPerformanceObservers();
  }, []);

  // Single auth-state subscriber: keeps local onboarding storage in sync,
  // invalidates router/queries on identity transitions, ignores token refresh
  // noise. Wired here so every route benefits.
  useEffect(() => {
    // Prime active user id from existing session.
    supabase.auth.getUser().then(({ data }) => {
      localAuth.setActiveUserId(data.user?.id ?? null);
      setAuthedUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }
      localAuth.setActiveUserId(session?.user?.id ?? null);
      setAuthedUserId(session?.user?.id ?? null);
      if (event === "SIGNED_OUT") setOnboardingComplete(null);
      router.invalidate();
      if (event !== "SIGNED_OUT") {
        queryClient.invalidateQueries();
      } else {
        queryClient.clear();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Hard gate: any signed-in user with an incomplete profile is locked into
  // /onboarding until they finish. Public auth routes are exempt.
  useEffect(() => {
    if (!authedUserId) {
      setOnboardingComplete(null);
      return;
    }
    let cancelled = false;
    const local = localAuth.get();
    if (local?.name) {
      setOnboardingComplete(true);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", authedUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const filled = !!(data?.display_name && data.display_name.trim().length > 0);
        setOnboardingComplete(filled);
      });
    return () => {
      cancelled = true;
    };
  }, [authedUserId]);

  useEffect(() => {
    if (!authedUserId || onboardingComplete !== false) return;
    const path = location.pathname;
    const exempt = path === "/onboarding" || path === "/auth" || path === "/reset-password";
    if (!exempt) {
      router.navigate({ to: "/onboarding", replace: true });
    }
  }, [authedUserId, onboardingComplete, location.pathname, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" />
          <IncidentsPanel />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
