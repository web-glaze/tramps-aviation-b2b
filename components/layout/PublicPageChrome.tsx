"use client";

/**
 * PublicPageChrome
 * ────────────────
 * Wraps page content with `<Header />` + `<main>` + `<Footer />` ONLY
 * when the route is one of the standalone public CMS pages
 * (`/about`, `/faq`, `/privacy`, `/terms`, `/refund`). On every other
 * route the surrounding `AgentShell` (mounted in `app/layout.tsx`)
 * already provides Header + Footer + the max-width container — so this
 * component degrades to a transparent Suspense pass-through to avoid
 * stacking two Headers / two Footers on a single page.
 *
 * Why this exists at all: a few pages (`/flights`, `/hotels`,
 * `/insurance`, `/series-fare`) used to be served as both public
 * marketing pages AND inside the agent shell. Today they're agent-only,
 * but the import is widespread; rather than touch a dozen call sites we
 * keep one smart wrapper that does the right thing per route.
 *
 * The Suspense boundary is preserved for both modes because the
 * descendants frequently call `useSearchParams()`, which Next.js
 * requires to live inside one (otherwise the build bails out of static
 * optimisation).
 */

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

// Routes that DON'T have AgentShell chrome around them — these are the
// only routes where PublicPageChrome should add its own Header + Footer.
// Keep this list in sync with `CMS_PAGES` inside `AgentShell.tsx`.
const STANDALONE_CMS_ROUTES = new Set<string>([
  "/about",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
]);

function SuspendedChildren({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function PublicPageChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const needsOwnChrome =
    STANDALONE_CMS_ROUTES.has(pathname) ||
    // Catch nested CMS routes too (e.g. /privacy/cookies if added later).
    Array.from(STANDALONE_CMS_ROUTES).some((p) =>
      pathname.startsWith(p + "/"),
    );

  // AgentShell already supplies Header + Footer on every other route, so
  // here we just hand the children through with a Suspense boundary.
  if (!needsOwnChrome) {
    return <SuspendedChildren>{children}</SuspendedChildren>;
  }

  // Standalone public CMS surfaces — supply the full chrome.
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <SuspendedChildren>{children}</SuspendedChildren>
      </main>
      <Footer />
    </div>
  );
}
