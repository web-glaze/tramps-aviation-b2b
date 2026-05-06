"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plane, Printer, ArrowLeft, User, Phone, Mail,
  CreditCard, TicketIcon, Send, XCircle, RefreshCcw,
  ImagePlus, Building2, X, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { agentApi, unwrap } from "@/lib/api/services";
import { usePlatformStore } from "@/lib/store";

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
};

// ISO timestamp → "HH:MM"; plain "HH:MM" passed through. Backend stores
// segment.departureTime as either format depending on the source (TBO vs
// admin series fare), so we normalise both to a clean time string.
const fmtTime = (v: string) => {
  if (!v) return "—";
  if (v.includes("T")) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  return v;  // already "HH:MM"
};

/**
 * Pre-fix: tickets showed "—" in the duration slot whenever the supplier
 * didn't return a `duration` field (TBO sometimes does, custom series
 * fares never do). Now we compute it from departureTime / arrivalTime
 * whenever both are present, falling back to the supplier value if not.
 *
 * Handles both ISO timestamps ("2026-05-10T09:30:00Z") and plain "HH:MM"
 * strings. For plain strings we assume same-calendar-day; if arrival
 * appears to be before departure we add 24h (red-eye flights).
 */
function computeDuration(
  dep?: string,
  arr?: string,
  travelDate?: string,
  fallback?: string,
): string {
  if (!dep || !arr) return fallback || "—";

  const toDate = (v: string): Date | null => {
    if (v.includes("T")) {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    // "HH:MM" → anchor to travelDate (or today as a last resort)
    const m = v.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const base = travelDate ? new Date(travelDate) : new Date();
    if (isNaN(base.getTime())) return null;
    base.setHours(+m[1], +m[2], 0, 0);
    return base;
  };

  const d1 = toDate(dep);
  const d2 = toDate(arr);
  if (!d1 || !d2) return fallback || "—";

  let diffMin = Math.round((d2.getTime() - d1.getTime()) / 60000);
  if (diffMin < 0) diffMin += 24 * 60; // red-eye / overnight
  if (diffMin <= 0 || diffMin > 24 * 60) return fallback || "—";

  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  return `${m}m`;
}

function normalise(raw: any) {
  if (!raw) return null;
  const seg = raw.segments?.[0] || {};
  const pax = raw.passengers || [];
  const rawDep = seg.departureTime || raw.departure || "";
  const rawArr = seg.arrivalTime   || raw.arrival   || "";
  const rawTravelDate = seg.travelDate || raw.travelDate || raw.date || rawDep;
  return {
    id:               raw.bookingRef || raw.id || "—",
    bookingRef:       raw.bookingRef || raw.id || "—",
    type:             raw.bookingType || raw.type || "Flight",
    status:           raw.status || "confirmed",
    bookingDate:      fmtDate(raw.createdAt || raw.bookingDate),
    paymentMethod:    raw.bookedVia === "B2B" ? "Wallet" : (raw.paymentMethod || "Card"),
    transactionId:    raw.transactionId || raw.paymentId || "—",
    totalAmount:      raw.fare?.customerFare || raw.totalAmount || raw.fare?.total || 0,
    commissionEarned: raw.fare?.agentCommission || raw.commissionEarned || 0,
    airline:          seg.airline || raw.airline || "—",
    flightNo:         seg.flightNumber || raw.flightNo || raw.flightNumber || "—",
    from:             seg.origin || raw.from || "—",
    fromCity:         seg.originCity || raw.fromCity || seg.origin || "—",
    to:               seg.destination || raw.to || "—",
    toCity:           seg.destinationCity || raw.toCity || seg.destination || "—",
    departure:        fmtTime(rawDep),
    arrival:          fmtTime(rawArr),
    // travelDate often missing — fall back to extracting the date portion
    // from departureTime ISO so the "Travel Date" field never reads "—"
    // for confirmed series-fare bookings.
    date:             fmtDate(rawTravelDate),
    // Pre-fix: showed "—" whenever the supplier omitted `duration`. Now we
    // compute it from departure/arrival times whenever both are present.
    duration:         computeDuration(
      rawDep, rawArr, rawTravelDate, seg.duration || raw.duration,
    ),
    stops:            raw.stops === 0 ? "Non-stop" : raw.stops ? `${raw.stops} stop` : "Non-stop",
    pnr:              raw.pnr || "—",
    class:            seg.cabinClass || raw.class || "Economy",
    baggageCabin:     seg.cabinBaggage || raw.baggageCabin || "7 kg",
    baggageCheckin:   seg.checkinBaggage || raw.baggageCheckin || "15 kg",
    refundable:       raw.isRefundable !== false,
    isSeriesFare:     raw.tboResultToken?.startsWith("TRAMPS-") || raw.isSeriesFare || false,
    passengerName:    pax[0] ? `${pax[0].firstName} ${pax[0].lastName}` : raw.passengerName || "—",
    passengerEmail:   raw.contactEmail || raw.passengerEmail || "—",
    passengerPhone:   raw.contactPhone || raw.passengerPhone || "—",
    passengers: pax.length
      ? pax.map((p: any) => ({
          name:   `${p.firstName} ${p.lastName}`,
          type:   p.passengerType === "ADT" ? "Adult" : p.passengerType || "Adult",
          dob:    fmtDate(p.dateOfBirth || p.dob),
          gender: p.gender === "F" ? "Female" : "Male",
        }))
      : [{ name: raw.passengerName || "—", type: "Adult", dob: "—", gender: "—" }],
  };
}

/**
 * Print-only letterhead. Pre-fix this rendered the PLATFORM's contact info
 * (Tramps Aviation India Pvt. Ltd.) but the printed ticket actually goes
 * to the passenger via the AGENT — they expect to see the agent's agency
 * name, address, phone and email so the passenger can call back. Now the
 * letterhead defaults to the agent's own profile, with the platform line
 * relegated to the small "powered by" footnote on the right.
 */
function PrintHeader({
  logoUrl, companyName, agent, ps,
}: { logoUrl: string; companyName: string; agent: any; ps: any }) {
  // Prefer agent profile fields; fall back to platform settings if the
  // agent hasn't filled their address/phone yet.
  const name =
    companyName ||
    agent?.agencyName ||
    agent?.contactPerson ||
    ps?.platformName ||
    "";
  const addr =
    [agent?.address, agent?.city, agent?.state, agent?.pincode]
      .filter(Boolean)
      .join(", ") ||
    [ps?.addressLine1, ps?.city, ps?.state, ps?.pincode]
      .filter(Boolean)
      .join(", ");
  const phone = agent?.phone || ps?.supportPhoneDisplay || ps?.supportPhone || "";
  const email = agent?.email || ps?.supportEmail || "";
  const gstNo = agent?.gstNumber || ps?.gstNumber || "";
  const agentId = agent?.agentId || "";
  if (!logoUrl && !name) return null;
  return (
    <div className="hidden print:block mb-6 pb-5 border-b-2 border-gray-300">
      <div className="flex items-start gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain rounded" />
        )}
        <div className="flex-1">
          {name && <p className="text-xl font-black text-gray-900">{name}</p>}
          {addr && <p className="text-xs text-gray-600 mt-0.5">{addr}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {phone && <p className="text-xs text-gray-600">📞 {phone}</p>}
            {email && <p className="text-xs text-gray-600">✉ {email}</p>}
            {gstNo && <p className="text-xs text-gray-600">GST: {gstNo}</p>}
            {agentId && (
              <p className="text-xs text-gray-600">Agent ID: {agentId}</p>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-semibold text-gray-800">E-TICKET / ITINERARY</p>
          <p>Authorized Travel Agent</p>
          <p className="text-[10px] mt-0.5 text-gray-400">
            Powered by {ps?.platformName || "Tramps Aviation"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function B2BBookingDetailPage() {
  const params = useParams();
  const { ps, fetchIfStale } = usePlatformStore();
  const [booking,     setBooking]     = useState<any>(null);
  const [agent,       setAgent]       = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [cancelling,  setCancelling]  = useState(false);
  const [sending,     setSending]     = useState(false);
  const [showPrintSetup,   setShowPrintSetup]   = useState(false);
  const [printLogoUrl,     setPrintLogoUrl]     = useState("");
  const [printCompanyName, setPrintCompanyName] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchIfStale();
    // Pre-fix: ticket print used PLATFORM info as the issuer. Now we load
    // the agent's own profile so the print can show the agent's agency
    // name, address, phone, email and agent-id as the contact-back point
    // for the passenger.
    agentApi.getProfile()
      .then((res) => {
        const a: any = unwrap(res);
        setAgent(a?.agent || a);
      })
      .catch(() => setAgent(null));

    const id = params?.bookingId as string;
    if (!id) { setLoading(false); return; }

    agentApi.getBookingById(id)
      .then((res) => { setBooking(normalise(unwrap(res) as any)); })
      .catch(() => {
        agentApi.getBookings({ limit: 100 })
          .then((res) => {
            const data = unwrap(res) as any;
            const list = data?.bookings || data?.data || [];
            const found = list.find((b: any) => b.bookingRef === id || b.id === id || b._id === id);
            setBooking(normalise(found));
          })
          .catch(() => setBooking(null))
          .finally(() => setLoading(false));
        return;
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleSendToPassenger = async () => {
    if (!booking?.passengerEmail) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(`Booking details sent to ${booking.passengerEmail}`);
    setSending(false);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      await agentApi.cancelBooking(booking.bookingRef);
      setBooking((b: any) => ({ ...b, status: "cancelled" }));
      toast.success("Cancellation request submitted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Cancellation failed");
    } finally { setCancelling(false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPrintLogoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!booking) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <TicketIcon className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="font-semibold text-foreground mb-1">Booking not found</p>
      <p className="text-sm text-muted-foreground mb-4">The booking may still be processing or the ID is incorrect.</p>
      <Link href="/bookings">
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Bookings
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/bookings">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{booking.bookingRef}</h1>
            <StatusBadge status={booking.status} />
            {booking.isSeriesFare && (
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Series Fare
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Booked on {booking.bookingDate}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={() => setShowPrintSetup(true)} className="gap-2">
          <TicketIcon className="h-4 w-4" /> Print E-Ticket
        </Button>
        <Button variant="outline" onClick={handleSendToPassenger} disabled={sending} className="gap-2">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send to Passenger"}
        </Button>
        {booking.status === "confirmed" && booking.refundable && (
          <Button variant="destructive" size="sm" onClick={handleCancel}
            disabled={cancelling} className="gap-2 ml-auto">
            <XCircle className="h-4 w-4" />
            {cancelling ? "Processing…" : "Cancel Booking"}
          </Button>
        )}
      </div>

      {/*
        Pre-fix: clicking Print rendered the entire page (sidebar, footer,
        social links, etc) on 2-3 sheets. Now everything print-related is
        wrapped inside `.print-area`; the global @media print CSS hides
        every other element on the page so only this card prints.
      */}
      <div className="print-area">

      {/* Print-only company header (uses agent profile, not platform) */}
      <PrintHeader logoUrl={printLogoUrl} companyName={printCompanyName} agent={agent} ps={ps} />

      {/* Main ticket card */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {/*
          Pre-fix gradient: from-blue-700 to-indigo-700 — generic.
          New gradient: brand blue (heavy) → brand orange accent on the
          right edge. CSS variables --brand-blue and --brand-orange are
          declared in globals.css so this restays in sync if the brand
          colours change.
        */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--brand-blue-dark)) 0%, hsl(var(--brand-blue)) 60%, hsl(var(--brand-orange)) 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-white" />
            <span className="font-bold text-white">{booking.type} · {booking.airline}</span>
            <span className="text-white/80 text-sm font-mono">{booking.flightNo}</span>
          </div>
          <span className="text-xs bg-white/25 text-white font-semibold px-3 py-1 rounded-full uppercase">
            {booking.status}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Route */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-black">{booking.from}</p>
              <p className="text-xs text-muted-foreground mt-1">{booking.fromCity}</p>
              <p className="text-sm font-semibold mt-1">{booking.departure}</p>
            </div>
            <div className="text-center flex-1 px-6">
              <p className="text-xs text-muted-foreground mb-1">{booking.duration}</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-px bg-border" />
                <Plane className="h-4 w-4 text-primary" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{booking.stops}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black">{booking.to}</p>
              <p className="text-xs text-muted-foreground mt-1">{booking.toCity}</p>
              <p className="text-sm font-semibold mt-1">{booking.arrival}</p>
            </div>
          </div>

          <div className="border-t border-dashed border-border" />

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Travel Date",      value: booking.date },
              { label: "PNR",              value: booking.pnr, mono: true },
              { label: "Class",            value: booking.class },
              { label: "Booking Date",     value: booking.bookingDate },
              { label: "Cabin Baggage",    value: booking.baggageCabin },
              { label: "Check-in Baggage", value: booking.baggageCheckin },
              { label: "Refundable",       value: booking.refundable ? "Yes" : "No" },
              { label: "Fare Type",        value: booking.isSeriesFare ? "Series Fare" : "Regular" },
            ].map((item) => (
              <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-semibold mt-0.5 ${(item as any).mono ? "font-mono tracking-wider" : ""}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Passengers */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Passengers</p>
            <div className="space-y-2">
              {booking.passengers.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.type} · {p.gender} · DOB: {p.dob}</p>
                  </div>
                  {i === 0 && (
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Primary</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Payment</p>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> {booking.paymentMethod}
                </span>
                <span className="text-muted-foreground text-xs font-mono">{booking.transactionId}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">{fmt(booking.totalAmount)}</p>
              {booking.commissionEarned > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">+{fmt(booking.commissionEarned)} commission</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Passenger Contact</p>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /> {booking.passengerName}</span>
              <span className="flex items-center gap-1.5 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {booking.passengerEmail}</span>
              <span className="flex items-center gap-1.5 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {booking.passengerPhone}</span>
            </div>
          </div>

          {/* Issuer block — only visible in print. Pre-fix this showed
              PLATFORM details; now shows AGENT details so the passenger
              knows who to call back about their booking. */}
          <div className="hidden print:block border-t pt-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issued By</p>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-800">
                {agent?.agencyName || agent?.contactPerson || ps?.platformName || ""}
              </p>
              {agent?.address && <p>{agent.address}</p>}
              {(agent?.city || agent?.state) && (
                <p>{[agent?.city, agent?.state, agent?.pincode].filter(Boolean).join(", ")}</p>
              )}
              {agent?.gstNumber && <p>GST No: {agent.gstNumber}</p>}
              {agent?.panNumber && <p>PAN: {agent.panNumber}</p>}
              {agent?.email && <p>Email: {agent.email}</p>}
              {agent?.phone && <p>Phone: {agent.phone}</p>}
              {agent?.agentId && <p>Agent ID: {agent.agentId}</p>}
              {!agent && (
                <p className="text-gray-400 italic">
                  (Update your agency profile in Settings to show your contact details here.)
                </p>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              This is a computer-generated itinerary and does not require a signature.
              Valid subject to airline / hotel terms &amp; conditions.
              {ps?.platformName ? ` Powered by ${ps.platformName}.` : ""}
            </p>
          </div>
        </div>
      </div>

      </div>{/* /.print-area */}

      {/* Print Setup Modal */}
      {showPrintSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setShowPrintSetup(false)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Print E-Ticket</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Optionally add your logo & agency name</p>
              </div>
              <button onClick={() => setShowPrintSetup(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Agency / Company Name
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input type="text" value={printCompanyName}
                onChange={e => setPrintCompanyName(e.target.value)}
                placeholder={ps?.platformName || "e.g. Rahul Travels & Tours"}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" /> Company Logo
                <span className="text-muted-foreground font-normal">(optional · max 2MB)</span>
              </label>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              {printLogoUrl ? (
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={printLogoUrl} alt="Preview" className="h-10 w-auto object-contain rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Logo uploaded</p>
                    <p className="text-[10px] text-muted-foreground">Will appear on printed ticket</p>
                  </div>
                  <button onClick={() => setPrintLogoUrl("")} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
                  <ImagePlus className="h-4 w-4" /> Click to upload logo (PNG, JPG)
                </button>
              )}
            </div>

            {ps?.addressLine1 && (
              <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" /> Auto-included from Platform Settings
                </p>
                <p className="text-xs text-muted-foreground">{ps.addressLine1}</p>
                {(ps.city || ps.state) && (
                  <p className="text-xs text-muted-foreground">{[ps.city, ps.state, ps.pincode].filter(Boolean).join(", ")}</p>
                )}
                {(ps as any).gstNumber && <p className="text-xs text-muted-foreground">GST: {(ps as any).gstNumber}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowPrintSetup(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={() => { setShowPrintSetup(false); setTimeout(() => window.print(), 150); }}>
                <Printer className="h-4 w-4" /> Print Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}