"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X, ChevronLeft, Plane, ArrowRight, Loader2, AlertTriangle, Info, Wallet,
  CheckCircle2, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agentApi, unwrap } from "@/lib/api/services";
import { useAuthStore, usePlatformStore, useWalletStore } from "@/lib/store";
import { getErrorMessage, isNetworkError } from "@/lib/utils/errors";
import { CommissionCalculator } from "@/components/shared/CommissionCalculator";
import type { Flight, SearchParams, Passenger, ContactInfo, BookStep, PassengerType } from "./types";
import { POPULAR_AIRPORTS, STOP_LABELS } from "./constants";
import { fmtINR, fmtDate, generateIdempotencyKey, inputCls } from "./utils";
import { Field } from "./Field";
import { PassengerForm } from "./PassengerForm";

// ══════════════════════════════════════════════════════════
// BOOKING SHEET / MODAL
// ══════════════════════════════════════════════════════════

export function BookingSheet({
  flight, searchParams, onClose,
}: {
  flight: Flight;
  searchParams: SearchParams;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const { ps } = usePlatformStore();
  const { balance: walletStoreBalance, fetchBalance, deductOptimistic } = useWalletStore();
  const router = useRouter();
  const totalPax = searchParams.adults + searchParams.children + searchParams.infants;

  // ── State ─────────────────────────────────────────────────
  const [step, setStep] = useState<BookStep>("passengers");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ── Concurrency safety refs ────────────────────────────────
  // bookingInProgress: blocks double-clicks even before React re-renders
  const bookingInProgressRef = useRef(false);
  // pendingBookingRef: stores the bookingRef from Step 1 so if Step 2 fails
  // on a network blip, the retry skips Step 1 (no duplicate init)
  const pendingBookingRefRef = useRef<string | null>(null);
  // idempotencyKeyRef: stable key for the entire booking session —
  // NOT regenerated on retry so the backend deduplicates if Step 1 replays
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Passengers
  const makeEmptyPassenger = (type: PassengerType): Passenger => ({
    type, firstName: "", lastName: "", gender: "M", dob: "", passportNo: "", passportExpiry: "",
  });

  const [passengers, setPassengers] = useState<Passenger[]>([
    ...Array(searchParams.adults).fill(null).map(() => makeEmptyPassenger("ADT")),
    ...Array(searchParams.children).fill(null).map(() => makeEmptyPassenger("CHD")),
    ...Array(searchParams.infants).fill(null).map(() => makeEmptyPassenger("INF")),
  ]);
  const [passengerErrors, setPassengerErrors] = useState<
    Array<Partial<Record<keyof Passenger, string>>>
  >(Array(totalPax).fill({}));

  const [contact, setContact] = useState<ContactInfo>({
    email: user?.email || "",
    phone: user?.phone || "",
    altPhone: "",
  });
  const [contactErrors, setContactErrors] = useState<Partial<ContactInfo>>({});

  // International flight detection
  const INDIA_CODES = new Set(POPULAR_AIRPORTS.filter(a => a.country === "India").map(a => a.code));
  const isIntl = !INDIA_CODES.has(flight.from.toUpperCase()) || !INDIA_CODES.has(flight.to.toUpperCase());

  // ── Fetch wallet balance (use shared store + local copy) ──
  useEffect(() => {
    // If store already has a fresh balance, use it immediately
    if (walletStoreBalance !== null) {
      setWalletBalance(walletStoreBalance);
    }
    // Always force-refresh so we get the very latest balance
    fetchBalance(true).then(() => {
      const bal = useWalletStore.getState().balance;
      if (bal !== null) setWalletBalance(bal);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation ───────────────────────────────────────────
  const validatePassengers = (): boolean => {
    let valid = true;
    const errs = passengers.map(p => {
      const e: Partial<Record<keyof Passenger, string>> = {};
      if (!p.firstName.trim()) { e.firstName = "Required"; valid = false; }
      if (!p.lastName.trim()) { e.lastName = "Required"; valid = false; }
      if (!p.dob) { e.dob = "Required"; valid = false; }
      if (isIntl) {
        if (!p.passportNo?.trim()) { e.passportNo = "Required for international"; valid = false; }
        if (!p.passportExpiry) { e.passportExpiry = "Required"; valid = false; }
      }
      return e;
    });
    setPassengerErrors(errs);

    const ce: Partial<ContactInfo> = {};
    if (!contact.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      ce.email = "Enter a valid email"; valid = false;
    }
    if (!contact.phone.match(/^[6-9]\d{9}$/)) {
      ce.phone = "Enter valid 10-digit mobile"; valid = false;
    }
    setContactErrors(ce);

    if (!valid) toast.error("Please fill all required fields correctly");
    return valid;
  };

  // ── Proceed to review ────────────────────────────────────
  const handleNextToReview = () => {
    if (validatePassengers()) setStep("review");
  };

  // ── Confirm booking (with full concurrency protection) ──
  //
  // Safety layers:
  //   1. bookingInProgressRef  — synchronous mutex blocks double-clicks
  //      before React re-renders; released on success OR unrecoverable error
  //   2. idempotencyKeyRef     — stable per booking-session key; NOT
  //      regenerated on network retry so backend deduplicates replays
  //   3. pendingBookingRefRef  — if Step 1 succeeded but Step 2 failed on a
  //      blip, retry jumps straight to Step 2 with the same bookingRef
  //   4. seatsLeft guard       — warns when fewer than 2 seats are left
  //      before committing wallet
  const handleConfirm = async () => {
    // ── Mutex: block concurrent calls ────────────────────────
    if (bookingInProgressRef.current) {
      toast.warning("Booking already in progress — please wait");
      return;
    }
    bookingInProgressRef.current = true;

    setStep("confirming");
    setConfirmError(null);

    // ── Stable idempotency key (use existing key on retry) ───
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      let bookingRef = pendingBookingRefRef.current;

      // ── Step 1: Init booking (skip if we already have a ref from a prior attempt) ──
      if (!bookingRef) {
        const initPayload = {
          resultToken: flight.resultToken || flight.id || flight.flightKey,
          flightKey: flight.flightKey || flight.resultToken || flight.id,
          passengers: passengers.map(p => ({
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim(),
            gender: p.gender,
            dateOfBirth: p.dob,
            passengerType: p.type,
            passportNumber: p.passportNo || undefined,
            passportExpiry: p.passportExpiry || undefined,
            nationality: p.nationality || "IN",
          })),
          contactEmail: contact.email.trim(),
          contactPhone: contact.phone.trim(),
          cabinClass: flight.cabinClass || searchParams.cabinClass,
          tripType: searchParams.tripType,
          fare: flight.fare,
          // Backend reads `idempotencyKey` from the body (see bookings.service.ts initBooking).
          // We also forward as header below for any middleware that prefers it.
          idempotencyKey,
          expectedPricePerPax: flight.fare?.totalFare || flight.price,
        };

        const initRes = await agentApi.initBooking(initPayload, idempotencyKey);
        const initData = unwrap(initRes) as any;
        bookingRef = initData?.bookingRef || initData?.booking?.bookingRef || initData?.id;

        if (!bookingRef) throw new Error("Failed to create booking reference. Please try again.");

        // Persist so a Step 2 network failure can skip Step 1 on retry
        pendingBookingRefRef.current = bookingRef;
      }

      // ── Step 2: Confirm (wallet deduction — idempotent on backend) ──
      const confirmRes = await agentApi.confirmB2bBooking(bookingRef);
      const confirmData = unwrap(confirmRes) as any;

      // ── Success: clear all transient state ───────────────────
      pendingBookingRefRef.current = null;
      // Rotate idempotency key so next booking gets a fresh one
      idempotencyKeyRef.current = generateIdempotencyKey();

      // Refresh wallet balance in background
      fetchBalance(true).catch(() => {});

      setBookingResult({
        bookingRef,
        pnr: confirmData?.pnr || confirmData?.booking?.pnr || "Processing",
        status: confirmData?.status || "CONFIRMED",
        totalAmount: flight.fare?.totalFare || flight.price,
        airline: flight.airline,
        flightNo: flight.flightNo,
        from: flight.from,
        to: flight.to,
        departure: flight.departure,
        arrival: flight.arrival,
        date: searchParams.departureDate,
      });
      setStep("success");

    } catch (err) {
      const msg = getErrorMessage(err);
      const isNetwork = isNetworkError(err);
      const status = (err as any)?.response?.status;

      // ── 409 Conflict = already booked (duplicate) ────────────
      if (status === 409) {
        // This booking was already confirmed — treat as success
        const existingRef = (err as any)?.response?.data?.bookingRef
          || pendingBookingRefRef.current
          || "Duplicate";
        pendingBookingRefRef.current = null;
        idempotencyKeyRef.current = generateIdempotencyKey();
        setBookingResult({
          bookingRef: existingRef,
          pnr: (err as any)?.response?.data?.pnr || "Processing",
          status: "CONFIRMED",
          totalAmount: flight.fare?.totalFare || flight.price,
          airline: flight.airline,
          flightNo: flight.flightNo,
          from: flight.from,
          to: flight.to,
          departure: flight.departure,
          arrival: flight.arrival,
          date: searchParams.departureDate,
        });
        setStep("success");
        toast.info("Booking was already confirmed");
        return; // mutex released in finally
      }

      // ── 402 / 400 insufficient balance — do NOT retain pendingRef ─
      if (status === 402 || msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("insufficient")) {
        pendingBookingRefRef.current = null;
        idempotencyKeyRef.current = generateIdempotencyKey();
      }
      // For network errors keep pendingBookingRefRef so the retry
      // can jump straight to Step 2 with the same bookingRef

      setConfirmError(
        isNetwork
          ? "Network error — please check your connection and try again."
          : msg
      );
      setStep("review");
      toast.error(isNetwork ? "No internet connection" : msg);
    } finally {
      // Always release the mutex so the user can retry
      bookingInProgressRef.current = false;
    }
  };

  // ── Fare + commission summary ────────────────────────────
  const totalFare = (flight.fare?.totalFare || flight.price) * totalPax;
  const baseFare = (flight.fare?.baseFare || flight.price) * totalPax;
  const hasBalance = walletBalance !== null && walletBalance >= totalFare;

  // ── Render ───────────────────────────────────────────────
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card flex-shrink-0">
          {step !== "success" && step !== "confirming" && (
            <button
              onClick={step === "passengers" ? onClose : () => setStep("passengers")}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 px-2">
            <h3 className="font-bold text-foreground">
              {step === "passengers" && "Passenger Details"}
              {step === "review" && "Review Booking"}
              {step === "confirming" && "Confirming…"}
              {step === "success" && "Booking Confirmed!"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {flight.airline} · {flight.flightNo} · {flight.from} → {flight.to}
            </p>
          </div>
          {step !== "confirming" && (
            <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        {(step === "passengers" || step === "review") && (
          <div className="flex px-5 py-3 gap-2 bg-muted/30 flex-shrink-0">
            {(["passengers", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  step === s || (s === "passengers" && step === "review")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium capitalize",
                  step === s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === "passengers" ? "Passengers" : "Review & Pay"}
                </span>
                {i < 1 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Passengers ─────────────────────────── */}
          {step === "passengers" && (
            <div className="p-5 space-y-4">
              {/* Flight summary strip */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <Plane className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-bold">{flight.from}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <span className="font-bold">{flight.to}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span>{fmtDate(searchParams.departureDate)}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span>{totalPax} Pax</span>
                </div>
                <span className="font-black text-primary">{fmtINR(totalFare)}</span>
              </div>

              {/* Passenger forms */}
              {passengers.map((pax, i) => (
                <PassengerForm
                  key={i}
                  index={i}
                  passenger={pax}
                  type={pax.type}
                  isIntl={isIntl}
                  errors={passengerErrors[i] || {}}
                  onChange={partial => {
                    setPassengers(prev => prev.map((p, j) => j === i ? { ...p, ...partial } : p));
                    setPassengerErrors(prev => prev.map((e, j) => j === i ? {} : e));
                  }}
                />
              ))}

              {/* Contact details */}
              <div className="bg-muted/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">Contact Information</p>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Booking confirmation will be sent to this email
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Email Address" required error={contactErrors.email}>
                    <input type="email" placeholder="agent@agency.com"
                      value={contact.email}
                      onChange={e => { setContact(c => ({ ...c, email: e.target.value })); setContactErrors(e2 => ({ ...e2, email: undefined })); }}
                      className={inputCls(!!contactErrors.email)} />
                  </Field>
                  <Field label="Mobile Number" required error={contactErrors.phone}>
                    <input type="tel" placeholder="10-digit mobile"
                      value={contact.phone}
                      onChange={e => { setContact(c => ({ ...c, phone: e.target.value })); setContactErrors(e2 => ({ ...e2, phone: undefined })); }}
                      className={inputCls(!!contactErrors.phone)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ─────────────────────────────── */}
          {step === "review" && (
            <div className="p-5 space-y-4">
              {/* Confirm error */}
              {confirmError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{confirmError}</p>
                </div>
              )}

              {/* Flight summary */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="bg-gradient-to-r from-primary/80 to-primary px-4 py-3 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-white" />
                  <span className="font-bold text-white text-sm">{flight.airline} · {flight.flightNo}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-black">{flight.departure}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{flight.from}</p>
                  </div>
                  <div className="text-center flex-1 px-4">
                    <p className="text-xs text-muted-foreground mb-1">{flight.duration}</p>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-px bg-border" />
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {fmtDate(searchParams.departureDate)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black">{flight.arrival}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{flight.to}</p>
                  </div>
                </div>
              </div>

              {/* Passengers summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Passengers ({totalPax})
                </p>
                {passengers.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {p.firstName[0] || i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.type === "ADT" ? "Adult" : p.type === "CHD" ? "Child" : "Infant"} · {p.gender === "M" ? "Male" : "Female"} · DOB: {p.dob || "—"}
                      </p>
                    </div>
                    <button onClick={() => setStep("passengers")}
                      className="text-[10px] text-primary hover:underline">Edit</button>
                  </div>
                ))}
              </div>

              {/* Commission breakdown */}
              <CommissionCalculator
                baseFare={baseFare}
                className="w-full"
              />

              {/* Fare summary */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Fare Summary
                  </p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { label: `Base Fare × ${totalPax}`, value: fmtINR(baseFare) },
                    { label: "Taxes & Fees", value: fmtINR((flight.fare?.taxes || 0) * totalPax) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dashed border-border flex justify-between">
                    <span className="font-bold">Total Amount</span>
                    <span className="font-black text-lg">{fmtINR(totalFare)}</span>
                  </div>
                </div>
              </div>

              {/* Low seats warning */}
              {flight.seatsAvailable !== undefined && flight.seatsAvailable <= 5 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-600">
                    Only {flight.seatsAvailable} seat{flight.seatsAvailable > 1 ? "s" : ""} left at this price — confirm quickly before someone else grabs it!
                  </p>
                </div>
              )}

              {/* Retry notice (when pendingBookingRef exists — Step 1 already done) */}
              {pendingBookingRefRef.current && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <Info className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary">
                    Booking reference already created — retrying payment step only (no duplicate charge).
                  </p>
                </div>
              )}

              {/* Previous attempt error */}
              {confirmError && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-500">{confirmError}</p>
                </div>
              )}

              {/* Wallet balance check */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border",
                hasBalance
                  ? "bg-emerald-500/5 border-emerald-500/25"
                  : "bg-red-500/5 border-red-500/25"
              )}>
                <Wallet className={cn("h-5 w-5 flex-shrink-0", hasBalance ? "text-emerald-500" : "text-red-500")} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Wallet Balance: {walletBalance !== null ? fmtINR(walletBalance) : "Loading…"}
                  </p>
                  {!hasBalance && walletBalance !== null && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Insufficient balance. Need {fmtINR(totalFare - (walletBalance || 0))} more.{" "}
                      <a href="/wallet" className="underline font-semibold">Top up →</a>
                    </p>
                  )}
                </div>
                {hasBalance && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirming ─────────────────────────── */}
          {step === "confirming" && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-lg font-bold">Confirming your booking…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Deducting from wallet and issuing ticket. Please don&apos;t close this window.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ────────────────────────────── */}
          {step === "success" && bookingResult && (
            <div className="p-5 space-y-4">
              {/* Celebration header */}
              <div className="text-center py-4">
                <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <p className="text-xl font-black">Booking Confirmed!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your ticket has been issued successfully
                </p>
              </div>

              {/* Booking reference card */}
              <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Booking Ref", value: bookingResult.bookingRef, mono: true },
                    { label: "PNR", value: bookingResult.pnr || "Processing", mono: true },
                    { label: "Flight", value: `${bookingResult.airline} ${bookingResult.flightNo}` },
                    { label: "Status", value: bookingResult.status?.replace("_", " ") || "Confirmed" },
                    { label: "Route", value: `${bookingResult.from} → ${bookingResult.to}` },
                    { label: "Amount Paid", value: fmtINR(bookingResult.totalAmount) },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="bg-white/40 dark:bg-black/20 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className={cn("text-sm font-bold mt-0.5", mono && "font-mono tracking-wider text-primary")}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/bookings/${bookingResult.bookingRef}`)}
                  className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
                >
                  View E-Ticket
                </button>
                <button
                  onClick={onClose}
                  className="h-11 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        {(step === "passengers" || step === "review" || step === "confirming") && (
          <div className="px-5 py-4 border-t border-border bg-card flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-black">{fmtINR(totalFare)}</p>
              </div>
              {step === "passengers" ? (
                <button
                  onClick={handleNextToReview}
                  className="flex-1 h-12 max-w-[200px] rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  Review Booking <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={
                    (!hasBalance && walletBalance !== null) ||
                    step === "confirming"
                  }
                  className="flex-1 h-12 max-w-[200px] rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {step === "confirming" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Confirming…</>
                  ) : (
                    <><Wallet className="h-4 w-4" />Pay from Wallet</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
