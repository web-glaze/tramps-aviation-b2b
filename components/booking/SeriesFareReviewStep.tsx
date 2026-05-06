"use client";

import { AlertTriangle, BadgeCheck, CreditCard, Mail, PhoneIcon, Sparkles, User as UserIcon, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeriesFareForBooking, Passenger, Contact } from "./seriesFareTypes";
import { fmtINR } from "./seriesFareConstants";

export function ReviewStep({
  fare, passengers, contact, travelDate,
  perPax, total, walletBalance, hasBalance, commission, error,
  breakdownApplied, breakdownBase, breakdownMarkup,
  payMethod, setPayMethod,
}: {
  fare: SeriesFareForBooking;
  passengers: Passenger[];
  contact: Contact;
  travelDate: string;
  perPax: number;
  total: number;
  walletBalance: number | null;
  hasBalance: boolean;
  commission: number;
  error: string | null;
  breakdownApplied: boolean;
  breakdownBase: number;
  breakdownMarkup: number;
  payMethod: "wallet" | "razorpay";
  setPayMethod: (m: "wallet" | "razorpay") => void;
}) {
  return (
    <div className="space-y-4">
      {/* Itinerary */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold tracking-wider uppercase text-primary">
            Tramps Aviation Exclusive · Series Fare
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
            {(fare.airlineCode || fare.airline).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{fare.airline} · {fare.flightNo || fare.flightNumber || ""}</p>
            <p className="text-xs text-muted-foreground">{travelDate}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">{(fare.departure || fare.departureTime || "")} → {(fare.arrival || fare.arrivalTime || "")}</p>
            <p className="text-xs text-muted-foreground">{fare.origin} → {fare.destination}</p>
          </div>
        </div>
      </div>

      {/* Passengers summary */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Passengers
        </p>
        <ul className="space-y-2">
          {passengers.map((p, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold">{p.firstName} {p.lastName}</span>
                <span className="text-muted-foreground">· {p.gender === "M" ? "Male" : "Female"} · {p.dob}</span>
              </div>
              {/* Show passport line only when actually filled — avoids
                  cluttering the review for domestic-only bookings. */}
              {p.passportNo && (
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground pl-5">
                  <BadgeCheck className="h-3 w-3" />
                  Passport <span className="font-mono">{p.passportNo}</span>
                  {p.passportExpiry && <>· exp {p.passportExpiry}</>}
                  {p.nationality && <>· {p.nationality}</>}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>
          <span className="inline-flex items-center gap-1"><PhoneIcon className="h-3 w-3" />+91 {contact.phone}</span>
        </div>
      </div>

      {/* Fare breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Fare Breakdown
        </p>
        <Row label={`Base fare × ${passengers.length}`} value={fmtINR(fare.fare.baseFare * passengers.length)} />
        <Row label="Taxes & fees"                       value={fmtINR(fare.fare.taxes * passengers.length)} />
        {breakdownApplied && (
          <Row
            label="Admin markup"
            value={`+ ${fmtINR(breakdownMarkup * passengers.length)}`}
            valueClass="text-[hsl(var(--brand-orange))] font-semibold"
          />
        )}
        <div className="border-t border-dashed border-border pt-2">
          <Row label="Total payable" value={fmtINR(total)} bold valueClass="text-[hsl(var(--brand-orange))] text-lg" />
        </div>
        {commission > 0 && (
          <Row label="Your commission" value={`+ ${fmtINR(commission * passengers.length)}`} valueClass="text-emerald-600 font-semibold" />
        )}
      </div>

      {/* Payment method selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Payment method
        </p>

        {/* Wallet option */}
        <button
          type="button"
          onClick={() => setPayMethod("wallet")}
          className={cn(
            "w-full rounded-2xl p-4 border-2 flex items-center gap-3 transition-all text-left",
            payMethod === "wallet"
              ? hasBalance
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-rose-500/40 bg-rose-500/5"
              : "border-border hover:border-primary/40 bg-card",
          )}
        >
          <span className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
            hasBalance ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
          )}>
            <Wallet className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold flex items-center gap-2">
              Pay from Wallet
              {payMethod === "wallet" && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Balance:&nbsp;
              <span className={cn("font-semibold", hasBalance ? "text-emerald-600" : "text-rose-600")}>
                {walletBalance === null ? "Loading…" : fmtINR(walletBalance)}
              </span>
              {!hasBalance && walletBalance !== null && (
                <span className="text-rose-600">&nbsp;· Need {fmtINR(total - walletBalance)} more</span>
              )}
            </p>
          </div>
          <span className={cn(
            "h-5 w-5 rounded-full border-2 flex-shrink-0",
            payMethod === "wallet" ? "border-primary bg-primary" : "border-border",
          )}>
            {payMethod === "wallet" && (
              <span className="block h-full w-full rounded-full bg-primary-foreground scale-50" />
            )}
          </span>
        </button>

        {/* Razorpay option */}
        <button
          type="button"
          onClick={() => setPayMethod("razorpay")}
          className={cn(
            "w-full rounded-2xl p-4 border-2 flex items-center gap-3 transition-all text-left",
            payMethod === "razorpay"
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/40 bg-card",
          )}
        >
          <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold flex items-center gap-2">
              Pay via Razorpay
              {payMethod === "razorpay" && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Cards · UPI · Net banking · Wallets · EMI
            </p>
          </div>
          <span className={cn(
            "h-5 w-5 rounded-full border-2 flex-shrink-0",
            payMethod === "razorpay" ? "border-primary bg-primary" : "border-border",
          )}>
            {payMethod === "razorpay" && (
              <span className="block h-full w-full rounded-full bg-primary-foreground scale-50" />
            )}
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl p-3 border border-rose-500/30 bg-rose-500/5 flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-rose-600">{error}</p>
        </div>
      )}
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
