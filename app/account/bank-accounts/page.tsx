"use client";

/**
 * Bank Accounts page — read-only list of payee bank accounts the agent can
 * use to top up. The list is admin-managed (Admin → Platform Settings →
 * Bank Accounts) and exposed via /admin/public-settings, so it stays in
 * sync without a frontend deploy.
 *
 * Pre-fix: the same details were hardcoded inside the wallet topup modal.
 * Now they live in one place — this page — and the topup modal pulls the
 * same data from the platform store.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlatformStore } from "@/lib/store";
import { Building2, Copy, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { AccountLayout } from "@/components/account/AccountLayout";

function CopyableField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold font-mono text-foreground break-all">
          {value}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function BankAccountsPage() {
  const { ps, fetchIfStale } = usePlatformStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetchIfStale();
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accounts = (ps?.bankAccounts || []).filter((a) => a.isActive !== false);

  return (
    <AccountLayout>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Bank Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Use any of these accounts to transfer funds to your wallet
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 flex gap-3 text-xs text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          After transferring, please submit your UTR / Transaction ID via the
          {" "}
          <Link href="/account/payments" className="underline font-semibold">
            Make Payment
          </Link>
          {" "}page so we can credit your wallet within 30 minutes.
        </p>
      </div>

      {!hydrated || ps === undefined ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading bank account details…
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-semibold text-foreground mb-1">
            No bank accounts configured yet
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Bank account details are managed by the admin. Please use the{" "}
            <strong>Pay with Razorpay</strong> option for instant top-ups, or
            contact support.
          </p>
          <Link
            href="/account/payments"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Pay with Razorpay <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((acc, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-2xl p-5 space-y-1"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {acc.bankName || "Bank Account"}
                  </p>
                  {acc.branch && (
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {acc.branch}
                    </p>
                  )}
                </div>
              </div>
              <CopyableField label="Account Name" value={acc.accountName} />
              <CopyableField label="Account Number" value={acc.accountNumber} />
              <CopyableField label="IFSC Code" value={acc.ifscCode} />
              <CopyableField label="UPI ID" value={acc.upiId} />
            </div>
          ))}
        </div>
      )}
    </div>
    </AccountLayout>
  );
}
