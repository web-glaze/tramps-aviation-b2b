"use client";
import { useState, useEffect } from "react";
import { agentApi, unwrap } from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  TrendingUp,
  Plane,
  Hotel,
  Shield,
  RefreshCw,
  Download,
  BarChart3,
  Calendar,
  BookOpen,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  );
}

// ─── Tiny stat card ───────────────────────────────────────────────────────────
function ReportCard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  trend?: number;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <p className="text-2xl font-bold font-display">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {trend !== undefined && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-emerald-500" : "text-red-500",
          )}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(trend).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

// ─── Month row ────────────────────────────────────────────────────────────────
function MonthRow({
  month,
  bookings,
  commission,
  maxCommission,
}: {
  month: string;
  bookings: number;
  commission: number;
  maxCommission: number;
}) {
  const pct = maxCommission > 0 ? (commission / maxCommission) * 100 : 0;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-28 text-sm text-muted-foreground shrink-0">{month}</div>
      <div className="flex-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="text-right shrink-0 w-16">
        <p className="text-xs text-muted-foreground">{bookings} bookings</p>
      </div>
      <div className="text-right shrink-0 w-24">
        <p className="text-sm font-semibold text-emerald-500">
          ₹{commission.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function B2bReportsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Single call: getCommissions now points to /bookings/my?limit=200
      // which gives us everything needed for both commission + booking stats
      const bookingsRes = await agentApi.getCommissions();
      const d = unwrap(bookingsRes) as any;
      const list = Array.isArray(d?.bookings)
        ? d.bookings
        : Array.isArray(d?.data)
        ? d.data
        : Array.isArray(d)
        ? d
        : [];
      setBookings(list);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load reports"));
    } finally {
      setLoading(false);
    }
  };

  // ── Derived stats from bookings ───────────────────────────────────────────
  // commission = agentCommission field on each booking
  const totalCommission = bookings.reduce(
    (s: number, b: any) => s + (b.agentCommission || 0),
    0,
  );
  const releasedCommission = bookings
    .filter((b: any) => b.status === "CONFIRMED" || b.status === "TICKET_ISSUED" || b.status === "confirmed")
    .reduce((s: number, b: any) => s + (b.agentCommission || 0), 0);
  const pendingCommission = bookings
    .filter((b: any) => b.status === "PENDING" || b.status === "pending")
    .reduce((s: number, b: any) => s + (b.agentCommission || 0), 0);
  const totalBookings = bookings.length;

  // ── Monthly rollup from bookings ─────────────────────────────────────────
  const monthMap: Record<string, { bookings: number; commission: number }> = {};
  bookings.forEach((b: any) => {
    if (!b.createdAt) return;
    const d = new Date(b.createdAt);
    const key = d.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    if (!monthMap[key]) monthMap[key] = { bookings: 0, commission: 0 };
    monthMap[key].bookings += 1;
    monthMap[key].commission += b.agentCommission || 0;
  });

  const monthRows = Object.entries(monthMap)
    .sort(([a], [b]) => {
      const da = new Date("1 " + a);
      const db = new Date("1 " + b);
      return db.getTime() - da.getTime();
    })
    .slice(0, 12);

  const maxCommission = Math.max(...monthRows.map(([, v]) => v.commission), 1);

  // ── Current month bookings ────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const thisMonthData = monthMap[thisMonth] || { bookings: 0, commission: 0 };

  // ── Last month for trend ──────────────────────────────────────────────────
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const lastMonthData = monthMap[lastMonth] || { bookings: 0, commission: 0 };
  const commissionTrend =
    lastMonthData.commission > 0
      ? ((thisMonthData.commission - lastMonthData.commission) /
          lastMonthData.commission) *
        100
      : undefined;

  // ── Service breakdown from bookings ───────────────────────────────────────
  const flightBookings = bookings.filter(
    (b: any) => !b.serviceType || b.serviceType === "flight",
  ).length;
  const hotelBookings = bookings.filter(
    (b: any) => b.serviceType === "hotel",
  ).length;
  const insuranceBookings = bookings.filter(
    (b: any) => b.serviceType === "insurance",
  ).length;

  // ── CSV download ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const rows = [
      ["Booking Ref", "Route", "Amount (₹)", "Commission (₹)", "Status", "Date"],
      ...bookings.map((b: any) => [
        b.bookingRef || b._id?.slice(-8) || "",
        b.route ||
          (b.segments?.[0]
            ? `${b.segments[0].origin} → ${b.segments[0].destination}`
            : ""),
        b.totalAmount || 0,
        b.agentCommission || 0,
        b.status || "",
        b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tramps-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  if (loading) return <ReportsSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Commission and booking performance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            className="h-9 px-3 rounded-xl border border-border flex items-center gap-2 text-sm hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Earned"
          value={`₹${totalCommission.toLocaleString("en-IN")}`}
          sub={`₹${releasedCommission.toLocaleString("en-IN")} released`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          trend={commissionTrend}
        />
        <ReportCard
          title="This Month"
          value={`₹${thisMonthData.commission.toLocaleString("en-IN")}`}
          sub={`${thisMonthData.bookings} bookings`}
          icon={Calendar}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <ReportCard
          title="Total Bookings"
          value={String(totalBookings)}
          sub={`${flightBookings} flights, ${hotelBookings} hotels`}
          icon={BookOpen}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
        />
        <ReportCard
          title="Pending Commission"
          value={`₹${pendingCommission.toLocaleString("en-IN")}`}
          sub="Awaiting release"
          icon={Wallet}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
        />
      </div>

      {/* Monthly performance */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Monthly Performance</h2>
          </div>
          <p className="text-xs text-muted-foreground">Last 12 months</p>
        </div>
        {monthRows.length === 0 ? (
          <div className="py-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No booking history yet
            </p>
          </div>
        ) : (
          <div className="px-6 py-4">
            {monthRows.map(([month, data]) => (
              <MonthRow
                key={month}
                month={month}
                bookings={data.bookings}
                commission={data.commission}
                maxCommission={maxCommission}
              />
            ))}
          </div>
        )}
      </div>

      {/* Service breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Flight Bookings",
            count: flightBookings,
            icon: Plane,
            color: "text-primary",
            bg: "bg-primary/10",
            bar: "bg-primary",
          },
          {
            label: "Hotel Bookings",
            count: hotelBookings,
            icon: Hotel,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            bar: "bg-amber-500",
          },
          {
            label: "Insurance",
            count: insuranceBookings,
            icon: Shield,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            bar: "bg-emerald-500",
          },
        ].map((item) => {
          const pct = totalBookings > 0 ? (item.count / totalBookings) * 100 : 0;
          return (
            <div
              key={item.label}
              className="bg-card border border-border rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center",
                      item.bg,
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", item.color)} />
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
                <p className="text-xl font-bold">{item.count}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Share of total</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      item.bar,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent commission records */}
      {bookings.filter((b: any) => b.agentCommission > 0).length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Commission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">
                    Commission ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Booking Ref
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings
                  .filter((b: any) => b.agentCommission > 0)
                  .slice(0, 20)
                  .map((b: any) => (
                  <tr
                    key={b._id || b.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-primary">
                      {b.bookingRef || b._id?.slice(-8) || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {b.pnr || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-500">
                      ₹{(b.agentCommission || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full capitalize",
                          b.status === "CONFIRMED" || b.status === "confirmed" || b.status === "TICKET_ISSUED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : b.status === "PENDING" || b.status === "pending"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {(b.status || "pending").toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
