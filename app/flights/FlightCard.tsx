"use client";

import { useState } from "react";
import { Plane, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { CommissionCalculator } from "@/components/shared/CommissionCalculator";
import type { Flight } from "./types";
import { fmtINR } from "./utils";
import { STOP_LABELS } from "./constants";

// ── Flight card ─────────────────────────────────────────────
export function FlightCard({
  flight, onBook, selected,
}: {
  flight: Flight;
  onBook: (f: Flight) => void;
  selected?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const totalPax = 1; // simplified; could be passed as prop

  // Apply admin- + agent-aware markup. Sub-agents and anonymous visitors
  // fall through and just see the base fare (hook handles role gating).
  const priceFor   = useDisplayPrice("flight");
  const baseTotal  = flight.fare?.totalFare || flight.price;
  const breakdown  = priceFor(baseTotal);

  return (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-md",
      selected ? "border-primary shadow-md shadow-primary/10" : "border-border"
    )}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Airline */}
          <div className="flex items-center gap-2.5 sm:w-36 flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
              {(flight.airlineCode || flight.airline || "").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{flight.airline}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{flight.flightNo}</p>
            </div>
          </div>

          {/* Route timeline */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-center">
              <p className="text-2xl font-black">{flight.departure}</p>
              <p className="text-xs font-semibold text-muted-foreground">{flight.from}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0 px-2">
              <span className="text-[10px] text-muted-foreground font-medium">{flight.duration}</span>
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-border" />
                <Plane className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                flight.stops === 0 ? "text-emerald-500" : "text-amber-500"
              )}>
                {STOP_LABELS[flight.stops] || `${flight.stops} Stop`}
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{flight.arrival}</p>
              <p className="text-xs font-semibold text-muted-foreground">{flight.to}</p>
            </div>
          </div>

          {/* Price + book */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:w-36 flex-shrink-0">
            <div className="text-right flex-1 sm:flex-none">
              <p className="text-xl font-black">{fmtINR(breakdown.display)}</p>
              <p className="text-[10px] text-muted-foreground">per person</p>
              {breakdown.applied && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {fmtINR(breakdown.base)} <span className="text-[hsl(var(--brand-orange))] font-semibold">+ {fmtINR(breakdown.markup)} markup</span>
                </p>
              )}
            </div>
            <CommissionCalculator
              baseFare={flight.fare?.baseFare || flight.price}
              compact
              className="hidden sm:flex"
            />
            <button
              onClick={() => onBook(flight)}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              Book
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
          {flight.refundable && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> Refundable
            </span>
          )}
          {flight.seatsAvailable && flight.seatsAvailable <= 9 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
              Only {flight.seatsAvailable} left!
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            Cabin: {flight.cabinBaggage}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Check-in: {flight.checkinBaggage}
          </span>
          <CommissionCalculator
            baseFare={flight.fare?.baseFare || flight.price}
            compact
            className="sm:hidden ml-auto"
          />
          <button
            onClick={() => setShowDetails(v => !v)}
            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            {showDetails ? "Hide" : "Details"}
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-dashed border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Cabin Class", value: flight.cabinClass || "Economy" },
              { label: "Duration", value: flight.duration },
              { label: "Cabin Baggage", value: flight.cabinBaggage },
              { label: "Check-in Baggage", value: flight.checkinBaggage },
              { label: "Base Fare", value: fmtINR(flight.fare?.baseFare || 0) },
              { label: "Taxes & Fees", value: fmtINR(flight.fare?.taxes || 0) },
              { label: "Total Fare", value: fmtINR(flight.fare?.totalFare || flight.price) },
              { label: "Refundable", value: flight.refundable ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
