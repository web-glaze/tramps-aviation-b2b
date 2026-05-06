"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { agentApi, unwrap } from "@/lib/api/services";
import { useWalletStore } from "@/lib/store";
import { getErrorMessage, isNetworkError } from "@/lib/utils/errors";
import { openRazorpay } from "@/lib/razorpay";
import { SeriesFareForBooking, Passenger, Contact, BookingResult } from "./seriesFareTypes";
import { generateIdempotencyKey } from "./seriesFareConstants";

/**
 * What `handleConfirm` resolves to. We return a consistent object on every
 * code path so callers can do `result.success` without a null-check — the
 * dialog uses this to flip from "confirming" → "success" / "review".
 */
export type ConfirmOutcome =
  | { success: true; bookingResult: BookingResult }
  | { success: false; error?: string };

export function useSeriesFareBooking(
  fare: SeriesFareForBooking,
  passengers: Passenger[],
  contact: Contact,
  totalDue: number,
  payMethod: "wallet" | "razorpay",
) {
  const { fetchBalance } = useWalletStore();

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [lastBookingResult, setLastBookingResult] = useState<BookingResult | null>(null);

  // Concurrency-safety refs (same pattern as flight booking sheet)
  const bookingInProgressRef = useRef(false);
  const pendingBookingRefRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  const handleConfirm = useCallback(
    async (
      hasBalance: boolean,
      walletBalance: number | null,
    ): Promise<ConfirmOutcome> => {
      if (bookingInProgressRef.current) {
        toast.warning("Booking already in progress — please wait");
        return { success: false, error: "in-progress" };
      }
      // Wallet path requires balance; Razorpay path is balance-agnostic.
      if (payMethod === "wallet" && !hasBalance) {
        toast.error("Insufficient wallet balance — switch to Razorpay or top up");
        return { success: false, error: "insufficient-balance" };
      }
      bookingInProgressRef.current = true;
      setIsConfirming(true);
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

        const result = {
          bookingRef,
          pnr:    confirmData?.pnr || confirmData?.booking?.pnr || "Processing",
          status: confirmData?.status || "CONFIRMED",
        };
        setBookingResult(result);
        setLastBookingResult(result);

        return { success: true, bookingResult: result };
      } catch (err) {
        const msg     = getErrorMessage(err);
        const isNet   = isNetworkError(err);
        const status  = (err as any)?.response?.status;

        if (status === 409) {
          // Already confirmed — treat as success
          const existingRef = (err as any)?.response?.data?.bookingRef
            || pendingBookingRefRef.current
            || "Duplicate";
          const result = { bookingRef: existingRef, pnr: "Processing", status: "CONFIRMED" };
          setBookingResult(result);
          setLastBookingResult(result);
          toast.info("This booking was already confirmed");
          return { success: true, bookingResult: result };
        }

        // Insufficient balance / 402: rotate idempotency so retry creates fresh ref
        if (status === 402 || /balance|insufficient/i.test(msg)) {
          pendingBookingRefRef.current = null;
          idempotencyKeyRef.current    = generateIdempotencyKey();
        }

        setConfirmError(isNet ? "Network error — check your connection and retry." : msg);
        toast.error(isNet ? "No internet connection" : msg);
        return { success: false, error: msg };
      } finally {
        bookingInProgressRef.current = false;
        setIsConfirming(false);
      }
    },
    [fare, passengers, contact, totalDue, payMethod, fetchBalance],
  );

  const reset = useCallback(() => {
    setConfirmError(null);
    setBookingResult(null);
    setIsConfirming(false);
    pendingBookingRefRef.current = null;
    idempotencyKeyRef.current = generateIdempotencyKey();
  }, []);

  return {
    confirmError,
    bookingResult: lastBookingResult,
    isConfirming,
    handleConfirm,
    reset,
    idempotencyKeyRef,
    pendingBookingRefRef,
    bookingInProgressRef,
  };
}
