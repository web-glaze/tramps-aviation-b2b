"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OfflineBanner
 * ─────────────
 * Mounts at the top of the layout. Shows a sticky banner when navigator.onLine
 * is false and auto-dismisses (with a "Back online" flash) when connectivity
 * is restored.
 *
 * Usage — add once inside layout.tsx:
 *   <OfflineBanner />
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  useEffect(() => {
    // Set initial state (guard against SSR)
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setJustRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustRestored(true);
      // Hide the "Back online" message after 3 s
      setTimeout(() => setJustRestored(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !justRestored) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-300",
        isOffline
          ? "bg-red-500 text-white"
          : "bg-emerald-500 text-white",
      )}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>
            No internet connection — some features may not work until you
            reconnect.
          </span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 flex-shrink-0" />
          <span>Back online — you&apos;re connected again.</span>
        </>
      )}
    </div>
  );
}
