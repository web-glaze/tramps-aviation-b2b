"use client";

/**
 * AppLogo — renders /logo.svg with a Plane icon fallback.
 * Use this everywhere instead of raw <Image src="/logo.svg" />.
 */

import { useState } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  /** Tailwind size class — applied to both the img wrapper and fallback icon div */
  size?: string;
  className?: string;
}

export function AppLogo({ size = "h-9 w-9", className }: AppLogoProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className={cn(
          size,
          "rounded-xl bg-primary flex items-center justify-center shrink-0",
          className,
        )}
      >
        <Plane className="h-[55%] w-[55%] text-white" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="Logo"
      className={cn(size, "rounded-xl object-contain shrink-0", className)}
      onError={() => setBroken(true)}
    />
  );
}
