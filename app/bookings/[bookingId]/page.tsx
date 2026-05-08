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
import { useAgentBranding } from "@/lib/hooks/useAgentBranding";

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * shadeHex — lighten or darken a hex colour by a percent amount.
 *   shadeHex('#208dcb', -20)  → darker
 *   shadeHex('#208dcb',  20)  → lighter
 * Used to derive gradient end-points from the agent's single brand
 * colour so the ticket header still has visual depth without forcing
 * the agent to specify multiple shades on the /branding page.
 */
function shadeHex(hex: string, percent: number): string {
  const m = (hex || "").trim().replace(/^#/, "");
  const full =
    m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (full.length !== 6) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const adjust = (c: number) => {
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    return Math.round((t - c) * p + c);
  };
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
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
  logoUrl, companyName, agent, ps, branding,
}: {
  logoUrl: string;
  companyName: string;
  agent: any;
  ps: any;
  /** White-label branding from /branding settings page; takes precedence
   *  over agent profile fields when active. */
  branding?: {
    logoUrl?: string;
    agencyName?: string;
    supportPhone?: string;
    supportEmail?: string;
    primaryColor?: string;
    websiteUrl?: string;
    taglineText?: string;
    isActive?: boolean;
  };
}) {
  // Treat "saved" as "use it". The active toggle is for customer-facing
  // surfaces only — the agent's own ticket print should respect whatever
  // they typed at /branding regardless of toggle state.
  const wl =
    branding &&
    (branding.logoUrl ||
      branding.agencyName ||
      branding.supportPhone ||
      branding.supportEmail)
      ? branding
      : null;

  // Resolution order:
  //   per-booking override → white-label settings → agent profile → platform default
  const name =
    companyName ||
    wl?.agencyName ||
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
  const phone =
    wl?.supportPhone || agent?.phone || ps?.supportPhoneDisplay || ps?.supportPhone || "";
  const email = wl?.supportEmail || agent?.email || ps?.supportEmail || "";
  const website = wl?.websiteUrl || "";
  const tagline = wl?.taglineText || "";
  const accent = wl?.primaryColor || "#208dcb";
  const gstNo = agent?.gstNumber || ps?.gstNumber || "";
  const agentId = agent?.agentId || "";
  if (!logoUrl && !name) return null;
  return (
    <div
      className="hidden print:block mb-6 pb-5 border-b-2"
      style={{ borderColor: accent }}
    >
      <div className="flex items-start gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain rounded" />
        )}
        <div className="flex-1">
          {name && (
            <p
              className="text-xl font-black"
              style={{ color: accent }}
            >
              {name}
            </p>
          )}
          {tagline && (
            <p className="text-[11px] italic text-gray-500 -mt-0.5">{tagline}</p>
          )}
          {addr && <p className="text-xs text-gray-600 mt-0.5">{addr}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {phone && <p className="text-xs text-gray-600">📞 {phone}</p>}
            {email && <p className="text-xs text-gray-600">✉ {email}</p>}
            {website && <p className="text-xs text-gray-600">🌐 {website}</p>}
            {gstNo && <p className="text-xs text-gray-600">GST: {gstNo}</p>}
            {agentId && (
              <p className="text-xs text-gray-600">Agent ID: {agentId}</p>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-semibold" style={{ color: accent }}>
            E-TICKET / ITINERARY
          </p>
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
  const { branding, loaded: brandingLoaded } = useAgentBranding();
  const [booking,     setBooking]     = useState<any>(null);
  const [agent,       setAgent]       = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [cancelling,  setCancelling]  = useState(false);
  const [sending,     setSending]     = useState(false);
  const [showPrintSetup,   setShowPrintSetup]   = useState(false);
  const [printLogoUrl,     setPrintLogoUrl]     = useState("");
  const [printCompanyName, setPrintCompanyName] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Auto-apply white-label branding from /branding settings.
  // Per-booking override still works — agent can edit in the print modal
  // without changing the saved default.
  //
  // Pre-fix: gated on `branding.isActive`, so agents who filled the form
  // but didn't flip the toggle saw blank logo / company on every print.
  // Now: as long as branding is saved (any field), we apply it. The
  // toggle only controls customer-facing surfaces, not the agent's own
  // ticket prints.
  useEffect(() => {
    if (!brandingLoaded) return;
    if (!printLogoUrl && branding.logoUrl) setPrintLogoUrl(branding.logoUrl);
    if (!printCompanyName && branding.agencyName)
      setPrintCompanyName(branding.agencyName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandingLoaded, branding.logoUrl, branding.agencyName]);

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

  // ── Send (resend) the e-ticket to the passenger ──────────────────
  // Pre-fix: this was a fake placeholder that just waited 1s and showed
  // a success toast — no email was ever sent. Agents thought re-sending
  // worked when nothing was actually happening.
  //
  // Now: hits POST /bookings/:bookingRef/resend-email which re-sends
  // the same branded confirmation email via the email service. The
  // backend enforces a 60s cooldown per booking (anti-spam) and returns
  // a 400 with a clear message if hit, so we surface that to the agent.
  const handleSendToPassenger = async () => {
    if (!booking?.bookingRef) return;
    if (!booking?.passengerEmail) {
      toast.error("This booking has no passenger email on file.");
      return;
    }
    setSending(true);
    try {
      const res = await agentApi.resendBookingEmail(booking.bookingRef);
      const data = unwrap(res) as any;
      const sentTo = data?.sentTo || booking.passengerEmail;
      toast.success(`E-ticket re-sent to ${sentTo}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not send e-ticket. Please try again.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
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

  // ── Brand accent for the ticket header ─────────────────────────────
  // When the agent has saved a primary colour on /branding, derive a
  // dark→light gradient from it so the ticket reflects their brand. Else
  // fall back to the platform's blue → orange palette.
  const brandPrimary =
    branding?.primaryColor && /^#[0-9a-f]{3,8}$/i.test(branding.primaryColor)
      ? branding.primaryColor
      : "";
  const brandedGradient = brandPrimary
    ? `linear-gradient(90deg, ${shadeHex(brandPrimary, -22)} 0%, ${brandPrimary} 60%, ${shadeHex(brandPrimary, 18)} 100%)`
    : "linear-gradient(90deg, hsl(var(--brand-blue-dark)) 0%, hsl(var(--brand-blue)) 60%, hsl(var(--brand-orange)) 100%)";

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

      {/* Action bar
       *
       * Pre-fix: every "Print E-Ticket" click opened the upload modal —
       * even when the agent had configured their white-label branding.
       * Then we gated on `branding.isActive`, but agents fill the form
       * without flipping the toggle and still got the popup.
       *
       * Now: if the agent has *any* branding data saved (agency name,
       * logo, support phone — anything), we skip the modal and print
       * directly. The PrintHeader auto-applies whatever's saved. The
       * `isActive` toggle only controls customer-facing usage; for the
       * agent's own ticket print, "filled" is enough.
       *
       * Modal only shows for genuinely-empty branding (brand new agent
       * who hasn't visited /branding yet) OR when the agent explicitly
       * wants to override for a single print.
       */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          onClick={() => {
            const hasAnyBranding =
              branding?.logoUrl ||
              branding?.agencyName ||
              branding?.supportPhone ||
              branding?.supportEmail;
            if (hasAnyBranding) {
              // ── Theme lock around window.print() ────────────────────
              // Chromium can re-evaluate the document's colour scheme
              // when the print preview opens AND when it closes. On
              // some setups that flips a light-mode page to dark and
              // leaves it that way after the dialog dismisses.
              //
              // We do three things in order:
              //   1. Snapshot the current `dark` class state so we can
              //      restore exactly what the agent had.
              //   2. Force the document into a light render — strip the
              //      `.dark` class AND set `color-scheme: light` inline
              //      so the print preview can't override it.
              //   3. On afterprint, restore the original state.
              //
              // We also guard with a setTimeout fallback because some
              // browsers don't fire `afterprint` reliably (rare, but
              // cheap to be safe).
              const root = document.documentElement;
              const wasDark = root.classList.contains("dark");
              const prevColorScheme = root.style.colorScheme;
              root.classList.remove("dark");
              root.style.colorScheme = "light";

              let restored = false;
              const restore = () => {
                if (restored) return;
                restored = true;
                if (wasDark) root.classList.add("dark");
                else root.classList.remove("dark");
                root.style.colorScheme = prevColorScheme || "";
                window.removeEventListener("afterprint", restore);
              };
              window.addEventListener("afterprint", restore);
              // Safety net: if afterprint doesn't fire within 60s, force
              // restore so the agent isn't stuck in a forced-light page.
              setTimeout(restore, 60_000);

              // Direct print — branding auto-applies via PrintHeader
              window.print();
            } else {
              // First-time / unconfigured agent — show the upload modal
              setShowPrintSetup(true);
            }
          }}
          className="gap-2"
        >
          <TicketIcon className="h-4 w-4" /> Print E-Ticket
        </Button>
        {(branding?.logoUrl ||
          branding?.agencyName ||
          branding?.supportPhone) && (
          <Button
            variant="outline"
            onClick={() => setShowPrintSetup(true)}
            className="gap-2 text-xs"
            size="sm"
            title="Override branding for this ticket only"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Customize for this print
          </Button>
        )}
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
      <PrintHeader logoUrl={printLogoUrl} companyName={printCompanyName} agent={agent} ps={ps} branding={branding} />

      {/* Main ticket card — header gradient is driven by the agent's
          brand primary colour when /branding is configured (see
          `brandedGradient` above), so the on-screen ticket matches the
          colour scheme the agent expects from the live preview.

          The whole ticket card is forced to a LIGHT palette via inline
          styles. A printed ticket should look like a printed ticket on
          screen too — not flip to dark-mode card styles when the agent
          is in dark theme. The print-area header / footer chrome around
          the card still respects the theme; only the card itself is
          locked. */}
      <div
        className="border rounded-2xl overflow-hidden shadow-sm"
        style={{
          backgroundColor: "#ffffff",
          color: "#0f172a",
          colorScheme: "light",
        }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: brandedGradient,
            // Force the browser to actually render the gradient on paper
            // instead of stripping it for "save toner" mode. Without
            // these two declarations the printed ticket header comes
            // out plain white, which defeats the whole point of the
            // agency-coloured strip.
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Agency logo when set on /branding — gives the on-screen
                ticket the same look as the printed PDF. Falls back to
                a Plane icon when no logo is uploaded so the header
                doesn't look empty for unbranded agents. */}
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt={branding.agencyName || "Agency"}
                className="h-9 w-9 object-contain rounded bg-white/95 p-1 shrink-0"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />
            ) : (
              <Plane className="h-5 w-5 text-white shrink-0" />
            )}
            {/* When the agent has saved an agency name, surface it here so
                the on-screen header matches the printed/emailed ticket.
                Falls back to "b2b" so unbranded agents see the same label
                they did before. */}
            <span className="font-bold text-white truncate">
              {(branding?.agencyName || booking.type)} · {booking.airline}
            </span>
            <span className="text-white/80 text-sm font-mono shrink-0">{booking.flightNo}</span>
          </div>
          <span className="text-xs bg-white/25 text-white font-semibold px-3 py-1 rounded-full uppercase shrink-0">
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
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={
                      brandPrimary
                        ? { backgroundColor: `${brandPrimary}1A` /* ~10% alpha */ }
                        : undefined
                    }
                  >
                    <User
                      className={brandPrimary ? "h-4 w-4" : "h-4 w-4 text-primary"}
                      style={brandPrimary ? { color: brandPrimary } : undefined}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.type} · {p.gender} · DOB: {p.dob}</p>
                  </div>
                  {i === 0 && (
                    <span
                      className={
                        brandPrimary
                          ? "text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          : "text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold"
                      }
                      style={
                        brandPrimary
                          ? {
                              backgroundColor: `${brandPrimary}1A`,
                              color: brandPrimary,
                            }
                          : undefined
                      }
                    >
                      Primary
                    </span>
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
              PLATFORM details; then AGENT details. Now we prefer the
              agent's white-label /branding fields (agency name, phone,
              email, website, tagline) over the registration-time agent
              profile so the printed footer matches the on-screen
              header and the live preview on /branding. The accent
              border + colour come from branding.primaryColor too. */}
          <div
            className="hidden print:block border-t-2 pt-4 mt-4"
            style={{ borderColor: brandPrimary || "#208dcb" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: brandPrimary || "#208dcb" }}
            >
              Issued By
            </p>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-800">
                {branding?.agencyName ||
                  agent?.agencyName ||
                  agent?.contactPerson ||
                  ps?.platformName ||
                  ""}
              </p>
              {branding?.taglineText && (
                <p className="italic text-gray-500">{branding.taglineText}</p>
              )}
              {agent?.address && <p>{agent.address}</p>}
              {(agent?.city || agent?.state) && (
                <p>{[agent?.city, agent?.state, agent?.pincode].filter(Boolean).join(", ")}</p>
              )}
              {agent?.gstNumber && <p>GST No: {agent.gstNumber}</p>}
              {agent?.panNumber && <p>PAN: {agent.panNumber}</p>}
              {(branding?.supportEmail || agent?.email) && (
                <p>Email: {branding?.supportEmail || agent?.email}</p>
              )}
              {(branding?.supportPhone || agent?.phone) && (
                <p>Phone: {branding?.supportPhone || agent?.phone}</p>
              )}
              {branding?.websiteUrl && <p>Website: {branding.websiteUrl}</p>}
              {agent?.agentId && <p>Agent ID: {agent.agentId}</p>}
              {!agent && !branding?.agencyName && (
                <p className="text-gray-400 italic">
                  (Update your branding in /branding to show your contact details here.)
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
                <h3 className="font-bold text-foreground">
                  {branding.isActive && (branding.logoUrl || branding.agencyName)
                    ? "Override branding for this ticket"
                    : "Print E-Ticket"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {branding.isActive && (branding.logoUrl || branding.agencyName)
                    ? "Changes apply only to this print — your saved defaults aren't touched."
                    : "Optionally add your logo & agency name. Save defaults at /branding to skip this step in future."}
                </p>
              </div>
              <button onClick={() => setShowPrintSetup(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* When branding is active, show a hint with link to edit defaults */}
            {branding.isActive && (branding.logoUrl || branding.agencyName) && (
              <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  This ticket will use your white-label branding by default.
                  Edit the defaults at{" "}
                  <Link
                    href="/branding"
                    className="font-bold underline hover:text-emerald-800"
                  >
                    /branding
                  </Link>
                  , or override just for this ticket below.
                </div>
              </div>
            )}

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