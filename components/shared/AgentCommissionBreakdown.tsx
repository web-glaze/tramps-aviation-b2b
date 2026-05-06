"use client";

/**
 * AgentCommissionBreakdown
 * ────────────────────────
 * Single source of truth for showing agent commission, GST & net payable.
 *
 * - Renders ONLY for agents (role === "agent"). Customers/guests see nothing.
 * - GST rate comes from usePlatformStore (fetched from /admin/public-settings).
 *   This means admin changes to GST % take effect as soon as the platform
 *   settings are refreshed — no stale module-level cache.
 * - Commission comes from backend commission-rules engine when available.
 *   Falls back to commissionPercent prop, then 5% default.
 */

import { useAuthStore, usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useEffect } from "react";

export interface AgentCommissionBreakdownProps {
  /** Final price customer pays (including all taxes) */
  totalAmount: number;
  /** Base fare if known */
  baseFare?: number;
  /** Tax amount if known */
  taxes?: number;
  /** Commission % fallback (used only when commissionAmount is not provided) */
  commissionPercent?: number;
  /** ✅ PREFERRED: Exact commission amount from backend commission-rules engine */
  commissionAmount?: number;
  /** ✅ PREFERRED: Exact GST on commission from backend */
  gstOnCommission?: number;
  /** ✅ PREFERRED: Exact net payable from backend */
  netPayable?: number;
  /** Product for labeling */
  productType?: "flight" | "hotel" | "insurance" | "series-fare";
  /** Number of pax/units for labeling */
  quantity?: number;
  quantityLabel?: string;
  /** Layout density */
  variant?: "full" | "compact";
  /** Hide the estimate disclaimer */
  hideDisclaimer?: boolean;
  className?: string;
}

export function AgentCommissionBreakdown({
  totalAmount,
  baseFare,
  taxes,
  commissionPercent = 5,
  commissionAmount,
  gstOnCommission: gstOnCommissionProp,
  netPayable: netPayableProp,
  productType = "flight",
  quantity = 1,
  quantityLabel = "pax",
  variant = "full",
  hideDisclaimer = false,
  className,
}: AgentCommissionBreakdownProps) {
  const { role } = useAuthStore();
  const isAgent = role === "agent";

  // ── GST rate from platform store (admin-configurable, always fresh) ────────
  // usePlatformStore.fetchIfStale() is called once on layout mount, so by the
  // time this component renders the correct value is already in the store.
  // No more stale 18% hardcode — admin changes take effect immediately.
  const { ps, fetchIfStale } = usePlatformStore();
  useEffect(() => {
    fetchIfStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const gstRate =
    typeof ps.gstPercent === "number" && ps.gstPercent > 0 ? ps.gstPercent : 18; // safe fallback if settings not loaded yet

  if (!isAgent) return null;

  const total = Number(totalAmount) || 0;
  if (total <= 0) return null;

  // ── Commission: use exact backend value first, then percent, then 5% default
  const hasExactCommission =
    typeof commissionAmount === "number" && commissionAmount >= 0;
  const commission = hasExactCommission
    ? commissionAmount!
    : Math.round((total * commissionPercent) / 100);

  // ── GST: use exact backend value first, then calculate from platform rate ──
  const hasExactGst =
    typeof gstOnCommissionProp === "number" && gstOnCommissionProp >= 0;
  const gst = hasExactGst
    ? gstOnCommissionProp!
    : Math.round((commission * gstRate) / 100);

  // ── Net payable: use exact backend value first ─────────────────────────────
  const hasExactNetPayable =
    typeof netPayableProp === "number" && netPayableProp > 0;
  const netPayable = hasExactNetPayable
    ? netPayableProp!
    : total - commission + gst;

  // ── Fare display ───────────────────────────────────────────────────────────
  const actualTaxes =
    typeof taxes === "number" && taxes > 0 ? taxes : Math.round(total * 0.15);
  const actualBase =
    typeof baseFare === "number" && baseFare > 0
      ? baseFare
      : total - actualTaxes;

  const isEstimate = !hasExactCommission;
  const rateLabel = isEstimate
    ? `Your Commission (~${commissionPercent}%)`
    : "Your Commission";

  // ── Compact badge variant ──────────────────────────────────────────────────
  if (variant === "compact") {
    const netProfit = commission - gst;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40",
          className,
        )}
        title={`Customer pays ₹${total.toLocaleString("en-IN")}, you earn ₹${commission.toLocaleString("en-IN")} (₹${netProfit.toLocaleString("en-IN")} after GST)`}
      >
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
          You earn ₹{commission.toLocaleString("en-IN")}
        </span>
        {netProfit !== commission && (
          <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">
            (net ₹{netProfit.toLocaleString("en-IN")})
          </span>
        )}
      </div>
    );
  }

  // ── Full breakdown ─────────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      {/* Fare lines */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Base Fare{quantity > 1 ? ` × ${quantity}` : ""}
        </span>
        <span className="font-medium">
          ₹{actualBase.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Taxes & Fees</span>
        <span className="font-medium">
          {typeof taxes === "number" && taxes > 0
            ? `₹${actualTaxes.toLocaleString("en-IN")}`
            : `~₹${actualTaxes.toLocaleString("en-IN")}`}
        </span>
      </div>
      <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1.5">
        <span>Customer Pays</span>
        <span style={{ color: "hsl(var(--brand-orange))" }}>
          ₹{total.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Agent commission block */}
      <div className="mt-3 pt-3 border-t-2 border-dashed border-emerald-300 dark:border-emerald-700/50">
        <div className="flex justify-between">
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            {rateLabel}
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            + ₹{commission.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground text-xs">
            GST on commission ({gstRate}%)
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            − ₹{gst.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700/30 bg-emerald-50/60 dark:bg-emerald-900/20 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
          <span className="text-emerald-900 dark:text-emerald-300">
            Net Payable by You
          </span>
          <span className="text-emerald-900 dark:text-emerald-300">
            ₹{netPayable.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {!hideDisclaimer && (
        <p className="text-[10px] text-muted-foreground mt-2 italic flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            {isEstimate
              ? "Indicative commission. Final value as per your agent agreement."
              : "Commission calculated per your agent agreement."}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * AgentEarnBadge — ultra-compact badge for price corners
 * Shows just "You earn ₹X". Renders null for customers.
 */
export function AgentEarnBadge({
  totalAmount,
  commissionPercent = 5,
  commissionAmount,
  className,
}: {
  totalAmount: number;
  commissionPercent?: number;
  commissionAmount?: number;
  className?: string;
}) {
  const { role } = useAuthStore();
  if (role !== "agent") return null;

  const total = Number(totalAmount) || 0;
  if (total <= 0) return null;

  const commission =
    typeof commissionAmount === "number" && commissionAmount >= 0
      ? commissionAmount
      : Math.round((total * commissionPercent) / 100);

  if (commission <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40",
        className,
      )}
    >
      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
        You earn ₹{commission.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
