"use client";
// QueryProvider removed — we use pure Zustand, not react-query
// This file kept as passthrough so no import errors
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
