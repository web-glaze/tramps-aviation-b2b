"use client";
// ThemeProvider removed — Zustand useSettingsStore handles all themes
// SettingsProvider.tsx applies them via data-* attributes and CSS vars
// This file kept as passthrough so no import errors
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
