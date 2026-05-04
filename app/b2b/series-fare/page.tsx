"use client";
// B2B Series Fare — renders the same series-fare content inside B2B layout
// The B2B layout.tsx wraps this with sidebar automatically
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Reuse the public series-fare page component directly
const SeriesFarePage = dynamic(() => import("../../series-fare/page"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  ssr: false,
});

export default function B2BSeriesFarePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SeriesFarePage />
    </Suspense>
  );
}