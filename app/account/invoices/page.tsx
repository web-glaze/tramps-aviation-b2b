"use client";

/**
 * Invoices page — every confirmed booking made by the agent is treated as
 * one invoice. Shows date, ref, route, customer fare, GST and downloads.
 *
 * Backend has GET /agents/invoice for a date-range summary, but for a
 * line-by-line list we use the existing /bookings/my endpoint and filter
 * to status=confirmed/ticketed/refunded. This avoids a new endpoint while
 * still giving the agent a usable invoices view.
 *
 * Pre-fix: there was NO invoice listing in the B2B portal. Agents had to
 * filter the bookings list manually and there was no PDF/CSV export.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { agentApi, unwrap } from "@/lib/api/services";
import { FileText, Search, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AccountLayout } from "@/components/account/AccountLayout";

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

interface Invoice {
  bookingRef: string;
  date: string;
  type: string;
  route: string;
  customer: string;
  baseFare: number;
  gst: number;
  total: number;
  status: string;
}

function bookingToInvoice(b: any): Invoice {
  const seg = b.segments?.[0] || {};
  const pax = b.passengers?.[0] || {};
  const customerName =
    pax.firstName || pax.lastName
      ? `${pax.firstName || ""} ${pax.lastName || ""}`.trim()
      : b.passengerName || "—";
  const total = b.fare?.customerFare ?? b.totalAmount ?? 0;
  const baseFare = b.fare?.totalFare ?? b.fare?.baseFare ?? total;
  const gst = b.fare?.gstAmount ?? Math.round((total - baseFare) * 100) / 100;
  return {
    bookingRef: b.bookingRef || b.id || "—",
    date: b.createdAt || b.bookingDate,
    type: b.bookingType || b.type || "Flight",
    route:
      seg.origin && seg.destination
        ? `${seg.origin} → ${seg.destination}`
        : "—",
    customer: customerName,
    baseFare,
    gst: gst > 0 ? gst : 0,
    total,
    status: b.status || "confirmed",
  };
}

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await agentApi.getBookings({ limit: 200 });
      const data = unwrap(res) as any;
      const list = data?.bookings || data?.data || [];
      setRows(
        list
          .filter((b: any) =>
            ["confirmed", "ticketed", "refunded"].includes(
              (b.status || "").toLowerCase(),
            ),
          )
          .map(bookingToInvoice),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const blob = [
          r.bookingRef,
          r.customer,
          r.route,
          r.type,
          String(r.total),
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (from && new Date(r.date) < new Date(from)) return false;
      if (to && new Date(r.date) > new Date(to)) return false;
      return true;
    });
  }, [rows, search, from, to]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (s, r) => ({
          base: s.base + r.baseFare,
          gst: s.gst + r.gst,
          total: s.total + r.total,
        }),
        { base: 0, gst: 0, total: 0 },
      ),
    [filtered],
  );

  const downloadCSV = () => {
    const header =
      "Invoice Date,Booking Ref,Type,Route,Customer,Base Fare,GST,Total,Status\n";
    const body = filtered
      .map(
        (r) =>
          `"${fmtDate(r.date)}","${r.bookingRef}","${r.type}","${r.route}","${r.customer}","${r.baseFare}","${r.gst}","${r.total}","${r.status}"`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `invoices-${new Date().toISOString().split("T")[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice list downloaded");
  };

  return (
    <AccountLayout>
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-2xl font-bold font-display">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            One invoice per confirmed booking. Filter, search and export to
            CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={load}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted"
          >
            <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by booking ref, customer, route…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-background text-sm"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-background text-sm"
          aria-label="To date"
        />
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border border-border bg-muted/40">
          <p className="text-xs text-muted-foreground mb-1">Total Base Fare</p>
          <p className="text-lg font-bold">{fmtINR(totals.base)}</p>
        </div>
        <div className="rounded-xl p-4 border border-border bg-muted/40">
          <p className="text-xs text-muted-foreground mb-1">Total GST</p>
          <p className="text-lg font-bold">{fmtINR(totals.gst)}</p>
        </div>
        <div className="rounded-xl p-4 border border-primary/40 bg-primary/5">
          <p className="text-xs text-primary mb-1">Total Invoiced</p>
          <p className="text-lg font-bold text-primary">{fmtINR(totals.total)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {filtered.length} invoice{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No invoices match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Booking</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Route</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Customer</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Base</th>
                  <th className="text-right px-4 py-2.5 font-semibold">GST</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                  <th className="text-right px-4 py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr
                    key={r.bookingRef}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.bookingRef}
                    </td>
                    <td className="px-4 py-3">{r.route}</td>
                    <td className="px-4 py-3">{r.customer}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {fmtINR(r.baseFare)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {fmtINR(r.gst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {fmtINR(r.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/bookings/${r.bookingRef}`}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </AccountLayout>
  );
}
