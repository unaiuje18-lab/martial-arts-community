import { logIncident } from "./incident";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: LovableErrorOptions = {},
): string {
  const incident = logIncident(error, context);
  if (typeof window === "undefined") return incident.id;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      incidentId: incident.id,
      ...context,
    },
    {
      mechanism: options.mechanism ?? "react_error_boundary",
      handled: options.handled ?? false,
      severity: options.severity ?? "error",
    },
  );
  return incident.id;
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    reportLovableError(event.error ?? new Error(event.message), {
      source: "window.onerror",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, { mechanism: "onerror" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportLovableError(event.reason ?? new Error("Unhandled rejection"), {
      source: "unhandledrejection",
    }, { mechanism: "unhandledrejection" });
  });
}
