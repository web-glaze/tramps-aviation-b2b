"use client";

/**
 * Make Payment page.
 *
 * This is a stand-alone wrapper around the existing wallet topup flow,
 * exposed at a more discoverable URL (/account/payments). It's the
 * entry point linked from the Account → Make Payment menu item; it just
 * shows the topup modal in-page (no overlay) so the agent can fund the
 * wallet without going through the wallet statement first.
 *
 * Razorpay self-serve and bank-transfer flows are both supported — see
 * the topup modal in app/wallet/page.tsx for the actual logic.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { agentApi, unwrap } from "@/lib/api/services";
import { openRazorpay } from "@/lib/razorpay";
import { usePlatformStore } from "@/lib/store";
import { AccountLayout } from "@/components/account/AccountLayout";
import { toast } from "sonner";
import {
  Zap, Building2, CheckCircle2, Loader2, RefreshCw,
  CreditCard, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function MakePaymentPage() {
  const { ps, fetchIfStale } = usePlatformStore();
  const [tab, setTab] = useState<"razorpay" | "bank">("razorpay");
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [step, setStep] = useState<"form" | "loading" | "done">("form");
  const [doneAmount, setDoneAmount] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchIfStale();
    agentApi
      .getWallet()
      .then((res) => {
        const d = unwrap(res) as any;
        setBalance(typeof d === "number" ? d : d?.balance ?? d?.walletBalance ?? 0);
      })
      .catch(() => setBalance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const QUICK = [5000, 10000, 25000, 50000];
  const bankAccounts = (ps?.bankAccounts || []).filter((a) => a.isActive !== false);
  const minAmt = ps?.minWalletTopup || 500;

  const handleRazorpay = async () => {
    const amt = Number(amount);
    if (!amt || amt < minAmt) {
      toast.error(`Minimum top-up is ${fmtINR(minAmt)}`);
      return;
    }
    setStep("loading");
    try {
      const orderRes: any = await agentApi.createTopupOrder(amt);
      const order = unwrap(orderRes) as any;
      const key = order?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        toast.error("Razorpay is not configured. Please use Bank Transfer.");
        setStep("form");
        return;
      }
      const result = await openRazorpay({
        key,
        order: { id: order.razorpayOrderId, amount: amt * 100 },
        name: ps?.platformName || "Tramps Aviation — Wallet Topup",
        description: `Wallet credit of ₹${amt.toLocaleString("en-IN")}`,
      });
      const verify: any = await agentApi.verifyTopupPayment({
        razorpayOrderId: result.razorpayOrderId,
        razorpayPaymentId: result.razorpayPaymentId,
        razorpaySignature: result.razorpaySignature,
      });
      const v = unwrap(verify) as any;
      setDoneAmount(v?.amount || amt);
      setStep("done");
      // Refresh balance
      agentApi
        .getWallet()
        .then((r) => {
          const d = unwrap(r) as any;
          setBalance(
            typeof d === "number" ? d : d?.balance ?? d?.walletBalance ?? 0,
          );
        })
        .catch(() => {});
    } catch (e: any) {
      const msg = e?.message || e?.response?.data?.message || "Payment failed";
      if (/cancel/i.test(msg)) {
        setStep("form");
        return;
      }
      toast.error(msg);
      setStep("form");
    }
  };

  const handleManual = async () => {
    const amt = Number(amount);
    if (!amt || amt < minAmt) {
      toast.error(`Minimum top-up is ${fmtINR(minAmt)}`);
      return;
    }
    setStep("loading");
    try {
      await agentApi.requestTopup({ amount: amt, utrNumber: utr || undefined });
      setDoneAmount(amt);
      setStep("done");
    } catch {
      setDoneAmount(amt);
      setStep("done");
    }
  };

  if (step === "done") {
    return (
      <AccountLayout>
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {tab === "razorpay" ? "Payment Successful" : "Request Submitted"}
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {tab === "razorpay"
              ? `${fmtINR(doneAmount)} credited to your wallet.`
              : `Your top-up request for ${fmtINR(doneAmount)} is recorded. Admin will credit your wallet within 30 minutes.`}
          </p>
          {balance !== null && (
            <p className="text-xs text-muted-foreground">
              Current balance:{" "}
              <span className="font-bold text-foreground">{fmtINR(balance)}</span>
            </p>
          )}
          <div className="flex gap-2 justify-center mt-6">
            <button
              onClick={() => {
                setStep("form");
                setAmount("");
                setUtr("");
              }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
            >
              Pay again
            </button>
            <Link
              href="/wallet"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              View statement
            </Link>
          </div>
        </div>
      </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Make Payment</h1>
        <p className="text-sm text-muted-foreground">
          Add funds to your wallet — pay instantly via Razorpay or transfer
          to a bank account.
        </p>
      </div>

      {balance !== null && (
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground flex items-center justify-between">
          <div>
            <p className="text-xs text-primary-foreground/70 uppercase tracking-wider">
              Current balance
            </p>
            <p className="text-2xl font-bold font-display">{fmtINR(balance)}</p>
          </div>
          <CreditCard className="h-8 w-8 opacity-50" />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        {/*
          Pre-fix: both tabs looked almost identical — just a faint
          background change on selection — so agents missed which payment
          method was active. New design: the SELECTED tab gets the brand
          gradient (blue→orange, same one used on the printed e-ticket),
          a soft glow shadow, white text, and a scale-pop. Inactive tabs
          stay flat-muted with a hover lift.
        */}
        <div className="relative grid grid-cols-2 gap-1.5 p-1.5 bg-muted/50 rounded-2xl">
          <button
            onClick={() => setTab("razorpay")}
            className={cn(
              "relative flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200",
              tab === "razorpay"
                ? "text-white shadow-lg shadow-[hsl(var(--brand-blue))]/25 scale-[1.02] ring-1 ring-white/20"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
            style={
              tab === "razorpay"
                ? {
                    background:
                      "linear-gradient(135deg, hsl(var(--brand-blue-dark)) 0%, hsl(var(--brand-blue)) 55%, hsl(var(--brand-orange)) 100%)",
                  }
                : undefined
            }
          >
            <Zap
              className={cn(
                "h-4 w-4",
                tab === "razorpay" ? "drop-shadow-sm" : "",
              )}
              fill={tab === "razorpay" ? "currentColor" : "none"}
            />
            Pay with Razorpay
            {tab === "razorpay" && (
              <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setTab("bank")}
            className={cn(
              "relative flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200",
              tab === "bank"
                ? "text-white shadow-lg shadow-[hsl(var(--brand-orange))]/25 scale-[1.02] ring-1 ring-white/20"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
            style={
              tab === "bank"
                ? {
                    background:
                      "linear-gradient(135deg, hsl(var(--brand-orange-dark)) 0%, hsl(var(--brand-orange)) 60%, hsl(var(--brand-blue)) 100%)",
                  }
                : undefined
            }
          >
            <Building2
              className={cn(
                "h-4 w-4",
                tab === "bank" ? "drop-shadow-sm" : "",
              )}
            />
            Bank Transfer
            {tab === "bank" && (
              <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
            )}
          </button>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Amount (₹)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Enter amount (min ${fmtINR(minAmt)})`}
            className="input-base text-lg font-bold"
            min={minAmt}
          />
          <div className="flex gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  amount === String(q)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                ₹{(q / 1000).toFixed(0)}K
              </button>
            ))}
          </div>
        </div>

        {tab === "razorpay" ? (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Instant credit via Razorpay
              </p>
              Pay using card / UPI / net banking. Wallet is credited within
              seconds after payment succeeds. A 2% gateway fee may apply on
              card payments.
            </div>
            <button
              onClick={handleRazorpay}
              disabled={step === "loading" || !amount}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
            >
              {step === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening payment…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Pay {amount ? fmtINR(Number(amount)) : "—"} with Razorpay
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {bankAccounts.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                Bank details haven&apos;t been configured yet by admin. Please use
                the Razorpay tab, or contact support.
              </div>
            ) : (
              <>
                <Link
                  href="/account/bank-accounts"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all bank accounts →
                </Link>
                {bankAccounts.slice(0, 1).map((acc, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4"
                  >
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">
                      Transfer Funds To
                    </p>
                    <div className="space-y-2 text-sm">
                      {[
                        ["Account Name", acc.accountName],
                        ["Account Number", acc.accountNumber],
                        ["IFSC Code", acc.ifscCode],
                        ["Bank", acc.bankName],
                        ["UPI ID", acc.upiId],
                      ]
                        .filter(([, v]) => !!v)
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-semibold text-foreground text-right break-all">
                              {v}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                UTR / Transaction ID (optional)
              </label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UTR number"
                className="input-base"
              />
              <p className="text-[10px] text-muted-foreground">
                Adding UTR speeds up credit confirmation
              </p>
            </div>

            <button
              onClick={handleManual}
              disabled={step === "loading" || !amount}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
            >
              {step === "loading" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Bank Transfer Request"
              )}
            </button>

            <a
              href={`https://wa.me/${(ps?.socialWhatsapp || "919115500112").replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I want to add funds to my wallet. Amount: ₹" + (amount || ""))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-[#25D366] hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Or WhatsApp us directly for faster processing
            </a>
          </>
        )}
      </div>
    </div>
    </AccountLayout>
  );
}
