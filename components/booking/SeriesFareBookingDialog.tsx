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
 * Why a separate file (and not the existing flight BookingSheet)?
 *   • The flight BookingSheet lives inline inside `app/flights/page.tsx`
 *     and is tightly coupled to its `Flight` type. Series fares have a
 *     slightly different shape (`SeriesFare`) and need their own form
 *     defaults (single-leg, simpler passenger form, no cabin class flow).
 *   • Keeping it isolated lets us evolve the two flows independently
 *     without one breaking the other.
 *
 * Concurrency safety mirrors the flight booking sheet:
 *   • bookingInProgressRef — synchronous mutex against double-clicks
 *   • idempotencyKeyRef    — stable for the entire booking session
 *   • pendingBookingRefRef — if init succeeded but confirm failed on a
 *                            blip, the retry skips init
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Plane, User as UserIcon, Mail, Phone as PhoneIcon, Wallet,
  Loader2, CheckCircle2, AlertTriangle, ChevronLeft, Sparkles,
  BadgeCheck, CreditCard,
} from "lucide-react";
import { openRazorpay } from "@/lib/razorpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agentApi, unwrap } from "@/lib/api/services";
import { useAuthStore, useWalletStore } from "@/lib/store";
import { getErrorMessage, isNetworkError } from "@/lib/utils/errors";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";

// ─────────────────────────────────────────────────────────────────────────────
// Types — minimal series fare shape we need from the caller
// ─────────────────────────────────────────────────────────────────────────────

export interface SeriesFareForBooking {
  // The backend's `seriesFareToFlight` exposes the fare under both `id`
  // (string) and `_id` (Mongo ObjectId source). We accept either, plus the
  // pre-computed `resultToken` string the backend already includes — that
  // way callers don't have to worry about which field name carried through.
  _id?:         string;
  id?:          string;
  resultToken?: string;

  airline:      string;
  airlineCode?: string;

  // Backend actually uses `flightNumber`, but older code paths and the
  // page-level `SeriesFare` type used `flightNo`. Accept both to avoid
  // empty strings in the UI when one of them is missing.
  flightNo?:     string;
  flightNumber?: string;

  origin:       string;
  destination:  string;

  // Same dual-naming for departure/arrival times.
  departure?:     string;
  departureTime?: string;
  arrival?:       string;
  arrivalTime?:   string;

  duration?:    string;
  fare: {
    baseFare:  number;
    taxes:     number;
    totalFare: number;
    currency?: string;
  };
  agentCommission?: number;

  // Refund flag has been spelled both ways across the codebase.
  refundable?:   boolean;
  isRefundable?: boolean;

  cabinClass?:      string;

  // Same for seats remaining.
  seatsLeft?:      number;
  seatsAvailable?: number;
}

interface Passenger {
  firstName:       string;
  lastName:        string;
  gender:          "M" | "F";
  dob:             string;  // YYYY-MM-DD
  // Passport fields — optional on domestic sectors, required on international.
  // The PNR for series fares is admin-supplied (popped from the admin pool
  // at confirm time), but the airline still needs passport data on the e-
  // ticket when the journey crosses an international border.
  passportNo?:     string;
  passportExpiry?: string;  // YYYY-MM-DD
  nationality?:    string;  // ISO-3166 alpha-2, defaults to "IN"
}

interface Contact {
  email: string;
  phone: string;
}

type Step = "passengers" | "review" | "confirming" | "success";

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Indian airport IATA codes — used to decide if a sector is domestic. If
// either origin or destination is *not* in this list, the passenger
// passport block becomes required (international flight).
//
// Note: this is a frontend-only convenience set — the source of truth lives
// in `tramps-aviation-backend/src/modules/flights/data/airports.ts`. Add new
// codes here only when they're already deployed in the backend catalogue.
const INDIAN_AIRPORTS = new Set([
  "DEL","BOM","BLR","MAA","CCU","HYD","COK","GOI","GOX","PNQ","AMD","JAI",
  "LKO","ATQ","TRV","IXC","BBI","IDR","NAG","PAT","GAU","IXR","IXB","SXR",
  "IXJ","DED","VNS","IXM","CJB","TRZ","IXE","VTZ","RPR","BHO","UDR","JDH",
  "IXU","STV","BDQ","RAJ",
]);

const isIntlSector = (origin: string, destination: string) =>
  !INDIAN_AIRPORTS.has((origin || "").toUpperCase()) ||
  !INDIAN_AIRPORTS.has((destination || "").toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("passengers");
  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    Array.from({ length: Math.max(1, adults) }, () => ({
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
  const [confirmError, setConfirmError]       = useState<string | null>(null);
  const [walletBalance, setWalletBalance]     = useState<number | null>(walletStoreBalance);
  const [bookingResult, setBookingResult]     = useState<{
    bookingRef: string;
    pnr: string;
    status: string;
  } | null>(null);
  // Default to wallet — most common path. Agents can flip to Razorpay
  // when their wallet is short or they want to pay from a card directly.
  const [payMethod, setPayMethod] = useState<"wallet" | "razorpay">("wallet");

  // ── Concurrency-safety refs (same pattern as flight booking sheet) ──
  const bookingInProgressRef = useRef(false);
  const pendingBookingRefRef = useRef<string | null>(null);
  const idempotencyKeyRef    = useRef<string>(generateIdempotencyKey());

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
  }, []);

  const hasBalance = walletBalance !== null && walletBalance >= totalDue;
  const commission = fare.agentCommission || 0;

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

  // ── Confirm booking ──────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (bookingInProgressRef.current) {
      toast.warning("Booking already in progress — please wait");
      return;
    }
    // Wallet path requires balance; Razorpay path is balance-agnostic.
    if (payMethod === "wallet" && !hasBalance) {
      toast.error("Insufficient wallet balance — switch to Razorpay or top up");
      return;
    }
    bookingInProgressRef.current = true;

    setStep("confirming");
    setConfirmError(null);

    const idempotencyKey = idempotencyKeyRef.current;

    try {
      let bookingRef = pendingBookingRefRef.current;

      // Step 1: init booking (skip if we already have a ref from a prior attempt)
      if (!bookingRef) {
        // Resolve the fare token in priority order:
        //   1. Backend-provided `resultToken` (already prefixed with "TRAMPS-")
        //   2. Build it from `id` (the canonical string id from seriesFareToFlight)
        //   3. Fall back to the legacy `_id` field if some caller still uses it
        // This handles all the field-shape variations across our search APIs
        // and avoids the "Tramps Aviation Ticket not found" error that fired
        // when `fare._id` was undefined and the token became `TRAMPS-undefined`.
        const fareIdResolved = fare.id || fare._id || "";
        const tokenResolved  = fare.resultToken || (fareIdResolved ? `TRAMPS-${fareIdResolved}` : "");
        if (!tokenResolved) {
          throw new Error(
            "This fare card is missing its id — please refresh the search results and try again.",
          );
        }
        const initPayload = {
          // The TRAMPS- prefix is how the backend recognises a series-fare booking
          // and routes to the internal PNR-pool flow instead of the live-TBO flow.
          resultToken: tokenResolved,
          flightKey:   tokenResolved,
          passengers: passengers.map((p) => ({
            firstName:      p.firstName.trim(),
            lastName:       p.lastName.trim(),
            gender:         p.gender,
            dateOfBirth:    p.dob,
            passengerType:  "ADT",
            nationality:    p.nationality?.trim() || "IN",
            // Forward passport details only when we actually collected them.
            // Backend treats these as optional and stores whatever is present.
            ...(p.passportNo?.trim()
              ? { passportNumber: p.passportNo.trim().toUpperCase() }
              : {}),
            ...(p.passportExpiry
              ? { passportExpiry: p.passportExpiry }
              : {}),
          })),
          contactEmail: contact.email.trim(),
          contactPhone: contact.phone.trim(),
          tripType:     "OneWay",
          fare:         fare.fare,
          idempotencyKey,
          expectedPricePerPax: fare.fare.totalFare,
        };

        const initRes  = await agentApi.initBooking(initPayload, idempotencyKey);
        const initData = unwrap(initRes) as any;
        bookingRef     = initData?.bookingRef || initData?.booking?.bookingRef || initData?.id;
        if (!bookingRef) throw new Error("Failed to create booking reference. Please try again.");

        pendingBookingRefRef.current = bookingRef;
      }

      // Step 2: confirm — branch on payment method
      let confirmData: any;
      if (payMethod === "wallet") {
        // Atomic wallet debit + booking confirm on the backend
        const confirmRes = await agentApi.confirmB2bBooking(bookingRef);
        confirmData = unwrap(confirmRes) as any;
      } else {
        // Razorpay flow — 3 steps:
        //   a) backend creates a Razorpay order
        //   b) user pays in the Razorpay-hosted modal
        //   c) backend verifies signature + finalises booking
        const orderRes  = await agentApi.createBookingPaymentOrder(bookingRef);
        const orderData = unwrap(orderRes) as any;
        const order = {
          id:       orderData?.orderId      || orderData?.id || orderData?.order?.id,
          amount:   orderData?.amount       || Math.round(totalDue * 100),
          currency: orderData?.currency     || "INR",
        };
        const key = orderData?.keyId
          || orderData?.key
          || (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "");
        if (!order.id || !key) {
          throw new Error("Razorpay is not configured. Please use Wallet or contact admin.");
        }

        const rzpResult = await openRazorpay({
          key,
          order,
          name:        "Tramps Aviation",
          description: `Series fare ${fare.airline} ${fare.origin}→${fare.destination}`,
          prefill: {
            email:   contact.email,
            contact: contact.phone,
            name:    `${passengers[0]?.firstName} ${passengers[0]?.lastName}`.trim(),
          },
        });

        const verifyRes = await agentApi.verifyBookingPayment(bookingRef, rzpResult);
        confirmData     = unwrap(verifyRes) as any;
      }

      // Success — clear transient state
      pendingBookingRefRef.current = null;
      idempotencyKeyRef.current    = generateIdempotencyKey();
      fetchBalance(true).catch(() => {});

      setBookingResult({
        bookingRef,
        pnr:    confirmData?.pnr || confirmData?.booking?.pnr || "Processing",
        status: confirmData?.status || "CONFIRMED",
      });
      setStep("success");
    } catch (err) {
      const msg     = getErrorMessage(err);
      const isNet   = isNetworkError(err);
      const status  = (err as any)?.response?.status;

      if (status === 409) {
        // Already confirmed — treat as success
        const existingRef = (err as any)?.response?.data?.bookingRef
          || pendingBookingRefRef.current
          || "Duplicate";
        setBookingResult({ bookingRef: existingRef, pnr: "Processing", status: "CONFIRMED" });
        setStep("success");
        toast.info("This booking was already confirmed");
        return;
      }

      // Insufficient balance / 402: rotate idempotency so retry creates fresh ref
      if (status === 402 || /balance|insufficient/i.test(msg)) {
        pendingBookingRefRef.current = null;
        idempotencyKeyRef.current    = generateIdempotencyKey();
      }

      setConfirmError(isNet ? "Network error — check your connection and retry." : msg);
      setStep("review");
      toast.error(isNet ? "No internet connection" : msg);
    } finally {
      bookingInProgressRef.current = false;
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
                Don't refresh or close this window. We're debiting your wallet and reserving your seat.
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
                router.push("/b2b/bookings");
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

// ─────────────────────────────────────────────────────────────────────────────
// Step components — kept inline so the dialog stays self-contained
// ─────────────────────────────────────────────────────────────────────────────

function PassengersStep({
  passengers, setPassengers, passengerErrors,
  contact, setContact, contactErrors,
  isIntl,
}: {
  passengers: Passenger[];
  setPassengers: React.Dispatch<React.SetStateAction<Passenger[]>>;
  passengerErrors: Partial<Passenger>[];
  contact: Contact;
  setContact: React.Dispatch<React.SetStateAction<Contact>>;
  contactErrors: Partial<Contact>;
  isIntl: boolean;
}) {
  const update = (i: number, patch: Partial<Passenger>) => {
    setPassengers((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-5">
      {/* International flight notice */}
      {isIntl && (
        <div className="rounded-xl p-3 border border-primary/30 bg-primary/5 text-xs text-primary flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <p>
            <strong>International sector</strong> — passport details are required
            for every passenger. Domestic sectors (within India) accept blank
            passport fields.
          </p>
        </div>
      )}

      {passengers.map((p, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Passenger {i + 1}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={passengerErrors[i]?.firstName as string}>
              <input
                value={p.firstName}
                onChange={(e) => update(i, { firstName: e.target.value })}
                className="input"
                placeholder="As on Aadhaar / ID"
              />
            </Field>
            <Field label="Last name" error={passengerErrors[i]?.lastName as string}>
              <input
                value={p.lastName}
                onChange={(e) => update(i, { lastName: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Gender">
              <select
                value={p.gender}
                onChange={(e) => update(i, { gender: e.target.value as "M" | "F" })}
                className="input"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </Field>
            <Field label="Date of birth" error={passengerErrors[i]?.dob as string}>
              <input
                type="date"
                value={p.dob}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => update(i, { dob: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          {/* Passport sub-section — required only for international sectors,
              but always shown so domestic agents can still fill it for
              corporate / ID-checked routes if they prefer. */}
          <details
            className="mt-1 group"
            open={isIntl}
          >
            <summary className="cursor-pointer flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
              <BadgeCheck className="h-3.5 w-3.5" />
              Passport details
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full border text-[9px] font-bold",
                  isIntl
                    ? "border-rose-500/40 text-rose-600 bg-rose-500/5"
                    : "border-border text-muted-foreground bg-muted/40",
                )}
              >
                {isIntl ? "Required" : "Optional"}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground group-open:hidden">click to expand</span>
            </summary>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field
                label={`Passport number${isIntl ? "" : " (optional)"}`}
                error={passengerErrors[i]?.passportNo as string}
              >
                <input
                  value={p.passportNo || ""}
                  onChange={(e) => update(i, { passportNo: e.target.value.toUpperCase() })}
                  className="input"
                  placeholder="A1234567"
                  maxLength={12}
                />
              </Field>
              <Field
                label={`Passport expiry${isIntl ? "" : " (optional)"}`}
                error={passengerErrors[i]?.passportExpiry as string}
              >
                <input
                  type="date"
                  value={p.passportExpiry || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => update(i, { passportExpiry: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Nationality">
                <input
                  value={p.nationality || "IN"}
                  onChange={(e) => update(i, { nationality: e.target.value.toUpperCase().slice(0, 2) })}
                  className="input"
                  placeholder="IN"
                  maxLength={2}
                />
              </Field>
            </div>
          </details>
        </div>
      ))}

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Contact for ticket / e-ticket</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" error={contactErrors.email}>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              className="input"
              placeholder="agent@email.com"
            />
          </Field>
          <Field label="Phone" error={contactErrors.phone}>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-xs text-muted-foreground">
                +91
              </span>
              <input
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                className="input rounded-l-none"
                placeholder="9876543210"
                inputMode="numeric"
              />
            </div>
          </Field>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.625rem;
          background: hsl(var(--background));
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

function ReviewStep({
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

function SuccessStep({
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
