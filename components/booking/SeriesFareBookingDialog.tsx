"use client";

/**
 * SeriesFareBookingDialog
 * ───────────────────────
 * Modal that walks the agent through a real series-fare booking:
 *
 *   passengers → review → confirming → success
 *
 * Calls the same `/bookings/init` + `/bookings/:ref/confirm-b2b` endpoints
 * the flight booking sheet uses — backend already special-cases the
 * `TRAMPS-<fareId>` result token (it pops a PNR from the admin pool, debits
 * the wallet, and sends an e-ticket email).
 *
 * Why a separate file (and not the flight BookingSheet)?
 *   • The flight BookingSheet (`app/flights/BookingSheet.tsx`) is
 *     tightly coupled to the `Flight` type. Series fares have a
 *     slightly different shape (`SeriesFare`) and need their own form
 *     defaults (single-leg, simpler passenger form, no cabin class flow).
 *   • Keeping the two dialogs isolated lets us evolve them independently
 *     without one breaking the other.
 *
 * Concurrency safety mirrors the flight booking sheet:
 *   • bookingInProgressRef — synchronous mutex against double-clicks
 *   • idempotencyKeyRef    — stable for the entire booking session
 *   • pendingBookingRefRef — if init succeeded but confirm failed on a
 *                            blip, the retry skips init
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronLeft, Loader2, Wallet, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore, useWalletStore } from "@/lib/store";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { SeriesFareForBooking, Passenger, Contact, Step } from "./seriesFareTypes";
import { fmtINR, isIntlSector } from "./seriesFareConstants";
import { PassengersStep } from "./SeriesFarePassengersStep";
import { ReviewStep } from "./SeriesFareReviewStep";
import { SuccessStep } from "./SeriesFareSuccessStep";
import { useSeriesFareBooking } from "./useSeriesFareBooking";

// Re-export for external callers
export type { SeriesFareForBooking };

export function SeriesFareBookingDialog({
  fare,
  adults,
  travelDate,
  onClose,
}: {
  fare: SeriesFareForBooking;
  adults: number;
  travelDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { balance: walletStoreBalance, fetchBalance } = useWalletStore();

  // International sector → passport becomes mandatory on every passenger.
  const isIntl = useMemo(
    () => isIntlSector(fare.origin, fare.destination),
    [fare.origin, fare.destination],
  );

  // ── Cap passenger count to seats actually available ─────────────────
  // Without this an agent who searched for 6 adults could open the
  // dialog against a fare with only 4 seats left, fill in 6 passenger
  // forms, and discover the over-booking only at the confirm step
  // (backend reserveSeats rejects). We trim the requested count to the
  // fare's `seatsAvailable` (defaulting to 9 when missing) and warn the
  // agent immediately so they can either accept the smaller party or
  // cancel and search a different fare.
  const seatCap = Math.max(
    1,
    Number.isFinite(fare.seatsAvailable as number) && (fare.seatsAvailable as number) > 0
      ? (fare.seatsAvailable as number)
      : 9,
  );
  const cappedAdults = Math.min(Math.max(1, adults), seatCap);
  useEffect(() => {
    if (adults > seatCap) {
      toast.warning(
        `Only ${seatCap} seat(s) left on this fare — adjusted from ${adults} to ${seatCap}.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("passengers");
  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    Array.from({ length: cappedAdults }, () => ({
      firstName: "", lastName: "", gender: "M" as const, dob: "",
      passportNo: "", passportExpiry: "", nationality: "IN",
    })),
  );
  const [contact, setContact] = useState<Contact>({
    email: user?.email || "",
    phone: (user as any)?.phone || "",
  });
  const [passengerErrors, setPassengerErrors] = useState<Partial<Passenger>[]>([]);
  const [contactErrors, setContactErrors]     = useState<Partial<Contact>>({});
  const [walletBalance, setWalletBalance]     = useState<number | null>(walletStoreBalance);
  // Default to wallet — most common path. Agents can flip to Razorpay
  // when their wallet is short or they want to pay from a card directly.
  const [payMethod, setPayMethod] = useState<"wallet" | "razorpay">("wallet");

  // ── Apply admin markup to displayed total ───────────────────────────
  const priceFor = useDisplayPrice("series");
  const breakdown = priceFor(fare.fare.totalFare);
  const totalPerPax = breakdown.display;
  const totalDue    = totalPerPax * passengers.length;

  // ── Wallet balance — refresh on mount ────────────────────────────────
  useEffect(() => {
    if (walletStoreBalance !== null) setWalletBalance(walletStoreBalance);
    fetchBalance(true).then(() => {
      const bal = useWalletStore.getState().balance;
      if (bal !== null) setWalletBalance(bal);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBalance = walletBalance !== null && walletBalance >= totalDue;
  const commission = fare.agentCommission || 0;

  // ── Booking hook ─────────────────────────────────────────────────────
  const { confirmError, bookingResult, isConfirming, handleConfirm: executeConfirm } = useSeriesFareBooking(
    fare,
    passengers,
    contact,
    totalDue,
    payMethod,
  );

  // ── Validation ───────────────────────────────────────────────────────
  const validatePassengers = (): boolean => {
    let valid = true;
    const today = new Date().toISOString().split("T")[0];
    const errs = passengers.map((p) => {
      const e: Partial<Passenger> = {};
      if (!p.firstName.trim()) { e.firstName = "Required"; valid = false; }
      if (!p.lastName.trim())  { e.lastName  = "Required"; valid = false; }
      if (!p.dob)              { e.dob       = "Required"; valid = false; }
      // Passport: required only on international sectors.
      if (isIntl) {
        if (!p.passportNo?.trim()) {
          e.passportNo = "Required for international";
          valid = false;
        }
        if (!p.passportExpiry) {
          e.passportExpiry = "Required";
          valid = false;
        } else if (p.passportExpiry <= today) {
          e.passportExpiry = "Passport expired";
          valid = false;
        }
      }
      return e;
    });
    setPassengerErrors(errs);
    return valid;
  };

  const validateContact = (): boolean => {
    const e: Partial<Contact> = {};
    if (!contact.email.trim() || !contact.email.includes("@")) e.email = "Valid email required";
    if (!contact.phone.trim() || contact.phone.replace(/\D/g, "").length < 10) {
      e.phone = "10-digit phone required";
    }
    setContactErrors(e);
    return Object.keys(e).length === 0;
  };

  const goReview = () => {
    if (!validatePassengers() || !validateContact()) {
      toast.error("Please fill all passenger and contact fields");
      return;
    }
    setStep("review");
  };

  const handleConfirm = async () => {
    setStep("confirming");
    const result = await executeConfirm(hasBalance, walletBalance);
    if (result.success && result.bookingResult) {
      setStep("success");
    } else {
      setStep("review");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm animate-in fade-in"
        onClick={step === "confirming" ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="relative bg-background w-full sm:max-w-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          {step === "review" && (
            <button
              onClick={() => setStep("passengers")}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {step === "passengers" && "Step 1 of 2 — Passenger details"}
              {step === "review"     && "Step 2 of 2 — Review & confirm"}
              {step === "confirming" && "Booking your fare…"}
              {step === "success"    && "Booking confirmed"}
            </p>
            <p className="text-sm font-bold text-foreground">
              {fare.airline} {fare.flightNo || fare.flightNumber || ""} · {fare.origin} → {fare.destination}
            </p>
          </div>
          {step !== "confirming" && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "passengers" && (
            <PassengersStep
              passengers={passengers}
              setPassengers={setPassengers}
              passengerErrors={passengerErrors}
              contact={contact}
              setContact={setContact}
              contactErrors={contactErrors}
              isIntl={isIntl}
            />
          )}

          {step === "review" && (
            <ReviewStep
              fare={fare}
              passengers={passengers}
              contact={contact}
              travelDate={travelDate}
              perPax={totalPerPax}
              total={totalDue}
              walletBalance={walletBalance}
              hasBalance={hasBalance}
              commission={commission}
              error={confirmError}
              breakdownApplied={breakdown.applied}
              breakdownBase={breakdown.base}
              breakdownMarkup={breakdown.markup}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
            />
          )}

          {step === "confirming" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold">Confirming your booking…</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Don&apos;t refresh or close this window. We&apos;re debiting your wallet and reserving your seat.
              </p>
            </div>
          )}

          {step === "success" && bookingResult && (
            <SuccessStep
              fare={fare}
              passengers={passengers}
              total={totalDue}
              bookingRef={bookingResult.bookingRef}
              pnr={bookingResult.pnr}
              onViewBookings={() => {
                onClose();
                router.push("/bookings");
              }}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer / actions */}
        {step === "passengers" && (
          <div className="border-t border-border p-4 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-muted-foreground">
              {passengers.length} passenger{passengers.length === 1 ? "" : "s"} ·{" "}
              <strong className="text-foreground">{fmtINR(totalDue)}</strong> total
            </div>
            <button
              onClick={goReview}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        )}

        {step === "review" && (
          <div className="border-t border-border p-4 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs">
              <p className="text-muted-foreground">
                {payMethod === "wallet" ? "Wallet" : "Pay via"}
              </p>
              <p className={cn(
                "font-bold",
                payMethod === "wallet"
                  ? (hasBalance ? "text-emerald-600" : "text-rose-600")
                  : "text-primary",
              )}>
                {payMethod === "wallet"
                  ? (walletBalance === null ? "Loading…" : fmtINR(walletBalance))
                  : "Razorpay"}
              </p>
            </div>
            {payMethod === "wallet" ? (
              <button
                onClick={handleConfirm}
                disabled={!hasBalance}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity",
                  hasBalance
                    ? "bg-[hsl(var(--brand-orange))] text-white hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Wallet className="h-4 w-4" />
                {hasBalance ? `Pay ${fmtINR(totalDue)} from Wallet` : "Insufficient balance"}
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity bg-[hsl(var(--brand-orange))] text-white hover:opacity-90"
              >
                <CreditCard className="h-4 w-4" />
                Pay {fmtINR(totalDue)} via Razorpay
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

