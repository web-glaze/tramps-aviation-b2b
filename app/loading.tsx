import { Loader2 } from "lucide-react";

/**
 * Default loading UI while a route segment streams in. Next.js shows
 * this immediately on navigation so there's no blank screen during
 * data fetching or code-splitting boundaries. Per-route loading.tsx
 * files override this when they exist.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="flex items-center justify-center min-h-[50vh] w-full"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
