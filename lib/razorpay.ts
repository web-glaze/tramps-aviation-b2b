/**
 * razorpay.ts — Tiny helper around the Razorpay Checkout JS SDK.
 *
 * Loads `https://checkout.razorpay.com/v1/checkout.js` on first call (cached
 * after that), then exposes `openRazorpay(options)` which resolves with the
 * payment payload on success or rejects on dismiss/failure.
 *
 * Why a wrapper?
 *   • The SDK attaches `window.Razorpay` and uses imperative new'd objects;
 *     wrapping it in a Promise makes it await-friendly.
 *   • Repeated injections of the script tag are de-duped.
 *
 * Public key: read from NEXT_PUBLIC_RAZORPAY_KEY_ID at call site.
 *
 * Usage:
 *   const result = await openRazorpay({
 *     key:   "rzp_test_xxx",
 *     order: { id: "order_abc", amount: 200000, currency: "INR" },
 *     name:  "Tramps Aviation",
 *     description: "Series fare booking",
 *     prefill: { email, contact },
 *   });
 *   // result = { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */

const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load",  () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src   = SDK_URL;
    s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export interface RazorpayOpenOptions {
  key:   string;
  order: { id: string; amount: number; currency?: string };
  name?:        string;
  description?: string;
  prefill?:     { email?: string; contact?: string; name?: string };
  themeColor?:  string;
}

export interface RazorpaySuccessPayload {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Opens the Razorpay checkout modal. Resolves on successful capture (which
 * just means the user paid — backend still needs to verify the signature).
 * Rejects when the user dismisses the modal or the SDK errors.
 */
export async function openRazorpay(opts: RazorpayOpenOptions): Promise<RazorpaySuccessPayload> {
  await loadSdk();

  return new Promise<RazorpaySuccessPayload>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK not available"));
      return;
    }

    const rzp = new window.Razorpay({
      key:         opts.key,
      order_id:    opts.order.id,
      amount:      opts.order.amount,           // in paise
      currency:    opts.order.currency || "INR",
      name:        opts.name        || "Tramps Aviation",
      description: opts.description || "Booking",
      prefill: {
        email:   opts.prefill?.email   || "",
        contact: opts.prefill?.contact || "",
        name:    opts.prefill?.name    || "",
      },
      // Razorpay checkout matches the Tramps Aviation brand blue (logo colour)
      theme: { color: opts.themeColor || "#209ACD" },
      modal: {
        ondismiss: () => {
          // User closed the checkout — treat as cancel.
          reject(new Error("Payment cancelled"));
        },
      },
      handler: (response: any) => {
        resolve({
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      reject(new Error(resp?.error?.description || "Payment failed"));
    });

    rzp.open();
  });
}
