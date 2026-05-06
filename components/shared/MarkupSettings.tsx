"use client";

/**
 * MarkupSettings — read-only summary of admin-controlled markup config.
 *
 * Markup is set by the platform admin (via the admin portal's Pricing &
 * Feature-Flags pages). Agents can no longer edit it — this card just
 * surfaces the current config so they know what's being applied to their
 * quotes:
 *
 *     Flights       5%   ✓ Active
 *     Hotels        8%   ✗ Disabled by admin
 *     Series Fares  3%   ✓ Active
 *
 * Pulls live from `usePlatformStore` (synced from /admin/public-settings)
 * and the admin's `markupEnabledProducts` array via `useAdminProductFlags`.
 */

import { useEffect } from "react";
import {
  Plane, Hotel, Tag, Loader2, Check, Info, Lock, Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminProductFlags, type Product } from "@/lib/hooks/useAdminProductFlags";
import { usePlatformStore } from "@/lib/store";
import { useAuthStore } from "@/lib/store";

const PRODUCT_META: Record<Product, { label: string; icon: typeof Plane; sub: string }> = {
  flight: { label: "Flights",      icon: Plane, sub: "Applied to flight search results."  },
  hotel:  { label: "Hotels",       icon: Hotel, sub: "Applied to hotel rates."             },
  series: { label: "Series Fares", icon: Tag,   sub: "Applied to series fare results."    },
};

const PERCENT_FIELD: Record<Product, string> = {
  flight: "flightMarkupPercent",
  hotel:  "hotelMarkupPercent",
  series: "seriesMarkupPercent",
};

export function MarkupSettings() {
  const { ps, fetchIfStale } = usePlatformStore();
  const { isMarkupEnabled }  = useAdminProductFlags();
  const { user, _hasHydrated } = useAuthStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIfStale(); }, []);

  // Hide the panel from sub-agents — they don't own pricing decisions.
  // Pre-hydration we render nothing to avoid a flash of forbidden content.
  if (!_hasHydrated) return null;
  const isSubAgent =
    user?.role === "subagent" ||
    !!(user as any)?.parentAgentId ||
    !!(user as any)?.parentAgent;
  if (isSubAgent) return null;

  const products: Product[] = ["flight", "hotel", "series"];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <h3 className="text-base font-bold text-foreground">Markup Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          Markup is set by Tramps Aviation admin and applied automatically to
          your search results. You don&apos;t need to do anything here — this card
          shows the current rates being added to client quotes.
        </p>
      </div>

      {/* Per-product rows (read-only) */}
      <div className="divide-y divide-border">
        {products.map((p) => (
          <ProductRow key={p} product={p} ps={ps} enabled={isMarkupEnabled(p)} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single product row — read-only display, no toggles, no inputs
// ─────────────────────────────────────────────────────────────────────────────

function ProductRow({
  product, ps, enabled,
}: {
  product: Product;
  ps: any;
  enabled: boolean;
}) {
  const meta = PRODUCT_META[product];
  const Icon = meta.icon;
  const percent = Number(ps?.[PERCENT_FIELD[product]]) || 0;
  const effectivelyActive = enabled && percent > 0;

  return (
    <div className={cn("px-5 py-4", !enabled && "opacity-70")}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
          effectivelyActive ? "bg-primary/10" : "bg-muted",
        )}>
          <Icon className={cn(
            "h-5 w-5",
            effectivelyActive ? "text-primary" : "text-muted-foreground",
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{meta.label}</p>
            {effectivelyActive && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <Check className="h-2.5 w-2.5" />
                Active
              </span>
            )}
            {!enabled && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-bold">
                <Lock className="h-2.5 w-2.5" />
                Disabled by admin
              </span>
            )}
            {enabled && percent === 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-bold">
                Not configured
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta.sub}</p>
        </div>

        {/* Percent badge — orange brand accent for the live value */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={cn(
              "text-2xl font-extrabold tabular-nums",
              effectivelyActive
                ? "text-[hsl(var(--brand-orange))]"
                : "text-muted-foreground/50",
            )}
          >
            {percent}
          </span>
          <Percent
            className={cn(
              "h-4 w-4",
              effectivelyActive
                ? "text-[hsl(var(--brand-orange))]"
                : "text-muted-foreground/50",
            )}
          />
        </div>
      </div>
    </div>
  );
}
