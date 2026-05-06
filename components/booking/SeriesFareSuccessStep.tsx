"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeriesFareForBooking, Passenger } from "./seriesFareTypes";
import { fmtINR } from "./seriesFareConstants";

export function SuccessStep({
  fare, passengers, total, bookingRef, pnr,
  onViewBookings, onClose,
}: {
  fare: SeriesFareForBooking;
  passengers: Passenger[];
  total: number;
  bookingRef: string;
  pnr: string;
  onViewBookings: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-bold">Booking confirmed!</p>
          <p className="text-xs text-muted-foreground">E-ticket sent to your contact email.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <Row label="Booking reference" value={bookingRef} bold />
        <Row label="PNR" value={pnr} bold valueClass="text-primary" />
        <Row label="Flight" value={`${fare.airline} ${fare.flightNo || fare.flightNumber || ""}`} />
        <Row label="Route" value={`${fare.origin} → ${fare.destination}`} />
        <Row label="Passengers" value={String(passengers.length)} />
        <Row label="Amount paid" value={fmtINR(total)} bold valueClass="text-[hsl(var(--brand-orange))]" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
        >
          Close
        </button>
        <button
          onClick={onViewBookings}
          className="flex-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
        >
          View My Bookings
        </button>
      </div>
    </div>
  );
}

function Row({
  label, value, bold, valueClass,
}: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground text-sm", bold && "text-foreground font-bold")}>
        {label}
      </span>
      <span className={cn("tabular-nums text-sm", bold && "font-bold", valueClass)}>
        {value}
      </span>
    </div>
  );
}
