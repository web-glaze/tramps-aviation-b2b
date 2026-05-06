"use client";
import { useState, useEffect } from "react";
import { agentApi, unwrap } from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { Plane, Hotel, Shield, RefreshCw, Eye, XCircle, Loader2, Search, BookOpen, Star } from "lucide-react";

function BookingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded-xl" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-muted rounded-xl" />
        <div className="h-10 w-48 bg-muted rounded-xl" />
      </div>
      <div className="bg-muted rounded-2xl overflow-hidden">
        <div className="h-12 bg-muted/60 border-b border-border" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded flex-1" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-6 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";
import { toast } from "sonner";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  confirmed:    'bg-emerald-500/10 text-emerald-600',
  CONFIRMED:    'bg-emerald-500/10 text-emerald-600',
  TICKET_ISSUED:'bg-emerald-500/10 text-emerald-600',
  pending:      'bg-amber-500/10 text-amber-600',
  PENDING:      'bg-amber-500/10 text-amber-600',
  PENDING_PAYMENT:'bg-amber-500/10 text-amber-600',
  cancelled:    'bg-red-500/10 text-red-500',
  CANCELLED:    'bg-red-500/10 text-red-500',
  failed:       'bg-red-500/10 text-red-500',
  FAILED:       'bg-red-500/10 text-red-500',
}

export default function B2bBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<any>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [page, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await agentApi.getBookings(params);
      const d = unwrap(res) as any;
      setBookings(Array.isArray(d?.bookings) ? d.bookings : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      setTotal(d?.pagination?.total ?? d?.total ?? 0);
    } catch { setBookings([]) }
    finally { setLoading(false) }
  };

  /**
   * handleCancel — backend `POST /bookings/:bookingRef/cancel` expects the
   * human-readable booking reference (e.g. "TAHP20260504-Z64QRT"), not the
   * Mongo ObjectId. We accept the row-level id (for spinner state) and the
   * bookingRef (for the API call) separately.
   */
  const handleCancel = async (rowId: string, bookingRef?: string) => {
    const ref = bookingRef || rowId;
    if (!ref) {
      toast.error("Could not resolve booking reference");
      return;
    }
    toast.loading("Processing cancellation...");
    setCancelling(rowId);
    try {
      await agentApi.cancelBooking(ref);
      toast.success("Booking cancelled successfully");
      setBookings(prev => prev.map(b => (b._id === rowId || b.id === rowId) ? { ...b, status: 'CANCELLED' } : b));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally { setCancelling(null) }
  };

  // Pre-fix: search only checked bookingRef / pnr / contactName, so an
  // agent looking up "Sandeep Kumar" or "DEL → BOM" or "6E-211" got no
  // matches even though the data was right there in the table. Now we
  // build a single haystack per booking covering ref, PNR, all passenger
  // names, route, airline, flight number, contact email/phone, and the
  // booking date as YYYY-MM-DD.
  const filtered = (() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase().trim();
    return bookings.filter((b: any) => {
      const seg = b.segments?.[0] || {};
      const pax = b.passengers || [];
      const blob = [
        b.bookingRef,
        b.pnr,
        b.contactName,
        b.contactEmail,
        b.contactPhone,
        seg.origin,
        seg.destination,
        seg.airline,
        seg.flightNumber,
        seg.origin && seg.destination ? `${seg.origin} ${seg.destination}` : "",
        ...pax.map((p: any) => `${p.firstName || ""} ${p.lastName || ""}`.trim()),
        b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "",
        String(b.fare?.customerFare ?? b.totalAmount ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">My Bookings</h1>
          <p className="text-sm text-muted-foreground">{total} total bookings</p>
        </div>
        <button onClick={load} className="h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors" disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search by ref, PNR, name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-all placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
          {[
            { key: 'all', label: 'All' },
            { key: 'CONFIRMED', label: 'Confirmed' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'CANCELLED', label: 'Cancelled' },
          ].map(f => (
            <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(1) }}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === f.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4">
            <BookingsSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No bookings found</p>
            <Link href="/flights" className="text-xs text-primary hover:underline mt-2 block">Book a flight →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs">Booking Ref</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Route / Service</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">PNR</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b: any) => {
                  const id = b._id || b.id
                  const isCancelled = b.status === 'CANCELLED' || b.status === 'cancelled'
                  return (
                    <tr key={id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold">{b.bookingRef || id?.slice(-8) || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Plane className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{b.route || b.segments?.[0] ? `${b.segments[0]?.origin} → ${b.segments[0]?.destination}` : b.bookingRef || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{b.pnr || '—'}</td>
                      <td className="px-4 py-3.5 font-semibold">₹{(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', STATUS_COLORS[b.status] || 'bg-muted text-muted-foreground')}>
                          {(b.status || 'pending').toLowerCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link href={`/bookings/${id}`}
                            className="h-7 w-7 rounded-lg flex items-center justify-center border border-border hover:bg-muted transition-colors" title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {(b.status === 'CONFIRMED' || b.status === 'confirmed' || b.status === 'TICKET_ISSUED') && (
                            <button
                              title="Write Review"
                              onClick={() => setReviewBooking({
                                id,
                                bookingRef: b.bookingRef || id,
                                type: 'flight' as const,
                                entityId: b.segments?.[0]?.airline || b.airline || id,
                                entityName: b.segments?.[0]?.airline || b.airline || 'Flight',
                                route: b.segments?.[0] ? `${b.segments[0].origin} → ${b.segments[0].destination}` : b.route,
                              })}
                              className="h-7 w-7 rounded-lg flex items-center justify-center border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors text-amber-600 dark:text-amber-400"
                            >
                              <Star className="h-3.5 w-3.5"/>
                            </button>
                          )}
                          {!isCancelled && (
                            <button onClick={() => handleCancel(id, b.bookingRef)} disabled={cancelling === id}
                              className="h-7 w-7 rounded-lg flex items-center justify-center border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors" title="Cancel">
                              {cancelling === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && !loading && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Showing {((page-1)*15)+1}–{Math.min(page*15, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-50 hover:bg-muted">← Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page * 15 >= total}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-50 hover:bg-muted">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
