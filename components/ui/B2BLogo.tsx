"use client";
/**
 * B2BLogo — Safe logo component with fallback
 * Uses Next.js Image for /logo.svg from public folder.
 * If the image fails (404, null), shows a Plane icon fallback.
 *
 * Usage:
 *   <B2BLogo size={44} />          → 44×44px
 *   <B2BLogo size="sm" />          → 32×32 (small)
 *   <B2BLogo size="md" />          → 40×40 (medium)
 *   <B2BLogo size="lg" />          → 48×48 (large)
 */
import { useState } from "react";
import Image from "next/image";
import { Plane } from "lucide-react";

type LogoSize = "sm" | "md" | "lg" | number;

const SIZE_MAP: Record<string, number> = { sm: 32, md: 40, lg: 48 };

interface B2BLogoProps {
  size?: LogoSize;
  className?: string;
  showFallbackIcon?: boolean; // show Plane icon when logo missing (default: true)
}

export function B2BLogo({
  size = "md",
  className = "",
  showFallbackIcon = true,
}: B2BLogoProps) {
  const [error, setError] = useState(false);
  const px = typeof size === "number" ? size : (SIZE_MAP[size] ?? 40);
  const iconSize = Math.round(px * 0.5);

  if (error && showFallbackIcon) {
    return (
      <div
        className={`rounded-xl bg-primary flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <Plane
          style={{ width: iconSize, height: iconSize }}
          className="text-primary-foreground"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden bg-white border border-border flex-shrink-0 relative ${className}`}
      style={{ width: px, height: px }}
    >
      <Image
        src="/logo.svg"
        alt="Tramps Aviation"
        width={px}
        height={px}
        className="object-contain w-full h-full"
        onError={() => setError(true)}
        unoptimized
        priority
      />
      {/* Fallback overlay when image fails */}
      {error && (
        <div className="absolute inset-0 bg-primary flex items-center justify-center">
          <Plane
            style={{ width: iconSize, height: iconSize }}
            className="text-primary-foreground"
          />
        </div>
      )}
    </div>
  );
}
