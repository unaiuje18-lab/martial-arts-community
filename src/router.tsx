import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Retry transient failures (network/5xx) with capped exponential backoff.
        // Skip retries for unrecoverable client errors (4xx).
        retry: (failureCount, error) => {
          const status = (error as { status?: number; statusCode?: number } | undefined)
            ?.status ?? (error as { statusCode?: number } | undefined)?.statusCode;
          if (typeof status === "number" && status >= 400 && status < 500) return false;
          return failureCount < 3;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
