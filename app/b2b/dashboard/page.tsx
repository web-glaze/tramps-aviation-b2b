"use client";
import { useEffect, useState } from "react";
import { agentApi, unwrap } from "@/lib/api/services";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Wallet,
  Plane,
  DollarSign,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  CreditCard,
  Activity,
  RefreshCw,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  trend,
  trendUp,
  loading,
}: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center",
            bg,
          )}
        >
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
              trendUp
                ? "text-emerald-600 bg-emerald-500/10"
                : "text-red-500 bg-red-500/10",
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold font-display">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {title && (
            <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function B2BDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, walletRes, txRes, bookRes] = await Promise.allSettled([
        agentApi.getDashboard(),
        agentApi.getWallet(),
        agentApi.getWalletTransactions({ limit: 5 }),
        agentApi.getBookings({ limit: 5 }),
      ]);

      if (dashRes.status === "fulfilled") {
        const d = unwrap(dashRes.value) as any;
        setStats(d);
      }
      if (walletRes.status === "fulfilled") {
        const d = unwrap(walletRes.value) as any;
        setWallet(d);
      }
      if (txRes.status === "fulfilled") {
        const d = unwrap(txRes.value) as any;
        setTxns(d?.transactions || d?.data || []);
      }
      if (bookRes.status === "fulfilled") {
        const d = unwrap(bookRes.value) as any;
        setBookings(
          Array.isArray(d?.bookings)
            ? d.bookings
            : Array.isArray(d?.data)
              ? d.data
              : Array.isArray(d)
                ? d
                : [],
        );
      }
    } catch {
      /* individual errors handled above */
    } finally {
      setLoading(false);
    }
  };

  const walletBal = wallet?.balance ?? stats?.walletBalance ?? 0;
  const totalBookings = stats?.totalBookings ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const kycStatus = stats?.kycStatus ?? user?.kycStatus ?? "pending";
  const agencyName =
    stats?.agencyName ?? user?.agencyName ?? user?.name ?? "Agency";

  const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back,{" "}
            <span className="font-semibold text-foreground">{agencyName}</span>
          </p>
        </div>
        <button
          onClick={loadAll}
          className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* KYC alert if pending */}
      {kycStatus !== "approved" && kycStatus !== "active" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">
              KYC{" "}
              {kycStatus === "submitted" || kycStatus === "under_review"
                ? "Under Review"
                : "Incomplete"}{" "}
              —{" "}
            </span>
            {kycStatus === "submitted" || kycStatus === "under_review"
              ? "Your documents are being reviewed. You will be notified once approved."
              : "Upload your KYC documents to start booking flights and hotels."}
          </div>
          <Link
            href="/b2b/kyc"
            className="text-xs font-semibold px-3 py-1.5 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-colors whitespace-nowrap"
          >
            {kycStatus === "submitted" || kycStatus === "under_review"
              ? "View Status"
              : "Complete KYC →"}
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Wallet Balance"
          value={fmtINR(walletBal)}
          icon={Wallet}
          color="text-primary"
          bg="bg-primary/10"
          loading={loading}
        />
        <StatCard
          title="Total Bookings"
          value={totalBookings}
          icon={BookOpen}
          color="text-violet-500"
          bg="bg-violet-500/10"
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={fmtINR(totalRevenue)}
          icon={DollarSign}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          loading={loading}
        />
        <StatCard
          title="KYC Status"
          value={
            kycStatus === "approved" || kycStatus === "active"
              ? "Active"
              : kycStatus === "submitted"
                ? "In Review"
                : kycStatus === "rejected"
                  ? "Rejected"
                  : "Pending"
          }
          icon={
            kycStatus === "approved" || kycStatus === "active"
              ? BadgeCheck
              : kycStatus === "submitted"
                ? Clock
                : FileCheck
          }
          color={
            kycStatus === "approved" || kycStatus === "active"
              ? "text-emerald-500"
              : kycStatus === "rejected"
                ? "text-red-500"
                : "text-amber-500"
          }
          bg={
            kycStatus === "approved" || kycStatus === "active"
              ? "bg-emerald-500/10"
              : kycStatus === "rejected"
                ? "bg-red-500/10"
                : "bg-amber-500/10"
          }
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Book Flight",
            icon: Plane,
            href: "/b2b/flights",
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "My Bookings",
            icon: BookOpen,
            href: "/b2b/bookings",
            color: "text-violet-500",
            bg: "bg-violet-500/10",
          },
          {
            label: "Wallet",
            icon: Wallet,
            href: "/b2b/wallet",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Commission",
            icon: TrendingUp,
            href: "/b2b/commission",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
        ].map(({ label, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                bg,
              )}
            >
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{label}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold font-display">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest wallet activity
              </p>
            </div>
            <Link
              href="/b2b/wallet"
              className="text-xs text-primary hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 bg-muted animate-pulse rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))
            ) : txns.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              txns.slice(0, 5).map((t: any, i) => {
                const isCredit = t.type === "CREDIT" || t.type === "credit";
                return (
                  <div
                    key={t._id || i}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                        isCredit ? "bg-emerald-500/10" : "bg-red-500/10",
                      )}
                    >
                      {isCredit ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.description ||
                          t.category ||
                          (isCredit ? "Credit" : "Debit")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.createdAt
                          ? new Date(t.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isCredit ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {isCredit ? "+" : "-"}₹
                      {(t.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold font-display">Recent Bookings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your latest bookings
              </p>
            </div>
            <Link
              href="/b2b/bookings"
              className="text-xs text-primary hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 bg-muted animate-pulse rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  </div>
                ))
            ) : bookings.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No bookings yet
                </p>
                <Link
                  href="/b2b/flights"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Book your first flight →
                </Link>
              </div>
            ) : (
              bookings.slice(0, 5).map((b: any, i) => {
                const statusColor: Record<string, string> = {
                  confirmed: "bg-emerald-500/10 text-emerald-600",
                  CONFIRMED: "bg-emerald-500/10 text-emerald-600",
                  TICKET_ISSUED: "bg-emerald-500/10 text-emerald-600",
                  pending: "bg-amber-500/10 text-amber-600",
                  PENDING: "bg-amber-500/10 text-amber-600",
                  cancelled: "bg-red-500/10 text-red-500",
                  CANCELLED: "bg-red-500/10 text-red-500",
                };
                return (
                  <div
                    key={b._id || i}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Plane className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.bookingRef || b.id || "Booking"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString("en-IN")
                          : "—"}{" "}
                        · ₹{(b.totalAmount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full capitalize",
                        statusColor[b.status] ||
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {b.status?.toLowerCase() || "pending"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
