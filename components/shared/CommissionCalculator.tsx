"use client";

import { useMemo } from "react";
import { TrendingUp, IndianRupee, BadgePercent, Receipt } from "lucide-react";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CommissionCalculatorProps {
  /** Base fare from the supplier (no markup) */
  baseFare: number;
  /** Optional override for agent commission % (uses platform default otherwise) */
  commissionPercent?: number;
  /** Optional override for agent markup amount added on top */
  markupAmount?: number;
  /** Optional GST % override */
  gstPercent?: number;
  /** Compact inline mode — single row summary */
  compact?: boolean;
  className?: string;
}

interface Breakdown {
  baseFare: number;
  agentMarkup: number;
  clientFare: number;
  agentCommission: number;
  platformCommission: number;
  gstOnCommission: number;
  netEarning: number;
}

function calculate(
  baseFare: number,
  commissionPct: number,
  markupAmt: number,
  gstPct: number,
): Breakdown {
  const agentMarkup = Math.round(markupAmt);
  const clientFare = baseFare + agentMarkup;
  const agentCommission = Math.round((baseFare * commissionPct) / 100);
  const platformCommission = 0; // platform takes their cut server-side
  const gstOnCommission = Math.round((agentCommission * gstPct) / 100);
  const netEarning = agentMarkup + agentCommission - gstOnCommission;
  return {
    baseFare,
    agentMarkup,
    clientFare,
    agentCommission,
    platformCommission,
    gstOnCommission,
    netEarning,
  };
}

const fmt = (n: number) =>
  `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * CommissionCalculator
 * ─────────────────────
 * Shows the agent exactly what they'll earn on a booking before confirming.
 *
 * Usage (next to book button in flight listing):
 *   <CommissionCalculator baseFare={flight.fare.totalFare} />
 *
 * Reads platform commission % + GST % from Zustand PlatformStore (already
 * cached from /admin/public-settings).
 */
export function CommissionCalculator({
  baseFare,
  commissionPercent,
  markupAmount = 0,
  gstPercent,
  compact = false,
  className,
}: CommissionCalculatorProps) {
  const { ps } = usePlatformStore();

  const commissionPct =
    commissionPercent ?? ps.flightMarkupPercent ?? 2; // default 2 %
  const gstPct = gstPercent ?? ps.gstPercent ?? 18;

  const bd = useMemo(
    () => calculate(baseFare, commissionPct, markupAmount, gstPct),
    [baseFare, commissionPct, markupAmount, gstPct],
  );

  if (!baseFare || baseFare <= 0) return null;

  // ── Compact one-liner (for flight cards) ─────────────────────────────────
  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20",
          className,
        )}
      >
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          You earn{" "}
          <span className="font-bold">{fmt(bd.netEarning)}</span>
        </span>
      </div>
    );
  }

  // ── Full breakdown panel ──────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-500/25 bg-emerald-500/5 overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/10">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
          Your Earnings on this Booking
        </span>
      </div>

      {/* Line items */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <Row
          label="Base Fare (supplier price)"
          value={fmt(bd.baseFare)}
          icon={IndianRupee}
          muted
        />
        {bd.agentMarkup > 0 && (
          <Row
            label="Your Markup Added"
            value={`+${fmt(bd.agentMarkup)}`}
            icon={BadgePercent}
            positive
          />
        )}
        <Row
          label={`Client Pays`}
          value={fmt(bd.clientFare)}
          icon={Receipt}
          bold
        />

        <div className="border-t border-emerald-500/20 my-1" />

        <Row
          label={`Commission (${commissionPct}% on base fare)`}
          value={`+${fmt(bd.agentCommission)}`}
          positive
        />
        {bd.gstOnCommission > 0 && (
          <Row
            label={`GST on Commission (${gstPct}%)`}
            value={`-${fmt(bd.gstOnCommission)}`}
            negative
          />
        )}
      </div>

      {/* Net earning highlight */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
          Net Earning (Markup + Commission)
        </span>
        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
          {fmt(bd.netEarning)}
        </span>
      </div>
    </div>
  );
}

// ── Internal row component ─────────────────────────────────────────────────
function Row({
  label,
  value,
  icon: Icon,
  muted,
  positive,
  negative,
  bold,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  muted?: boolean;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0",
              muted
                ? "text-muted-foreground"
                : positive
                  ? "text-emerald-500"
                  : "text-foreground",
            )}
          />
        )}
        <span
          className={cn(
            "text-xs truncate",
            muted ? "text-muted-foreground" : "text-foreground",
            bold && "font-semibold",
          )}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-semibold whitespace-nowrap flex-shrink-0",
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : negative
              ? "text-red-500"
              : bold
                ? "text-foreground font-bold"
                : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

