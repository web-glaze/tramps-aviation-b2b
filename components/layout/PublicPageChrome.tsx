"use client";

/**
 * PublicPageChrome
 * ────────────────
 * Wraps the page content in `<Header />` + `<Footer />` when the route is
 * accessed publicly (e.g. /flights, /hotels, /insurance, /series-fare), and
 * passes through unchanged when the same component is mounted under /b2b/*
 * (where `app/b2b/layout.tsx` already supplies its own header & footer).
 *
 * Why this exists:
 *   The /flights, /hotels, etc. pages are dual-purpose. Anonymous visitors
 *   reach them at `/flights` etc. and need the marketing chrome. Logged-in
 *   agents reach the *same component* at `/b2b/flights` (mounted via a
 *   `dynamic()` import inside the b2b portal) and already have the agent
 *   navbar. Without this wrapper the public version would render headerless,
 *   and the B2B version would render two headers stacked.
 *
 * Usage:
 *   <PublicPageChrome>
 *     <main>...your search UI...</main>
 *   </PublicPageChrome>
 */

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PublicPageChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const inB2BPortal = pathname.startsWith("/b2b/");

  // Wrapping the children in Suspense lets descendants safely use
  // `useSearchParams()` (the auto-search effect on /flights, /hotels and
  // /series-fare relies on it). Without Suspense, Next.js bails the build
  // out of static optimisation and warns at runtime.
  const suspended = (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  );

  if (inB2BPortal) {
    // The b2b layout already wraps this with Header + Footer — emit only the
    // (Suspense-wrapped) page content so we don't double-render the chrome.
    return suspended;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {suspended}
      </main>
      <Footer />
    </div>
  );
}
