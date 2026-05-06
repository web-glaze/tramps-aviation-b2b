"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Default error boundary for the app shell. Next.js renders this
 * when an unhandled error escapes a route segment. We log it (so
 * Sentry / your error tracker picks it up) and show the user a
 * recovery UI with both "Try again" and "Go home" actions.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-1">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        An unexpected error broke this page. Try again — if the problem
        keeps happening, contact support and quote the reference below.
      </p>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground/70 font-mono mb-5">
          ref: {error.digest}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </a>
      </div>
    </div>
  );
}
