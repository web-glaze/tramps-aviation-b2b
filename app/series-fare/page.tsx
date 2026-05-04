"use client";

/**
 * app/series-fare/page.tsx — Tramps Aviation Exclusive Series Fares
 * ────────────────────────────────────────────────────────────────────
 * Displays Tramps Aviation's exclusive contracted/series fares.
 * These are cheaper fares negotiated directly with airlines.
 * B2B agents get commission breakdown on each fare.
 *
 * Reused by B2B via: app/b2b/series-fare/page.tsx → dynamic(() => import("../../series-fare/page"))
 */

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  Search,
  Tag,
  Clock,
  Luggage,
  ArrowRight,
  RefreshCw,
  Star,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Sparkles,
  Calendar,
  Users,
  Filter,
  X,
  Check,
  BadgePercent,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchApi, unwrap } from "@/lib/api/services";
import { usePlatformStore } from "@/lib/store";
import { getErrorMessage } from "@/lib/utils/errors";
import { toast } from "sonner";
import { MarkupBanner } from "@/components/shared/MarkupBanner";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { useSearchParams } from "next/navigation";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { SeriesFareBookingDialog } from "@/components/booking/SeriesFareBookingDialog";
import { useAuthStore } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SeriesFare {
  // Backend's `seriesFareToFlight` returns the row with `id` (string), and
  // sometimes `_id` carries through too. Always prefer `resultToken` when
  // sending the fare back to the booking endpoint — that string is already
  // `TRAMPS-<id>` and never mismatches.
  _id?: string;
  id?: string;
  resultToken?: string;
  airline: string;
  airlineCode?: string;
  flightNo: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  fare: {
    baseFare: number;
    taxes: number;
    totalFare: number;
    currency?: string;
  };
  agentCommission?: number;
  commissionPercent?: number;
  checkinBaggage?: string;
  cabinBaggage?: string;
  refundable?: boolean;
  seatsLeft?: number;
  cabinClass?: string;
  validFrom?: string;
  validTill?: string;
  source?: string;
  // RoundTrip fields populated by backend when tripType=RoundTrip
  tripType?: "OneWay" | "RoundTrip";
  returnDate?: string;
  returnFlight?: {
    airline?: string;
    flightNo?: string;
    departure?: string;
    arrival?: string;
    duration?: string;
    stops?: number;
    price?: number;
    fare?: { totalFare?: number };
  } | null;
  combinedPrice?: number;
}

interface SearchForm {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departureDate: string;
  returnDate: string;
  tripType: "OneWay" | "RoundTrip";
  adults: number;
}

// ─── Airport list (fallback when TBO airport API is unavailable) ──────────────
const AIRPORTS = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International" },
  { code: "BLR", city: "Bangalore", name: "Kempegowda International" },
  { code: "MAA", city: "Chennai", name: "Chennai International" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose International" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International" },
  { code: "COK", city: "Kochi", name: "Cochin International" },
  { code: "GOI", city: "Goa", name: "Goa International" },
  { code: "PNQ", city: "Pune", name: "Pune Airport" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel International" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh International" },
  { code: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee International" },
  { code: "DXB", city: "Dubai", name: "Dubai International" },
  { code: "SIN", city: "Singapore", name: "Singapore Changi" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International" },
  { code: "LHR", city: "London", name: "London Heathrow" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International" },
  { code: "AUH", city: "Abu Dhabi", name: "Abu Dhabi International" },
  { code: "DOH", city: "Doha", name: "Hamad International" },
  { code: "KWI", city: "Kuwait", name: "Kuwait International" },
  { code: "MCT", city: "Muscat", name: "Muscat International" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International" },
];

const todayISO = () => new Date().toISOString().split("T")[0];
const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// ─── Airport Input — dynamic autocomplete via backend `/flights/airports` ────
// Falls back to the local AIRPORTS list if the API is unreachable so the form
// still works offline / on a cold backend.
function AirportInput({
  value,
  label,
  placeholder,
  onChange,
  onSelect,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (v: string) => void;
  onSelect: (a: { code: string; city: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<
    { code: string; city: string; name: string }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced remote lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.searchAirports(q, 8);
        const d = unwrap(res) as any;
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setRemoteResults(list);
      } catch {
        // Network error — let local filter take over silently
        setRemoteResults([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Combined results: prefer remote (fresh), fallback to local
  const filtered = useMemo(() => {
    if (remoteResults.length > 0) return remoteResults.slice(0, 8);
    const q = value.toLowerCase();
    if (!q) return AIRPORTS.slice(0, 7);
    return AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    ).slice(0, 7);
  }, [value, remoteResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map((a) => (
            <button
              key={a.code}
              type="button"
              onMouseDown={() => {
                onSelect(a);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
            >
              <span className="font-mono text-xs font-bold text-primary w-10">
                {a.code}
              </span>
              <div>
                <p className="text-sm font-medium">{a.city}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {a.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar filter primitives ────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterRadio({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left",
        active
          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
      {children}
    </button>
  );
}

// ─── Airline initial badge — coloured square w/ 2-letter code ─────────────────
const AIRLINE_BG: Record<string, string> = {
  IndiGo:    "bg-indigo-600",
  "Air India": "bg-red-600",
  SpiceJet:  "bg-orange-500",
  Vistara:   "bg-purple-600",
  GoFirst:   "bg-sky-500",
  AirAsia:   "bg-red-700",
};

function AirlineBadge({ name, code }: { name: string; code?: string }) {
  const initials = (code || name || "").slice(0, 2).toUpperCase();
  const bg = AIRLINE_BG[name] || "bg-primary";
  return (
    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0", bg)}>
      {initials}
    </div>
  );
}

// ─── Fare Card ────────────────────────────────────────────────────────────────
function FareCard({
  fare,
  onBook,
}: {
  fare: SeriesFare;
  onBook: (f: SeriesFare) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const commission = fare.agentCommission || 0;
  const hasCommission = commission > 0;

  // Apply per-product markup. For RoundTrip we mark up the combined leg price,
  // otherwise the single-leg total. The hook handles role + admin gating, so
  // sub-agents and anonymous visitors fall through with `applied: false`.
  const priceFor = useDisplayPrice("series");
  const baseTop  = fare.combinedPrice ?? fare.fare.totalFare;
  const breakdown = priceFor(baseTop);

  // Net payable = total minus commission earned (commission credits agent's wallet later)
  const customerPays = breakdown.display;
  const gstOnComm    = Math.round((commission * 18) / 100); // assume 18% GST on commission
  const netPayable   = customerPays - commission + gstOnComm;
  const isRefundable = fare.refundable === true;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Top badge strip — exclusive label on left, refund pill on right */}
      <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary/5 to-violet-500/5 border-b border-border">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-xs font-bold text-primary tracking-wide uppercase">
          Tramps Aviation Exclusive · Series Fare
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border",
            isRefundable
              ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400"
              : "text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400",
          )}
        >
          {isRefundable ? "Refundable" : "Non-Refundable"}
        </span>
      </div>

      <div className="p-5">
        {/* Outbound leg */}
        <div className="flex items-center gap-4">
          {/* Airline tile */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <AirlineBadge name={fare.airline} code={fare.airlineCode} />
            <span className="text-[10px] font-mono text-muted-foreground">{fare.flightNo}</span>
          </div>

          {/* Departure time + origin */}
          <div className="text-center flex-shrink-0">
            <p className="text-2xl font-black text-foreground">{fare.departure}</p>
            <p className="text-xs font-bold text-muted-foreground">{fare.origin}</p>
          </div>

          {/* Route timeline */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">{fare.duration || "—"}</p>
            <div className="flex items-center gap-1 w-full">
              <div className="h-px flex-1 bg-border" />
              <Plane className="h-3 w-3 text-primary" />
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className={cn(
              "text-[11px] font-semibold",
              fare.stops === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600",
            )}>
              {fare.stops === 0 ? "Non-stop" : `${fare.stops} stop${fare.stops > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Arrival time + destination */}
          <div className="text-center flex-shrink-0">
            <p className="text-2xl font-black text-foreground">{fare.arrival}</p>
            <p className="text-xs font-bold text-muted-foreground">{fare.destination}</p>
          </div>

          {/* Price block — orange brand accent + Book Now CTA */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[120px]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">per person</p>
            <p className="text-2xl font-black text-[hsl(var(--brand-orange))] tabular-nums leading-none">
              {fmtINR(breakdown.display)}
            </p>
            {breakdown.applied && (
              <p className="text-[10px] text-muted-foreground">
                base {fmtINR(breakdown.base)}
              </p>
            )}
            {fare.seatsLeft !== undefined && (
              <p className={cn(
                "text-[10px] font-semibold",
                fare.seatsLeft <= 5 ? "text-rose-600" : "text-emerald-600",
              )}>
                {fare.seatsLeft} seat{fare.seatsLeft === 1 ? "" : "s"} available
              </p>
            )}
            <button
              onClick={() => onBook(fare)}
              className="mt-1 px-4 py-2 rounded-xl bg-[hsl(var(--brand-orange))] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5" />
              Book Now
            </button>
          </div>
        </div>

        {/* Return leg (only for RoundTrip) */}
        {fare.tripType === "RoundTrip" && fare.returnFlight && (
          <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Plane className="h-5 w-5 text-violet-500 rotate-180" />
            </div>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="text-center shrink-0">
                <p className="text-lg font-bold">{fare.returnFlight.departure || "—"}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {fare.destination}
                </p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {fare.returnFlight.duration || "—"}
                </p>
                <div className="flex items-center gap-1 w-full">
                  <div className="h-px flex-1 bg-border" />
                  <Plane className="h-3 w-3 text-violet-500 rotate-180" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {fare.returnFlight.stops === 0
                    ? "Non-stop"
                    : `${fare.returnFlight.stops || 0} stop${(fare.returnFlight.stops || 0) > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold">{fare.returnFlight.arrival || "—"}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {fare.origin}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 text-xs text-muted-foreground">
              {fare.returnFlight.airline || ""}
              {fare.returnFlight.flightNo ? ` · ${fare.returnFlight.flightNo}` : ""}
            </div>
          </div>
        )}
        {fare.tripType === "RoundTrip" && !fare.returnFlight && (
          <div className="mt-3 pt-3 border-t border-dashed border-border text-xs text-amber-600">
            Return flight not yet available for the selected return date — outbound only shown.
          </div>
        )}

        {/* Quick info chips row */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
            {fare.checkinBaggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage className="h-3 w-3" />
                {fare.checkinBaggage} check-in
              </span>
            )}
            {fare.cabinBaggage && (
              <span className="inline-flex items-center gap-1">
                <Luggage className="h-3 w-3" />
                {fare.cabinBaggage} cabin
              </span>
            )}
            {fare.cabinClass && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] font-bold uppercase">
                {fare.cabinClass.toLowerCase().replace("_", " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{fare.airline}</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              {expanded ? (
                <>Hide <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Details <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Expandable: FARE BREAKDOWN + POLICIES side-by-side */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fare breakdown */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Fare Breakdown
              </p>
              <Row label="Base Fare" value={fmtINR(fare.fare.baseFare)} />
              <Row label="Taxes & Fees" value={fmtINR(fare.fare.taxes)} />
              {breakdown.applied && (
                <Row
                  label="Admin markup"
                  value={`+ ${fmtINR(breakdown.markup)}`}
                  valueClass="text-[hsl(var(--brand-orange))] font-semibold"
                />
              )}
              <div className="border-t border-dashed border-border pt-2">
                <Row
                  label="Customer Pays"
                  value={fmtINR(customerPays)}
                  bold
                  valueClass="text-[hsl(var(--brand-orange))]"
                />
              </div>
              {hasCommission && (
                <>
                  <Row
                    label="Your Commission"
                    value={`+ ${fmtINR(commission)}`}
                    valueClass="text-emerald-600 font-semibold"
                  />
                  <Row
                    label="GST on commission (18%)"
                    value={`− ${fmtINR(gstOnComm)}`}
                    valueClass="text-rose-600"
                  />
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-1">
                    <Row
                      label="Net Payable by You"
                      value={fmtINR(netPayable)}
                      bold
                      valueClass="text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Policies */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2.5 text-sm">
              <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Policies
              </p>
              <Row
                label="Cancellation"
                value={isRefundable ? "Allowed" : "Not allowed"}
                valueClass={isRefundable ? "text-emerald-600" : "text-rose-600"}
              />
              <Row
                label="Date Change"
                value={isRefundable ? "Allowed" : "Not allowed"}
                valueClass={isRefundable ? "text-emerald-600" : "text-rose-600"}
              />
              <Row
                label="Baggage"
                value={`${fare.checkinBaggage || "15KG"} + ${fare.cabinBaggage || "7KG"} cabin`}
              />
              {fare.seatsLeft !== undefined && (
                <Row
                  label="Seats Left"
                  value={`${fare.seatsLeft} seat${fare.seatsLeft === 1 ? "" : "s"}`}
                  valueClass={fare.seatsLeft <= 5 ? "text-rose-600 font-semibold" : "text-foreground"}
                />
              )}
              {fare.validTill && (
                <Row
                  label="Valid till"
                  value={new Date(fare.validTill).toLocaleDateString("en-IN")}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny row helper for the fare breakdown / policies columns
function Row({
  label, value, bold, valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-bold")}>
        {label}
      </span>
      <span className={cn("tabular-nums", bold && "font-bold text-base", valueClass)}>
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function FareSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted rounded-2xl h-36" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function SeriesFarePageContent() {
  const router = useRouter();

  const [form, setForm] = useState<SearchForm>({
    origin: "DEL",
    originLabel: "Delhi (DEL)",
    destination: "BOM",
    destinationLabel: "Mumbai (BOM)",
    departureDate: todayISO(),
    returnDate: "",
    tripType: "OneWay",
    adults: 1,
  });
  const [fares, setFares] = useState<SeriesFare[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sidebar filter state — persisted across visits via localStorage ───
  // These mirror the rich sidebar (sort, stops, refund, airlines, price).
  // All defaults are "any" so a fresh search shows everything until the
  // agent has picked their preferences. After that, the choices are
  // remembered so re-opening the page shows the last-used filters.
  const [sortBy, setSortBy]                 = usePersistedState<"cheapest" | "earliest" | "fastest">("tramps:series:sort",    "cheapest");
  const [stopsFilter, setStopsFilter]       = usePersistedState<"any" | "nonstop" | "1stop" | "2plus">("tramps:series:stops",  "any");
  const [refundFilter, setRefundFilter]     = usePersistedState<"any" | "refundable" | "nonrefundable">("tramps:series:refund","any");
  const [airlinesFilter, setAirlinesFilter] = usePersistedState<string[]>("tramps:series:airlines", []);
  // Price cap is *not* persisted — we recompute it from the current
  // result-set's bounds on every fresh search to avoid stale caps.
  const [maxPrice, setMaxPrice]             = useState<number | null>(null);

  /**
   * runSearch — the actual API call. Takes explicit params so we can call it
   * from both the form submit handler and the auto-search effect (which
   * resolves params from the URL before React state updates have flushed).
   */
  const runSearch = async (p: {
    origin: string;
    destination: string;
    departureDate: string;
    adults: number;
    tripType: "OneWay" | "RoundTrip";
    returnDate?: string;
    silent?: boolean; // suppress info toasts (used on auto-search)
  }) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await searchApi.searchSeriesFares({
        origin: p.origin,
        destination: p.destination,
        departureDate: p.departureDate,
        adults: p.adults,
        tripType: p.tripType,
        ...(p.tripType === "RoundTrip" && p.returnDate ? { returnDate: p.returnDate } : {}),
      });
      const d = unwrap(res) as any;
      // Backend returns { data: [...], totalCount, ... } — accept all common shapes
      const list: SeriesFare[] = Array.isArray(d?.data)
        ? d.data
        : Array.isArray(d?.flights)
        ? d.flights
        : Array.isArray(d?.fares)
        ? d.fares
        : Array.isArray(d)
        ? d
        : [];
      setFares(list);
      if (list.length === 0 && !p.silent) {
        toast.info("No series fares found for this route and date");
      }
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load series fares");
      setError(msg);
      if (!p.silent) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleSearch — wraps `runSearch` for the form submit. Validates user
   * input first; the auto-search effect bypasses these checks because it
   * always calls `runSearch` with already-validated defaults.
   */
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.origin || !form.destination || !form.departureDate) {
      toast.error("Please fill in all search fields");
      return;
    }
    if (form.origin === form.destination) {
      toast.error("Origin and destination cannot be the same");
      return;
    }
    if (form.tripType === "RoundTrip") {
      if (!form.returnDate) {
        toast.error("Please select a return date for round trip");
        return;
      }
      if (form.returnDate < form.departureDate) {
        toast.error("Return date cannot be before departure date");
        return;
      }
    }
    return runSearch({
      origin:        form.origin,
      destination:   form.destination,
      departureDate: form.departureDate,
      adults:        form.adults,
      tripType:      form.tripType,
      returnDate:    form.returnDate,
    });
  };

  // ── Auto-search on mount ────────────────────────────────────────────────
  // Reads `?origin=…&destination=…&date=…&adults=…&tripType=…` from the URL
  // (which is what the home-page hero search widget passes), falls back to
  // the form defaults if no URL params are set, and triggers a silent search
  // so the agent lands on results immediately. No more "click search again".
  const urlSearchParams = useSearchParams();
  useEffect(() => {
    const qp = urlSearchParams;
    const origin        = (qp.get("origin")        || form.origin       || "DEL").toUpperCase();
    const destination   = (qp.get("destination")   || form.destination  || "BOM").toUpperCase();
    const departureDate = qp.get("date") || qp.get("departureDate") || form.departureDate || todayISO();
    const adults        = Math.max(1, Number(qp.get("adults") || form.adults || 1));
    const tripTypeRaw   = (qp.get("tripType") || form.tripType || "OneWay").toLowerCase();
    const tripType: "OneWay" | "RoundTrip" = tripTypeRaw.includes("round") ? "RoundTrip" : "OneWay";
    const returnDate    = qp.get("returnDate") || form.returnDate || "";

    // Update the visible form so the inputs reflect the search
    setForm((f) => ({
      ...f,
      origin,
      originLabel: f.originLabel.includes(origin) ? f.originLabel : `${origin}`,
      destination,
      destinationLabel: f.destinationLabel.includes(destination) ? f.destinationLabel : `${destination}`,
      departureDate,
      adults,
      tripType,
      returnDate: tripType === "RoundTrip" ? returnDate : "",
    }));

    // Fire the search with resolved values directly — don't wait for state.
    if (origin && destination && origin !== destination) {
      runSearch({ origin, destination, departureDate, adults, tripType, returnDate, silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Booking dialog ──────────────────────────────────────────────────
  // Opens an in-place modal that walks the agent through passengers →
  // review → confirm. The old behaviour (redirect to /b2b/flights) was
  // wrong — it lost the series-fare context and made the agent search
  // again. This is the same booking surface as flights, scoped to a
  // single series fare.
  const [bookingFare, setBookingFare] = useState<SeriesFare | null>(null);
  const { isAuthenticated } = useAuthStore();

  const handleBook = (fare: SeriesFare) => {
    if (!isAuthenticated) {
      // Anonymous visitor — series-fare booking needs an agent wallet.
      toast.info("Please sign in as an agent to book this fare");
      router.push(`/b2b/login?redirect=${encodeURIComponent("/b2b/series-fare")}`);
      return;
    }
    setBookingFare(fare);
  };

  // ── Derived data the sidebar + result list both need ─────────────────
  const priceOf = (f: SeriesFare) => f.combinedPrice ?? f.fare.totalFare;

  const priceBounds = useMemo(() => {
    if (!fares.length) return { min: 0, max: 0 };
    const all = fares.map(priceOf).filter((n) => n > 0);
    return { min: Math.min(...all), max: Math.max(...all) };
  }, [fares]);

  // Reset the price-cap whenever a fresh search comes in so we don't
  // inherit a tiny cap from the previous query and hide every result.
  useEffect(() => {
    setMaxPrice(priceBounds.max || null);
  }, [priceBounds.max]);

  const airlineCounts = useMemo(() => {
    const map = new Map<string, number>();
    fares.forEach((f) => {
      if (!f.airline) return;
      map.set(f.airline, (map.get(f.airline) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [fares]);

  const minDurationMins = (s: string) => {
    if (!s) return 999;
    const m = s.match(/(\d+)h\s*(\d+)?m?/);
    if (!m) return 999;
    return parseInt(m[1]) * 60 + parseInt(m[2] || "0");
  };

  const displayFares = useMemo(() => {
    let list = [...fares];

    // Stops
    if (stopsFilter === "nonstop") list = list.filter((f) => f.stops === 0);
    else if (stopsFilter === "1stop") list = list.filter((f) => f.stops === 1);
    else if (stopsFilter === "2plus") list = list.filter((f) => f.stops >= 2);

    // Refund policy — `refundable` is optional on the doc, so treat undefined
    // as "non-refundable" (matches the badge shown on the card).
    if (refundFilter === "refundable") list = list.filter((f) => f.refundable === true);
    else if (refundFilter === "nonrefundable") list = list.filter((f) => f.refundable !== true);

    // Airlines (empty array = all)
    if (airlinesFilter.length > 0) {
      list = list.filter((f) => airlinesFilter.includes(f.airline || ""));
    }

    // Price cap
    if (maxPrice !== null) {
      list = list.filter((f) => priceOf(f) <= maxPrice);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "cheapest") return priceOf(a) - priceOf(b);
      if (sortBy === "earliest") {
        // Compare HH:mm strings — works fine for 24h format
        return (a.departure || "").localeCompare(b.departure || "");
      }
      // fastest
      return minDurationMins(a.duration || "") - minDurationMins(b.duration || "");
    });
    return list;
  }, [fares, stopsFilter, refundFilter, airlinesFilter, maxPrice, sortBy]);

  // (stopCounts removed — the new sidebar uses a single radio set, no per-stop count badges needed)

  return (
    <PublicPageChrome>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Series Fares</h1>
          <p className="text-sm text-muted-foreground">
            Tramps Aviation exclusive contracted fares — best prices, guaranteed
          </p>
        </div>
      </div>

      {/* Markup status — shows whether agent's markup is being applied */}
      <MarkupBanner product="series" />

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="bg-card border border-border rounded-2xl p-5 space-y-4"
      >
        {/* Trip type toggle — OneWay / RoundTrip */}
        <div className="flex gap-2">
          {(["OneWay", "RoundTrip"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  tripType: t,
                  // clear returnDate when switching back to OneWay
                  returnDate: t === "OneWay" ? "" : f.returnDate,
                }))
              }
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
                form.tripType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50",
              )}
            >
              {t === "OneWay" ? "One Way" : "Round Trip"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <AirportInput
            label="From"
            value={form.originLabel}
            placeholder="Delhi (DEL)"
            onChange={(v) =>
              setForm((f) => {
                // Try to extract code from "(XXX)" pattern; otherwise leave origin untouched
                const m = v.match(/\(([A-Z]{3})\)/i);
                return { ...f, originLabel: v, origin: m ? m[1].toUpperCase() : f.origin };
              })
            }
            onSelect={(a) =>
              setForm((f) => ({
                ...f,
                origin: a.code,
                originLabel: `${a.city} (${a.code})`,
              }))
            }
          />
          <AirportInput
            label="To"
            value={form.destinationLabel}
            placeholder="Mumbai (BOM)"
            onChange={(v) =>
              setForm((f) => {
                const m = v.match(/\(([A-Z]{3})\)/i);
                return { ...f, destinationLabel: v, destination: m ? m[1].toUpperCase() : f.destination };
              })
            }
            onSelect={(a) =>
              setForm((f) => ({
                ...f,
                destination: a.code,
                destinationLabel: `${a.city} (${a.code})`,
              }))
            }
          />
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">
              Departure
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={form.departureDate}
                min={todayISO()}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureDate: e.target.value }))
                }
                className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          {form.tripType === "RoundTrip" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Return
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={form.returnDate}
                  min={form.departureDate || todayISO()}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, returnDate: e.target.value }))
                  }
                  className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">
              Passengers
            </label>
            <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-background">
              <Users className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, adults: Math.max(1, f.adults - 1) }))}
                className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs hover:bg-muted"
              >
                −
              </button>
              <span className="text-sm w-4 text-center">{form.adults}</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, adults: Math.min(9, f.adults + 1) }))}
                className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {loading && <FareSkeleton />}

      {!loading && searched && (
        <>
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Sidebar + results layout —
              `items-start` is critical: by default flex items stretch to
              fill the row's height, which kills `position: sticky` on the
              sidebar (there's no shorter parent to stick to). With
              items-start the aside takes its own height and the inner
              sticky div can stay pinned during scroll. */}
          {fares.length > 0 ? (
            <div className="flex flex-col lg:flex-row lg:items-start gap-5">
              {/* ── Filter sidebar (sticky on lg+) ──────────────────── */}
              <aside className="lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start">
                <div className="bg-card border border-border rounded-2xl p-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-5">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm">Filters</h3>
                  </div>

                  {/* Price range */}
                  {priceBounds.max > 0 && (
                    <FilterSection title="Price Range">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{fmtINR(priceBounds.min)}</span>
                        <span>Up to {fmtINR(maxPrice ?? priceBounds.max)}</span>
                      </div>
                      <input
                        type="range"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        step={Math.max(50, Math.round((priceBounds.max - priceBounds.min) / 100))}
                        value={maxPrice ?? priceBounds.max}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </FilterSection>
                  )}

                  {/* Sort by */}
                  <FilterSection title="Sort By">
                    {[
                      { key: "cheapest", label: "Cheapest first", emoji: "💰" },
                      { key: "earliest", label: "Earliest first", emoji: "⏰" },
                      { key: "fastest",  label: "Fastest first",  emoji: "⚡" },
                    ].map(({ key, label, emoji }) => (
                      <FilterRadio
                        key={key}
                        active={sortBy === key}
                        onClick={() => setSortBy(key as any)}
                      >
                        <span>{emoji}</span> {label}
                      </FilterRadio>
                    ))}
                  </FilterSection>

                  {/* Stops */}
                  <FilterSection title="Stops">
                    {[
                      { key: "any",     label: "Any stops"    },
                      { key: "nonstop", label: "Non-stop only" },
                      { key: "1stop",   label: "1 stop"        },
                    ].map(({ key, label }) => (
                      <FilterRadio
                        key={key}
                        active={stopsFilter === key}
                        onClick={() => setStopsFilter(key as any)}
                      >
                        {label}
                      </FilterRadio>
                    ))}
                  </FilterSection>

                  {/* Refund policy */}
                  <FilterSection title="Refund Policy">
                    {[
                      { key: "any",            label: "Any"             },
                      { key: "refundable",     label: "Refundable only" },
                      { key: "nonrefundable",  label: "Non-refundable"  },
                    ].map(({ key, label }) => (
                      <FilterRadio
                        key={key}
                        active={refundFilter === key}
                        onClick={() => setRefundFilter(key as any)}
                      >
                        {label}
                      </FilterRadio>
                    ))}
                  </FilterSection>

                  {/* Airlines */}
                  {airlineCounts.length > 0 && (
                    <FilterSection title="Airlines">
                      <FilterRadio
                        active={airlinesFilter.length === 0}
                        onClick={() => setAirlinesFilter([])}
                      >
                        All airlines
                      </FilterRadio>
                      {airlineCounts.map(([name, count]) => (
                        <FilterRadio
                          key={name}
                          active={airlinesFilter.includes(name)}
                          onClick={() =>
                            setAirlinesFilter((prev) =>
                              prev.includes(name)
                                ? prev.filter((x) => x !== name)
                                : [...prev, name],
                            )
                          }
                        >
                          <span className="truncate">{name}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{count}</span>
                        </FilterRadio>
                      ))}
                    </FilterSection>
                  )}
                </div>
              </aside>

              {/* ── Result list ─────────────────────────────────────── */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                  <span>
                    <strong className="text-foreground">{displayFares.length}</strong> of {fares.length} fares
                  </span>
                </div>

                {displayFares.length > 0 ? (
                  <div className="space-y-4">
                    {displayFares.map((f) => (
                      <FareCard key={f.id || f._id || f.resultToken || f.flightNo} fare={f} onBook={handleBook} />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-border rounded-2xl">
                    <Filter className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium">No fares match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try widening the price range or clearing some filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            !error && (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl">
                <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No series fares found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different route or date to find exclusive fares
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* Initial state — not yet searched */}
      {!searched && !loading && (
        <div className="py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Exclusive Series Fares</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Search to discover Tramps Aviation's exclusive contracted fares — lower base prices with agent commission built in.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
            {[
              { icon: TrendingDown, label: "Lower base fares", sub: "Directly contracted" },
              { icon: BadgePercent, label: "Agent commission", sub: "Built into every fare" },
              { icon: Wallet, label: "Wallet payment", sub: "Instant confirmation" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 bg-muted/40 rounded-xl">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="font-medium text-xs">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-place booking modal — opens when an agent clicks Book Now on a card */}
      {bookingFare && (
        <SeriesFareBookingDialog
          fare={bookingFare}
          adults={form.adults}
          travelDate={form.departureDate}
          onClose={() => setBookingFare(null)}
        />
      )}
    </div>
    </PublicPageChrome>
  );
}

// ─── Default export — Suspense wrapper required by Next.js ──────────────────
// `useSearchParams()` inside a client component triggers a CSR-bailout error
// during `next build` unless the consumer is wrapped in a Suspense boundary.
// Fallback is `null` because the inner page handles its own loading states;
// the wrapper exists only to satisfy the build.
export default function SeriesFarePage() {
  return (
    <Suspense fallback={null}>
      <SeriesFarePageContent />
    </Suspense>
  );
}
