'use client'
import { useEffect, useState, useMemo } from 'react'
import { agentApi, unwrap } from '@/lib/api/services'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { openRazorpay } from '@/lib/razorpay'
import { usePlatformStore } from '@/lib/store'
import { AccountLayout } from '@/components/account/AccountLayout'
import {
  Wallet, ArrowUpRight, ArrowDownRight, DollarSign,
  RefreshCw, X, Phone, MessageCircle, CheckCircle2,
  Download, Search, AlertCircle, Loader2, CreditCard, Building2, Zap,
} from 'lucide-react'

// ─── Topup Request Modal ──────────────────────────────────────────────────────
// Pre-fix: only the manual bank-transfer flow existed (agent transfers funds
// to a hardcoded bank account, types the UTR, admin manually credits later).
// Now there are two tabs: Razorpay (instant, self-serve) and Bank Transfer
// (manual, for amounts above Razorpay limits or when card isn't available).
// Bank accounts are now ADMIN-MANAGED (admin/settings → bankAccounts) and
// fetched via the platform-settings store — no more hardcoded IFSC codes.
function TopupModal({ onClose, onCredited }: { onClose: () => void; onCredited?: () => void }) {
  const { ps } = usePlatformStore();
  const bankAccounts = ps?.bankAccounts || [];
  const [amount, setAmount]   = useState("")
  const [utr, setUtr]         = useState("")
  const [tab, setTab]         = useState<"razorpay" | "bank">("razorpay")
  const [step, setStep]       = useState<"form" | "loading" | "done">("form")
  const [doneInfo, setDoneInfo] = useState<{ message: string; amount: number } | null>(null)

  const QUICK = [5000, 10000, 25000, 50000]

  const handleRazorpay = async () => {
    const amt = Number(amount)
    if (!amt || amt < 500) { toast.error("Minimum topup is ₹500"); return }
    setStep("loading")
    try {
      // 1. Create order on backend
      const orderRes: any = await agentApi.createTopupOrder(amt)
      const order = unwrap(orderRes) as any
      // 2. Open Razorpay checkout
      const key = order?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!key) {
        toast.error("Razorpay is not configured. Please use Bank Transfer or contact support.")
        setStep("form")
        return
      }
      const result = await openRazorpay({
        key,
        order: { id: order.razorpayOrderId, amount: amt * 100 },
        name: "Tramps Aviation — Wallet Topup",
        description: `Wallet credit of ₹${amt.toLocaleString("en-IN")}`,
      })
      // 3. Verify on backend → wallet auto-credited
      const verify: any = await agentApi.verifyTopupPayment({
        razorpayOrderId: result.razorpayOrderId,
        razorpayPaymentId: result.razorpayPaymentId,
        razorpaySignature: result.razorpaySignature,
      })
      const v = unwrap(verify) as any
      setDoneInfo({
        message: v?.alreadyDone
          ? "Payment was already processed."
          : `₹${amt.toLocaleString("en-IN")} credited to your wallet.`,
        amount: amt,
      })
      setStep("done")
      onCredited?.()
    } catch (e: any) {
      const msg = e?.message || e?.response?.data?.message || "Payment failed"
      // User cancellation isn't a hard error — just bounce back to the form
      if (/cancel/i.test(msg)) {
        setStep("form")
        return
      }
      toast.error(msg)
      setStep("form")
    }
  }

  const handleManualSubmit = async () => {
    const amt = Number(amount)
    if (!amt || amt < 500) { toast.error("Minimum topup is ₹500"); return }
    setStep("loading")
    try {
      await agentApi.requestTopup({ amount: amt, utrNumber: utr || undefined })
      setDoneInfo({
        message: "Your topup request has been recorded. Admin will credit your wallet within 30 minutes.",
        amount: amt,
      })
      setStep("done")
    } catch (e: any) {
      // Soft fall-through — request lost is recoverable via WhatsApp
      setDoneInfo({
        message: "We couldn't reach the server, but you can WhatsApp us with your UTR for manual processing.",
        amount: amt,
      })
      setStep("done")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={step === "form" ? onClose : undefined}/>
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-foreground">Add Funds</h3>
          {step === "form" && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4"/>
            </button>
          )}
        </div>

        {step === "done" ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400"/>
            </div>
            <h4 className="font-bold text-lg mb-1">
              {tab === "razorpay" ? "Payment Successful" : "Request Submitted"}
            </h4>
            <p className="text-sm text-muted-foreground mb-5">{doneInfo?.message}</p>
            <button onClick={onClose} className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all">
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Tab selector — same brand-gradient styling as the standalone
                Make Payment page. The selected tab uses the brand
                blue→orange gradient with a glow shadow + ring; inactive
                tabs stay flat-muted with a hover lift. */}
            <div className="relative grid grid-cols-2 gap-1.5 p-1.5 bg-muted/50 rounded-2xl">
              <button
                onClick={() => setTab("razorpay")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                  tab === "razorpay"
                    ? "text-white shadow-lg shadow-[hsl(var(--brand-blue))]/25 scale-[1.02] ring-1 ring-white/20"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
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
                  className={cn("h-4 w-4", tab === "razorpay" ? "drop-shadow-sm" : "")}
                  fill={tab === "razorpay" ? "currentColor" : "none"}
                />
                Pay with Razorpay
                {tab === "razorpay" && (
                  <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setTab("bank")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                  tab === "bank"
                    ? "text-white shadow-lg shadow-[hsl(var(--brand-orange))]/25 scale-[1.02] ring-1 ring-white/20"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
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
                  className={cn("h-4 w-4", tab === "bank" ? "drop-shadow-sm" : "")}
                />
                Bank Transfer
                {tab === "bank" && (
                  <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
                )}
              </button>
            </div>

            {/* Amount field is shared between both flows */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount (min ₹500)"
                className="input-base text-lg font-bold"
                min={500}
              />
              <div className="flex gap-2">
                {QUICK.map(q => (
                  <button key={q} onClick={() => setAmount(String(q))}
                    className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      amount === String(q)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    )}>
                    ₹{(q / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>

            {tab === "razorpay" ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5"/> Instant credit via Razorpay
                  </p>
                  Pay using card / UPI / net banking. Wallet is credited within seconds
                  after the payment succeeds. A 2% gateway fee may apply on card payments.
                </div>
                <button
                  onClick={handleRazorpay}
                  disabled={step === "loading" || !amount}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {step === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin"/>Opening payment…</>
                    : <><Zap className="h-4 w-4"/>Pay ₹{amount ? Number(amount).toLocaleString("en-IN") : "—"} with Razorpay</>}
                </button>
              </>
            ) : (
              <>
                {/* Bank details — admin-managed via /admin/settings.
                    Agents see only entries with isActive=true.
                    If admin hasn't set any yet, we show a friendly note
                    pointing them to WhatsApp. */}
                {bankAccounts.length === 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                    Bank details haven&apos;t been configured yet by admin.
                    Please use the Razorpay tab, or WhatsApp us below to get the
                    account details.
                  </div>
                ) : (
                  bankAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4"
                    >
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">
                        Transfer Funds To{bankAccounts.length > 1 ? ` (Option ${idx + 1})` : ""}
                      </p>
                      <div className="space-y-2 text-sm">
                        {[
                          ["Account Name", acc.accountName],
                          ["Account Number", acc.accountNumber],
                          ["IFSC Code", acc.ifscCode],
                          ["Bank", acc.bankName],
                          ["Branch", acc.branch],
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
                  ))
                )}

                {/* UTR */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    UTR / Transaction ID (optional)
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={e => setUtr(e.target.value)}
                    placeholder="12-digit UTR number"
                    className="input-base"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Adding UTR speeds up credit confirmation
                  </p>
                </div>

                <button
                  onClick={handleManualSubmit}
                  disabled={step === "loading" || !amount}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {step === "loading"
                    ? <><RefreshCw className="h-4 w-4 animate-spin"/>Submitting…</>
                    : "Submit Bank Transfer Request"}
                </button>

                <a
                  href="https://wa.me/919115500112?text=Hi%2C%20I%20want%20to%20add%20funds%20to%20my%20wallet.%20Amount%3A%20%E2%82%B9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs text-[#25D366] hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5"/>
                  Or WhatsApp us directly for faster processing
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Wallet Page ─────────────────────────────────────────────────────────
export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0)
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showTopup, setShowTopup] = useState(false)

  // Pre-fix: there was no search bar — agents reconciling a CSV statement
  // had to scroll through 15-row pages to find a single bookingRef or UTR.
  // Now we filter client-side (the backend already paginates 15/page so
  // the dataset on screen is small) by description, txnId, transactionRef,
  // and category. If you need server-side full-history search, add a
  // `?q=` param to /agents/wallet/transactions and forward `search` here.
  const visibleTxns = useMemo(() => {
    if (!search.trim()) return txns
    const q = search.toLowerCase().trim()
    return txns.filter((t: any) => {
      const blob = [
        t.description, t.category, t.type, t.transactionRef,
        t.txnId, t.bookingRef, String(t.amount),
      ].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [txns, search])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBalance() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTxns() }, [filter, page])

  const loadBalance = async () => {
    try {
      const res = await agentApi.getWallet()
      const d = unwrap(res) as any
      setBalance(typeof d === 'number' ? d : d?.balance ?? d?.walletBalance ?? 0)
    } catch { setBalance(0) }
  }

  const loadTxns = async () => {
    setTxLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (filter !== 'all') params.category = filter
      const res = await agentApi.getWalletTransactions(params)
      const d = unwrap(res) as any
      setTxns(Array.isArray(d?.transactions) ? d.transactions : Array.isArray(d?.data) ? d.data : [])
      setTotal(d?.pagination?.total ?? d?.total ?? 0)
    } catch { setTxns([]) }
    finally { setTxLoading(false); setLoading(false) }
  }

  // ── CSV download ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const header = 'Date,Type,Description,Amount,Balance After\n'
    const rows = txns.map(t =>
      `"${t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ''}","${t.type}","${t.description || t.category || ''}","${t.amount}","${t.balanceAfter || ''}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `wallet-statement-${new Date().toISOString().split('T')[0]}.csv`
    })
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Statement downloaded')
  }

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'topup', label: 'Top-ups' },
    { key: 'booking_debit', label: 'Bookings' },
    { key: 'refund', label: 'Refunds' },
    { key: 'commission', label: 'Commission' },
  ]

  return (
    <>
      {showTopup && (
        <TopupModal
          onClose={() => { setShowTopup(false); loadBalance(); loadTxns(); }}
          onCredited={() => { loadBalance(); loadTxns(); }}
        />
      )}

      {/* Pre-fix: the section nav was inline pills under the heading
          (Statement | Make Payment | Invoices | Bank Accounts) which
          scrolled away. Now the nav lives in <AccountLayout>'s sticky
          left sidebar and every sub-page shares the same content width. */}
      <AccountLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Statement</h1>
            <p className="text-sm text-muted-foreground">
              Wallet balance and transaction history
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCSV}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">Statement</span>
            </button>
            <button
              onClick={() => { loadBalance(); loadTxns() }}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', txLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-primary rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/70">Available Balance</p>
                <p className="text-3xl font-bold font-display">{loading ? '—' : fmtINR(balance)}</p>
              </div>
            </div>
            {/* Add Funds button */}
            <button
              onClick={() => setShowTopup(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-all border border-white/25 flex-shrink-0"
            >
              <ArrowUpRight className="h-4 w-4"/>
              Add Funds
            </button>
          </div>
          <p className="text-xs text-primary-foreground/60 mt-4 flex items-center gap-1.5">
            <Phone className="h-3 w-3"/>
            Funds added within 30 min · Contact: +91 91155-00112
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Credits",
              value: fmtINR(txns.filter(t => t.type === 'CREDIT' || t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0)),
              color: "text-emerald-500", bg: "bg-emerald-500/10"
            },
            {
              label: "Total Debits",
              value: fmtINR(txns.filter(t => t.type !== 'CREDIT' && t.type !== 'credit').reduce((s, t) => s + (t.amount || 0), 0)),
              color: "text-red-500", bg: "bg-red-500/10"
            },
            {
              label: "Transactions",
              value: String(total),
              color: "text-primary", bg: "bg-primary/10"
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn("rounded-xl p-4 border border-border", bg)}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-lg font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Low balance warning */}
        {balance >= 0 && balance < 5000 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">Low balance — </span>
              Add funds to continue booking flights and hotels.
            </div>
            <button onClick={() => setShowTopup(true)}
              className="flex-shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-colors whitespace-nowrap">
              Add Funds →
            </button>
          </div>
        )}

        {/* Filters + search row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-muted/60 rounded-xl w-fit">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === f.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search box (client-side filter on the visible page) */}
          <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by booking ref, UTR, description…"
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
            />
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold font-display">Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} total transactions</p>
          </div>
          <div className="divide-y divide-border">
            {txLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))
            ) : visibleTxns.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>{search ? `No transactions matching "${search}"` : "No transactions found"}</p>
                {!search && (
                  <button onClick={() => setShowTopup(true)} className="mt-3 text-primary hover:underline text-xs">
                    Add funds to get started →
                  </button>
                )}
                {search && (
                  <button onClick={() => setSearch("")} className="mt-3 text-primary hover:underline text-xs">
                    Clear search
                  </button>
                )}
              </div>
            ) : visibleTxns.map((t: any, i) => {
              const isCredit = t.type === 'CREDIT' || t.type === 'credit'
              return (
                <div key={t._id || i} className="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    isCredit ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                    {isCredit
                      ? <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                      : <ArrowDownRight className="h-5 w-5 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || t.category || (isCredit ? 'Credit' : 'Debit')}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </p>
                      {t.transactionRef && (
                        <span className="text-xs text-muted-foreground font-mono">· {t.transactionRef}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-bold', isCredit ? 'text-emerald-500' : 'text-red-500')}>
                      {isCredit ? '+' : '-'}{fmtINR(t.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Bal: {fmtINR(t.balanceAfter || 0)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {total > 15 && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {((page-1)*15)+1}–{Math.min(page*15, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors">
                  ← Prev
                </button>
                <button onClick={() => setPage(p => p+1)} disabled={page * 15 >= total}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </AccountLayout>
    </>
  )
}