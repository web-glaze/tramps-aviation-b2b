"use client";

/**
 * RootProviders — client-only providers that wrap the entire app.
 *
 * Lives outside `app/layout.tsx` so that the layout can stay a Server
 * Component and export a `metadata` object (Next.js does not allow
 * `metadata` exports from "use client" files).
 */

import { SettingsProvider } from "./SettingsProvider";
import { DevPathBar } from "@/components/dev/DevPathBar";
import { Toaster } from "sonner";

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <DevPathBar />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-body, inherit)",
            fontSize: "13px",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            border: "1px solid hsl(var(--border))",
          },
          duration: 4000,
        }}
      />
    </SettingsProvider>
  );
}
