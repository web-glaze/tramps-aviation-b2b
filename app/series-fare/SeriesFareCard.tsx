"use client";

import { useState } from "react";
import {
  Plane,
  Luggage,
  ChevronDown,
  ChevronUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { SeriesFare } from "./types";
import { fmtINR } from "./utils";
import { AIRLINE_BG } from "./constants";

// ─── Airline initial badge — coloured square w/ 2-letter code ─────────────────
function AirlineBadge({ name, code }: { name: string; code?: string }) {
  const initials = (code || name || "").slice(0, 2).toUpperCase();
  const bg = AIRLINE_BG[name] || "bg-primary";
  return (
    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0", bg)}>
      {initials}
    </div>
  );
}

// Tiny row helper for the fare breakdown / policies columns
function Row({
  label, value, bold, valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-bold")}>
        {label}
      </span>
      <span className={cn("tabular-nums", bold && "font-bold text-base", valueClass)}>
        {value}
      </span>
    </div>
  );
}

// ─── Fare Card ────────────────────────────────────────────────────────────────
export function SeriesFareCard({
  fare,
  onBook,
}: {
  fare: SeriesFare;
  onBook: (f: SeriesFare) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const commission = fare.agentCommission || 0;
  const hasCommission = commission > 0;

  // Apply per-product markup. For RoundTrip we mark up the combined leg price,
  // otherwise the single-leg total. The hook handles role + admin gating, so
  // sub-agents and anonymous visitors fall through with `applied: false`.
  const priceFor = useDisplayPrice("series");
  const baseTop  = fare.combinedPrice ?? fare.fare.totalFare;
  const breakdown = priceFor(baseTop);

  // Net payable = total minus commission earned (commission credits agent's wallet later)
  const customerPays = breakdown.display;
  const gstOnComm    = Math.round((commission * 18) / 100); // assume 18% GST on commission
  const netPayable   = customerPays - commission + gstOnComm;
  const isRefundable = fare.refundable === true;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Top badge strip — exclusive label on left, refund pill on right */}
      <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary/5 to-violet-500/5 border-b border-border">
        <span className="text-xs font-bold text-primary tracking-wide uppercase">
          Tramps Aviation Exclusive · Series Fare
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border",
            isRefundable
              ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400"
              : "text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400",
          )}
        >
          {isRefundable ? "Refundable" : "Non-Refundable"}
        </span>
      </div>

      <div className="p-5">
        {/* Outbound leg */}
        <div className="flex items-center gap-4">
          {/* Airline tile */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <AirlineBadge name={fare.airline} code={fare.airlineCode} />
            <span className="text-[10px] font-mono text-muted-foreground">{fare.flightNo}</span>
          </div>

          {/* Departure time + origin */}
          <div className="text-center flex-shrink-0">
            <p className="text-2xl font-black text-foreground">{fare.departure}</p>
            <p className="text-xs font-bold text-muted-foreground">{fare.origin}</p>
          </div>

          {/* Route timeline */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">{fare.duration || "—"}</p>
            <div className="flex items-center gap-1 w-full">
              <div className="h-px flex-1 bg-border" />
              <Plane className="h-3 w-3 text-primary" />
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className={cn(
              "text-[11px] font-semibold",
              fare.stops === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600",
            )}>
              {fare.stops === 0 ? "Non-stop" : `${fare.stops} stop${fare.stops > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Arrival time + destination */}
          <div className="text-center flex-shrink-0">
            <p className="text-2xl font-black text-foreground">{fare.arrival}</p>
            <p className="text-xs font-bold text-muted-foreground">{fare.destination}</p>
          </div>

          {/* Price block — orange brand accent + Book Now CTA */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[120px]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">per person</p>
            <p className="text-2xl font-black text-[hsl(var(--brand-orange))] tabular-nums leading-none">
              {fmtINR(breakdown.display)}
            </p>
            {breakdown.applied && (
              <p className="text-[10px] text-muted-foreground">
                base {fmtINR(breakdown.base)}
              </p>
            )}
            {fare.seatsLeft !== undefined && (
              <p className={cn(
                "text-[10px] font-semibold",
                fare.seatsLeft <= 5 ? "text-rose-600" : "text-emerald-600",
              )}>
                {fare.seatsLeft} seat{fare.seatsLeft === 1 ? "" : "s"} available
              </p>
            )}
            <button
              onClick={() => onBook(fare)}
              className="mt-1 px-4 py-2 rounded-xl bg-[hsl(var(--brand-orange))] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5" />
              Book Now
            </button>
          </div>
        </div>

        {/* Return leg (only for RoundTrip) */}
        {fare.tripType === "RoundTrip" && fare.returnFlight && (
          <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Plane className="h-5 w-5 text-violet-500 rotate-180" />
            </div>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="text-center shrink-0">
                <p className="text-lg font-bold">{fare.returnFlight.departure || "—"}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {fare.destination}
                </p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {fare.returnFlight.duration || "—"}
                </p>
                <div className="flex items-center gap-1 w-full">
                  <div className="h-px flex-1 bg-border" />
                  <Plane className="h-3 w-3 text-violet-500 rotate-180" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {fare.returnFlight.stops === 0
                    ? "Non-stop"
                    : `${fare.returnFlight.stops || 0} stop${(fare.returnFlight.stops || 0) > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold">{fare.returnFlight.arrival || "—"}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {fare.origin}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 text-xs text-muted-foreground">
              {fare.returnFlight.airline || ""}
              {fare.returnFlight.flightNo ? ` · ${fare.returnFlight.flightNo}` : ""}
            </div>
          </div>
        )}
        {fare.tripType === "RoundTrip" && !fare.returnFlight && (
          <div className="mt-3 pt-3 border-t border-dashed border-border text-xs text-amber-600">
            Return flight not yet available for the selected return date — outbound only shown.
          </div>
        )}

        {/* Quick info chips row */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
            {fare.checkinBaggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage className="h-3 w-3" />
                {fare.checkinBaggage} check-in
              </span>
            )}
            {fare.cabinBaggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage className="h-3 w-3" />
                {fare.cabinBaggage} cabin
              </span>
            )}
            {fare.cabinClass && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] font-bold uppercase">
                {fare.cabinClass.toLowerCase().replace("_", " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{fare.airline}</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              {expanded ? (
                <>Hide <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Details <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Expandable: FARE BREAKDOWN + POLICIES side-by-side */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fare breakdown */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Fare Breakdown
              </p>
              <Row label="Base Fare" value={fmtINR(fare.fare.baseFare)} />
              <Row label="Taxes & Fees" value={fmtINR(fare.fare.taxes)} />
              {breakdown.applied && (
                <Row
                  label="Admin markup"
                  value={`+ ${fmtINR(breakdown.markup)}`}
                  valueClass="text-[hsl(var(--brand-orange))] font-semibold"
                />
              )}
              <div className="border-t border-dashed border-border pt-2">
                <Row
                  label="Customer Pays"
                  value={fmtINR(customerPays)}
                  bold
                  valueClass="text-[hsl(var(--brand-orange))]"
                />
              </div>
              {hasCommission && (
                <>
                  <Row
                    label="Your Commission"
                    value={`+ ${fmtINR(commission)}`}
                    valueClass="text-emerald-600 font-semibold"
                  />
                  <Row
                    label="GST on commission (18%)"
                    value={`− ${fmtINR(gstOnComm)}`}
                    valueClass="text-rose-600"
                  />
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-1">
                    <Row
                      label="Net Payable by You"
                      value={fmtINR(netPayable)}
                      bold
                      valueClass="text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Policies */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Policies
              </p>
              <Row
                label="Cancellation"
                value={isRefundable ? "Allowed" : "Not allowed"}
                valueClass={isRefundable ? "text-emerald-600" : "text-rose-600"}
              />
              <Row
                label="Date Change"
                value={isRefundable ? "Allowed" : "Not allowed"}
                valueClass={isRefundable ? "text-emerald-600" : "text-rose-600"}
              />
              <Row
                label="Baggage"
                value={`${fare.checkinBaggage || "15KG"} + ${fare.cabinBaggage || "7KG"} cabin`}
              />
              {fare.seatsLeft !== undefined && (
                <Row
                  label="Seats Left"
                  value={`${fare.seatsLeft} seat${fare.seatsLeft === 1 ? "" : "s"}`}
                  valueClass={fare.seatsLeft <= 5 ? "text-rose-600 font-semibold" : "text-foreground"}
                />
              )}
              {fare.validTill && (
                <Row
                  label="Valid till"
                  value={new Date(fare.validTill).toLocaleDateString("en-IN")}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function FareSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted rounded-2xl h-36" />
      ))}
    </div>
  );
}
