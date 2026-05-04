"use client";

/**
 * app/flights/page.tsx — B2B Flight Search & Booking Flow
 * ─────────────────────────────────��──────────────────────
 * Steps:
 *  1. Search  → FlightSearchBar
 *  2. Results → FlightResultsList (with filter/sort)
 *  3. Booking → BookingSheet (5 sub-steps: passengers → add-ons → review → confirming → success)
 *
 * API surface used:
 *   searchApi.searchFlights()   → flight list
 *   agentApi.initBooking()      → create booking reference
 *   agentApi.confirmB2bBooking()→ deduct wallet + confirm
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plane, ArrowRight, ArrowLeftRight, Search, X, Plus, Minus,
  SlidersHorizontal, ChevronDown, ChevronUp, ArrowUpDown,
  CheckCircle2, Clock, Wifi, WifiOff, Loader2, RefreshCw,
  User, Calendar, Luggage, Info, Wallet, AlertTriangle,
  Check, ChevronLeft, Phone, Mail, Users, Filter,
  ChevronsUpDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { searchApi, agentApi, unwrap } from "@/lib/api/services";
import { useAuthStore, usePlatformStore, useWalletStore } from "@/lib/store";
import { getErrorMessage, isNetworkError } from "@/lib/utils/errors";
import { CommissionCalculator } from "@/components/shared/CommissionCalculator";
import { MarkupBanner } from "@/components/shared/MarkupBanner";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { useSearchParams } from "next/navigation";
import { usePersistedState } from "@/lib/hooks/usePersistedState";

// ═══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════���════════════════════════

type TripType = "OneWay" | "RoundTrip";
type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
type PassengerType = "ADT" | "CHD" | "INF";
type SortKey = "price" | "duration" | "departure" | "arrival";
type BookStep = "passengers" | "review" | "confirming" | "success";

interface SearchParams {
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
  tripType: TripType;
}

interface Flight {
  id: string;
  resultToken: string;
  flightKey?: string;
  airline: string;
  airlineCode?: string;
  flightNo: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  fare: {
    baseFare: number;
    taxes: number;
    totalFare: number;
    currency: string;
  };
  cabinClass: string;
  checkinBaggage: string;
  cabinBaggage: string;
  refundable: boolean;
  seatsAvailable?: number;
}

interface Passenger {
  type: PassengerType;
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  dob: string;
  passportNo?: string;
  passportExpiry?: string;
  nationality?: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  altPhone: string;
}

// ══════════════════════��═══════════════════��════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const POPULAR_AIRPORTS: Array<{ code: string; city: string; name: string; country: string }> = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi International", country: "India" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International", country: "India" },
  { code: "BLR", city: "Bangalore", name: "Kempegowda International", country: "India" },
  { code: "MAA", city: "Chennai", name: "Chennai International", country: "India" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhas Chandra Bose International", country: "India" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International", country: "India" },
  { code: "COK", city: "Kochi", name: "Cochin International", country: "India" },
  { code: "GOI", city: "Goa", name: "Goa International (Dabolim)", country: "India" },
  { code: "PNQ", city: "Pune", name: "Pune Airport", country: "India" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel International", country: "India" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International", country: "India" },
  { code: "LKO", city: "Lucknow", name: "Chaudhary Charan Singh International", country: "India" },
  { code: "PAT", city: "Patna", name: "Jay Prakash Narayan Airport", country: "India" },
  { code: "BHO", city: "Bhopal", name: "Raja Bhoj Airport", country: "India" },
  { code: "VNS", city: "Varanasi", name: "Lal Bahadur Shastri International", country: "India" },
  { code: "IXC", city: "Chandigarh", name: "Chandigarh International", country: "India" },
  { code: "GAU", city: "Guwahati", name: "Lokpriya Gopinath Bordoloi International", country: "India" },
  { code: "BBI", city: "Bhubaneswar", name: "Biju Patnaik International", country: "India" },
  { code: "IDR", city: "Indore", name: "Devi Ahilyabai Holkar Airport", country: "India" },
  { code: "TRV", city: "Thiruvananthapuram", name: "Trivandrum International", country: "India" },
  { code: "STV", city: "Surat", name: "Surat Airport", country: "India" },
  { code: "NAG", city: "Nagpur", name: "Dr. Babasaheb Ambedkar International", country: "India" },
  { code: "RPR", city: "Raipur", name: "Swami Vivekananda Airport", country: "India" },
  { code: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee International", country: "India" },
  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE" },
  { code: "SIN", city: "Singapore", name: "Singapore Changi", country: "Singapore" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", country: "Thailand" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International", country: "Malaysia" },
  { code: "LHR", city: "London", name: "London Heathrow", country: "UK" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International", country: "USA" },
];

const CABIN_LABELS: Record<CabinClass, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Business",
  FIRST: "First Class",
};

const STOP_LABELS: Record<number, string> = {
  0: "Non-stop",
  1: "1 Stop",
  2: "2+ Stops",
};

// ════════════════════════════════════════════��══════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtDate = (iso: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
};

const todayISO = () => new Date().toISOString().split("T")[0];

const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ══════════════════════════════════════════════��════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── Airport Autocomplete Input ────────────────────────────
function AirportInput({
  value, label, placeholder, onChange, onSelect, disabled,
}: {
  value: string; label: string; placeholder: string;
  onChange: (v: string) => void;
  onSelect: (airport: { code: string; city: string; name: string }) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<
    { code: string; city: string; name: string; country?: string }[]
  >([]);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced remote lookup against /flights/airports — keeps the form responsive
  // while still letting agents pick from the full master list (not just popular).
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
        setRemoteResults([]);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Combined results: prefer remote (fresh), fallback to local list
  const filtered = useMemo(() => {
    if (remoteResults.length > 0) return remoteResults.slice(0, 8);
    const q = value.toLowerCase().trim();
    if (!q) return POPULAR_AIRPORTS.slice(0, 8);
    return POPULAR_AIRPORTS.filter(
      a =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [value, remoteResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full h-12 pl-9 pr-4 rounded-xl border border-border bg-background text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground"
        />
        {value && (
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map(a => (
            <button
              key={a.code}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(a); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
            >
              <span className="font-black text-primary text-sm font-mono w-10 flex-shrink-0">
                {a.code}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{a.city}</p>
                <p className="text-xs text-muted-foreground truncate">{a.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Passenger count picker ─────────────────────────────────
function PaxCounter({
  label, sublabel, value, min, max, onChange,
}: {
  label: string; sublabel: string;
  value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center font-bold text-sm">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Flight card ───────────────────────────────��────────────
function FlightCard({
  flight, onBook, selected,
}: {
  flight: Flight;
  onBook: (f: Flight) => void;
  selected?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const totalPax = 1; // simplified; could be passed as prop

  // Apply admin- + agent-aware markup. Sub-agents and anonymous visitors
  // fall through and just see the base fare (hook handles role gating).
  const priceFor   = useDisplayPrice("flight");
  const baseTotal  = flight.fare?.totalFare || flight.price;
  const breakdown  = priceFor(baseTotal);

  return (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-md",
      selected ? "border-primary shadow-md shadow-primary/10" : "border-border"
    )}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Airline */}
          <div className="flex items-center gap-2.5 sm:w-36 flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
              {(flight.airlineCode || flight.airline || "").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{flight.airline}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{flight.flightNo}</p>
            </div>
          </div>

          {/* Route timeline */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-center">
              <p className="text-2xl font-black">{flight.departure}</p>
              <p className="text-xs font-semibold text-muted-foreground">{flight.from}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0 px-2">
              <span className="text-[10px] text-muted-foreground font-medium">{flight.duration}</span>
              <div className="flex items-center gap-1 w-full">
                <div className="flex-1 h-px bg-border" />
                <Plane className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                flight.stops === 0 ? "text-emerald-500" : "text-amber-500"
              )}>
                {STOP_LABELS[flight.stops] || `${flight.stops} Stop`}
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{flight.arrival}</p>
              <p className="text-xs font-semibold text-muted-foreground">{flight.to}</p>
            </div>
          </div>

          {/* Price + book */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:w-36 flex-shrink-0">
            <div className="text-right flex-1 sm:flex-none">
              <p className="text-xl font-black">{fmtINR(breakdown.display)}</p>
              <p className="text-[10px] text-muted-foreground">per person</p>
              {breakdown.applied && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {fmtINR(breakdown.base)} <span className="text-[hsl(var(--brand-orange))] font-semibold">+ {fmtINR(breakdown.markup)} markup</span>
                </p>
              )}
            </div>
            <CommissionCalculator
              baseFare={flight.fare?.baseFare || flight.price}
              compact
              className="hidden sm:flex"
            />
            <button
              onClick={() => onBook(flight)}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
            >
              Book
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
          {flight.refundable && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> Refundable
            </span>
          )}
          {flight.seatsAvailable && flight.seatsAvailable <= 9 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
              Only {flight.seatsAvailable} left!
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            Cabin: {flight.cabinBaggage}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Check-in: {flight.checkinBaggage}
          </span>
          <CommissionCalculator
            baseFare={flight.fare?.baseFare || flight.price}
            compact
            className="sm:hidden ml-auto"
          />
          <button
            onClick={() => setShowDetails(v => !v)}
            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            {showDetails ? "Hide" : "Details"}
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-dashed border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Cabin Class", value: flight.cabinClass || "Economy" },
              { label: "Duration", value: flight.duration },
              { label: "Cabin Baggage", value: flight.cabinBaggage },
              { label: "Check-in Baggage", value: flight.checkinBaggage },
              { label: "Base Fare", value: fmtINR(flight.fare?.baseFare || 0) },
              { label: "Taxes & Fees", value: fmtINR(flight.fare?.taxes || 0) },
              { label: "Total Fare", value: fmtINR(flight.fare?.totalFare || flight.price) },
              { label: "Refundable", value: flight.refundable ? "Yes" : "No" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Passenger form row ──────────────────────���──────────────
function PassengerForm({
  index, passenger, type, isIntl,
  onChange, errors,
}: {
  index: number;
  passenger: Passenger;
  type: PassengerType;
  isIntl: boolean;
  onChange: (p: Partial<Passenger>) => void;
  errors: Partial<Record<keyof Passenger, string>>;
}) {
  const typeLabels: Record<PassengerType, string> = {
    ADT: "Adult",
    CHD: "Child",
    INF: "Infant",
  };

  return (
    <div className="bg-muted/30 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          {index + 1}
        </div>
        <div>
          <p className="text-sm font-bold">{typeLabels[type]} {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            {type === "CHD" ? "Age 2–11 years" : type === "INF" ? "Under 2 years" : "12+ years"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* First Name */}
        <Field label="First Name" required error={errors.firstName}>
          <input
            type="text"
            placeholder="As on passport/Aadhaar"
            value={passenger.firstName}
            onChange={e => onChange({ firstName: e.target.value.toUpperCase() })}
            className={inputCls(!!errors.firstName)}
          />
        </Field>

        {/* Last Name */}
        <Field label="Last Name" required error={errors.lastName}>
          <input
            type="text"
            placeholder="Surname"
            value={passenger.lastName}
            onChange={e => onChange({ lastName: e.target.value.toUpperCase() })}
            className={inputCls(!!errors.lastName)}
          />
        </Field>

        {/* Gender */}
        <Field label="Gender" required error={errors.gender}>
          <div className="flex gap-2 h-10">
            {([["M", "Male"], ["F", "Female"]] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ gender: val })}
                className={cn(
                  "flex-1 rounded-xl border-2 text-sm font-semibold transition-all",
                  passenger.gender === val
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
        </Field>

        {/* Date of Birth */}
        <Field label="Date of Birth" required error={errors.dob}>
          <input
            type="date"
            value={passenger.dob}
            max={type === "INF"
              ? todayISO()
              : type === "CHD"
                ? new Date(Date.now() - 2 * 365 * 24 * 3600000).toISOString().split("T")[0]
                : new Date(Date.now() - 12 * 365 * 24 * 3600000).toISOString().split("T")[0]}
            onChange={e => onChange({ dob: e.target.value })}
            className={inputCls(!!errors.dob)}
          />
        </Field>

        {/* Passport fields for international */}
        {isIntl && (
          <>
            <Field label="Passport Number" required error={errors.passportNo}>
              <input
                type="text"
                placeholder="e.g. J1234567"
                value={passenger.passportNo || ""}
                onChange={e => onChange({ passportNo: e.target.value.toUpperCase() })}
                className={inputCls(!!errors.passportNo)}
              />
            </Field>
            <Field label="Passport Expiry" required error={errors.passportExpiry}>
              <input
                type="date"
                value={passenger.passportExpiry || ""}
                min={todayISO()}
                onChange={e => onChange({ passportExpiry: e.target.value })}
                className={inputCls(!!errors.passportExpiry)}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared Field wrapper ───────────────────���───────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}

const inputCls = (hasError: boolean) => cn(
  "w-full px-3.5 h-10 rounded-xl border bg-background text-sm focus:ring-2 outline-none transition-all",
  hasError
    ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
    : "border-border focus:border-primary focus:ring-primary/20"
);

// ═══════════════════════════════════════════════════════════
// BOOKING SHEET / MODAL
// ═══════════════════════════════════════════════════════════

function BookingSheet({
  flight, searchParams, onClose,
}: {
  flight: Flight;
  searchParams: SearchParams;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const { ps } = usePlatformStore();
  const { balance: walletStoreBalance, fetchBalance, deductOptimistic } = useWalletStore();
  const router = useRouter();
  const totalPax = searchParams.adults + searchParams.children + searchParams.infants;

  // ── State ─────────────────────────────────────────────────
  const [step, setStep] = useState<BookStep>("passengers");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ── Concurrency safety refs ────────────────────────────────
  // bookingInProgress: blocks double-clicks even before React re-renders
  const bookingInProgressRef = useRef(false);
  // pendingBookingRef: stores the bookingRef from Step 1 so if Step 2 fails
  // on a network blip, the retry skips Step 1 (no duplicate init)
  const pendingBookingRefRef = useRef<string | null>(null);
  // idempotencyKeyRef: stable key for the entire booking session —
  // NOT regenerated on retry so the backend deduplicates if Step 1 replays
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Passengers
  const makeEmptyPassenger = (type: PassengerType): Passenger => ({
    type, firstName: "", lastName: "", gender: "M", dob: "", passportNo: "", passportExpiry: "",
  });

  const [passengers, setPassengers] = useState<Passenger[]>([
    ...Array(searchParams.adults).fill(null).map(() => makeEmptyPassenger("ADT")),
    ...Array(searchParams.children).fill(null).map(() => makeEmptyPassenger("CHD")),
    ...Array(searchParams.infants).fill(null).map(() => makeEmptyPassenger("INF")),
  ]);
  const [passengerErrors, setPassengerErrors] = useState<
    Array<Partial<Record<keyof Passenger, string>>>
  >(Array(totalPax).fill({}));

  const [contact, setContact] = useState<ContactInfo>({
    email: user?.email || "",
    phone: user?.phone || "",
    altPhone: "",
  });
  const [contactErrors, setContactErrors] = useState<Partial<ContactInfo>>({});

  // International flight detection
  const INDIA_CODES = new Set(POPULAR_AIRPORTS.filter(a => a.country === "India").map(a => a.code));
  const isIntl = !INDIA_CODES.has(flight.from.toUpperCase()) || !INDIA_CODES.has(flight.to.toUpperCase());

  // ── Fetch wallet balance (use shared store + local copy) ──
  useEffect(() => {
    // If store already has a fresh balance, use it immediately
    if (walletStoreBalance !== null) {
      setWalletBalance(walletStoreBalance);
    }
    // Always force-refresh so we get the very latest balance
    fetchBalance(true).then(() => {
      const bal = useWalletStore.getState().balance;
      if (bal !== null) setWalletBalance(bal);
    });
  }, []);

  // ── Validation ───────────────────────────────────────────
  const validatePassengers = (): boolean => {
    let valid = true;
    const errs = passengers.map(p => {
      const e: Partial<Record<keyof Passenger, string>> = {};
      if (!p.firstName.trim()) { e.firstName = "Required"; valid = false; }
      if (!p.lastName.trim()) { e.lastName = "Required"; valid = false; }
      if (!p.dob) { e.dob = "Required"; valid = false; }
      if (isIntl) {
        if (!p.passportNo?.trim()) { e.passportNo = "Required for international"; valid = false; }
        if (!p.passportExpiry) { e.passportExpiry = "Required"; valid = false; }
      }
      return e;
    });
    setPassengerErrors(errs);

    const ce: Partial<ContactInfo> = {};
    if (!contact.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      ce.email = "Enter a valid email"; valid = false;
    }
    if (!contact.phone.match(/^[6-9]\d{9}$/)) {
      ce.phone = "Enter valid 10-digit mobile"; valid = false;
    }
    setContactErrors(ce);

    if (!valid) toast.error("Please fill all required fields correctly");
    return valid;
  };

  // ── Proceed to review ────────────────────────────────────
  const handleNextToReview = () => {
    if (validatePassengers()) setStep("review");
  };

  // ── Confirm booking (with full concurrency protection) ──
  //
  // Safety layers:
  //   1. bookingInProgressRef  — synchronous mutex blocks double-clicks
  //      before React re-renders; released on success OR unrecoverable error
  //   2. idempotencyKeyRef     — stable per booking-session key; NOT
  //      regenerated on network retry so backend deduplicates replays
  //   3. pendingBookingRefRef  — if Step 1 succeeded but Step 2 failed on a
  //      blip, retry jumps straight to Step 2 with the same bookingRef
  //   4. seatsLeft guard       — warns when fewer than 2 seats are left
  //      before committing wallet
  const handleConfirm = async () => {
    // ── Mutex: block concurrent calls ────────────────────────
    if (bookingInProgressRef.current) {
      toast.warning("Booking already in progress — please wait");
      return;
    }
    bookingInProgressRef.current = true;

    setStep("confirming");
    setConfirmError(null);

    // ── Stable idempotency key (use existing key on retry) ───
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      let bookingRef = pendingBookingRefRef.current;

      // ── Step 1: Init booking (skip if we already have a ref from a prior attempt) ──
      if (!bookingRef) {
        const initPayload = {
          resultToken: flight.resultToken || flight.id || flight.flightKey,
          flightKey: flight.flightKey || flight.resultToken || flight.id,
          passengers: passengers.map(p => ({
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim(),
            gender: p.gender,
            dateOfBirth: p.dob,
            passengerType: p.type,
            passportNumber: p.passportNo || undefined,
            passportExpiry: p.passportExpiry || undefined,
            nationality: p.nationality || "IN",
          })),
          contactEmail: contact.email.trim(),
          contactPhone: contact.phone.trim(),
          cabinClass: flight.cabinClass || searchParams.cabinClass,
          tripType: searchParams.tripType,
          fare: flight.fare,
          // Backend reads `idempotencyKey` from the body (see bookings.service.ts initBooking).
          // We also forward as header below for any middleware that prefers it.
          idempotencyKey,
          expectedPricePerPax: flight.fare?.totalFare || flight.price,
        };

        const initRes = await agentApi.initBooking(initPayload, idempotencyKey);
        const initData = unwrap(initRes) as any;
        bookingRef = initData?.bookingRef || initData?.booking?.bookingRef || initData?.id;

        if (!bookingRef) throw new Error("Failed to create booking reference. Please try again.");

        // Persist so a Step 2 network failure can skip Step 1 on retry
        pendingBookingRefRef.current = bookingRef;
      }

      // ── Step 2: Confirm (wallet deduction — idempotent on backend) ──
      const confirmRes = await agentApi.confirmB2bBooking(bookingRef);
      const confirmData = unwrap(confirmRes) as any;

      // ── Success: clear all transient state ───────────────────
      pendingBookingRefRef.current = null;
      // Rotate idempotency key so next booking gets a fresh one
      idempotencyKeyRef.current = generateIdempotencyKey();

      // Refresh wallet balance in background
      fetchBalance(true).catch(() => {});

      setBookingResult({
        bookingRef,
        pnr: confirmData?.pnr || confirmData?.booking?.pnr || "Processing",
        status: confirmData?.status || "CONFIRMED",
        totalAmount: flight.fare?.totalFare || flight.price,
        airline: flight.airline,
        flightNo: flight.flightNo,
        from: flight.from,
        to: flight.to,
        departure: flight.departure,
        arrival: flight.arrival,
        date: searchParams.departureDate,
      });
      setStep("success");

    } catch (err) {
      const msg = getErrorMessage(err);
      const isNetwork = isNetworkError(err);
      const status = (err as any)?.response?.status;

      // ── 409 Conflict = already booked (duplicate) ────────────
      if (status === 409) {
        // This booking was already confirmed — treat as success
        const existingRef = (err as any)?.response?.data?.bookingRef
          || pendingBookingRefRef.current
          || "Duplicate";
        pendingBookingRefRef.current = null;
        idempotencyKeyRef.current = generateIdempotencyKey();
        setBookingResult({
          bookingRef: existingRef,
          pnr: (err as any)?.response?.data?.pnr || "Processing",
          status: "CONFIRMED",
          totalAmount: flight.fare?.totalFare || flight.price,
          airline: flight.airline,
          flightNo: flight.flightNo,
          from: flight.from,
          to: flight.to,
          departure: flight.departure,
          arrival: flight.arrival,
          date: searchParams.departureDate,
        });
        setStep("success");
        toast.info("Booking was already confirmed");
        return; // mutex released in finally
      }

      // ── 402 / 400 insufficient balance — do NOT retain pendingRef ─
      if (status === 402 || msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("insufficient")) {
        pendingBookingRefRef.current = null;
        idempotencyKeyRef.current = generateIdempotencyKey();
      }
      // For network errors keep pendingBookingRefRef so the retry
      // can jump straight to Step 2 with the same bookingRef

      setConfirmError(
        isNetwork
          ? "Network error — please check your connection and try again."
          : msg
      );
      setStep("review");
      toast.error(isNetwork ? "No internet connection" : msg);
    } finally {
      // Always release the mutex so the user can retry
      bookingInProgressRef.current = false;
    }
  };

  // ── Fare + commission summary ────────────────────��───────
  const totalFare = (flight.fare?.totalFare || flight.price) * totalPax;
  const baseFare = (flight.fare?.baseFare || flight.price) * totalPax;
  const hasBalance = walletBalance !== null && walletBalance >= totalFare;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm animate-in fade-in"
        onClick={step === "confirming" ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="relative bg-background w-full sm:max-w-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card flex-shrink-0">
          {step !== "success" && step !== "confirming" && (
            <button
              onClick={step === "passengers" ? onClose : () => setStep("passengers")}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 px-2">
            <h3 className="font-bold text-foreground">
              {step === "passengers" && "Passenger Details"}
              {step === "review" && "Review Booking"}
              {step === "confirming" && "Confirming…"}
              {step === "success" && "Booking Confirmed!"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {flight.airline} · {flight.flightNo} · {flight.from} → {flight.to}
            </p>
          </div>
          {step !== "confirming" && (
            <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        {(step === "passengers" || step === "review") && (
          <div className="flex px-5 py-3 gap-2 bg-muted/30 flex-shrink-0">
            {(["passengers", "review"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  step === s || (s === "passengers" && step === "review")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium capitalize",
                  step === s ? "text-foreground" : "text-muted-foreground"
                )}>
                  {s === "passengers" ? "Passengers" : "Review & Pay"}
                </span>
                {i < 1 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Passengers ─────────────────────────── */}
          {step === "passengers" && (
            <div className="p-5 space-y-4">
              {/* Flight summary strip */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <Plane className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-bold">{flight.from}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <span className="font-bold">{flight.to}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span>{fmtDate(searchParams.departureDate)}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span>{totalPax} Pax</span>
                </div>
                <span className="font-black text-primary">{fmtINR(totalFare)}</span>
              </div>

              {/* Passenger forms */}
              {passengers.map((pax, i) => (
                <PassengerForm
                  key={i}
                  index={i}
                  passenger={pax}
                  type={pax.type}
                  isIntl={isIntl}
                  errors={passengerErrors[i] || {}}
                  onChange={partial => {
                    setPassengers(prev => prev.map((p, j) => j === i ? { ...p, ...partial } : p));
                    setPassengerErrors(prev => prev.map((e, j) => j === i ? {} : e));
                  }}
                />
              ))}

              {/* Contact details */}
              <div className="bg-muted/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">Contact Information</p>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Booking confirmation will be sent to this email
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Email Address" required error={contactErrors.email}>
                    <input type="email" placeholder="agent@agency.com"
                      value={contact.email}
                      onChange={e => { setContact(c => ({ ...c, email: e.target.value })); setContactErrors(e2 => ({ ...e2, email: undefined })); }}
                      className={inputCls(!!contactErrors.email)} />
                  </Field>
                  <Field label="Mobile Number" required error={contactErrors.phone}>
                    <input type="tel" placeholder="10-digit mobile"
                      value={contact.phone}
                      onChange={e => { setContact(c => ({ ...c, phone: e.target.value })); setContactErrors(e2 => ({ ...e2, phone: undefined })); }}
                      className={inputCls(!!contactErrors.phone)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ─────────────────────────────── */}
          {step === "review" && (
            <div className="p-5 space-y-4">
              {/* Confirm error */}
              {confirmError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{confirmError}</p>
                </div>
              )}

              {/* Flight summary */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="bg-gradient-to-r from-primary/80 to-primary px-4 py-3 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-white" />
                  <span className="font-bold text-white text-sm">{flight.airline} · {flight.flightNo}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-black">{flight.departure}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{flight.from}</p>
                  </div>
                  <div className="text-center flex-1 px-4">
                    <p className="text-xs text-muted-foreground mb-1">{flight.duration}</p>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-px bg-border" />
                      <Plane className="h-3.5 w-3.5 text-primary" />
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {fmtDate(searchParams.departureDate)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black">{flight.arrival}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{flight.to}</p>
                  </div>
                </div>
              </div>

              {/* Passengers summary */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Passengers ({totalPax})
                </p>
                {passengers.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {p.firstName[0] || i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.type === "ADT" ? "Adult" : p.type === "CHD" ? "Child" : "Infant"} · {p.gender === "M" ? "Male" : "Female"} · DOB: {p.dob || "—"}
                      </p>
                    </div>
                    <button onClick={() => setStep("passengers")}
                      className="text-[10px] text-primary hover:underline">Edit</button>
                  </div>
                ))}
              </div>

              {/* Commission breakdown */}
              <CommissionCalculator
                baseFare={baseFare}
                className="w-full"
              />

              {/* Fare summary */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Fare Summary
                  </p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { label: `Base Fare × ${totalPax}`, value: fmtINR(baseFare) },
                    { label: "Taxes & Fees", value: fmtINR((flight.fare?.taxes || 0) * totalPax) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dashed border-border flex justify-between">
                    <span className="font-bold">Total Amount</span>
                    <span className="font-black text-lg">{fmtINR(totalFare)}</span>
                  </div>
                </div>
              </div>

              {/* Low seats warning */}
              {flight.seatsAvailable !== undefined && flight.seatsAvailable <= 5 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-600">
                    Only {flight.seatsAvailable} seat{flight.seatsAvailable > 1 ? "s" : ""} left at this price — confirm quickly before someone else grabs it!
                  </p>
                </div>
              )}

              {/* Retry notice (when pendingBookingRef exists — Step 1 already done) */}
              {pendingBookingRefRef.current && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <Info className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary">
                    Booking reference already created — retrying payment step only (no duplicate charge).
                  </p>
                </div>
              )}

              {/* Previous attempt error */}
              {confirmError && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-500">{confirmError}</p>
                </div>
              )}

              {/* Wallet balance check */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border",
                hasBalance
                  ? "bg-emerald-500/5 border-emerald-500/25"
                  : "bg-red-500/5 border-red-500/25"
              )}>
                <Wallet className={cn("h-5 w-5 flex-shrink-0", hasBalance ? "text-emerald-500" : "text-red-500")} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Wallet Balance: {walletBalance !== null ? fmtINR(walletBalance) : "Loading…"}
                  </p>
                  {!hasBalance && walletBalance !== null && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Insufficient balance. Need {fmtINR(totalFare - (walletBalance || 0))} more.{" "}
                      <a href="/b2b/wallet" className="underline font-semibold">Top up →</a>
                    </p>
                  )}
                </div>
                {hasBalance && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirming ─────────────────────────── */}
          {step === "confirming" && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-lg font-bold">Confirming your booking…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Deducting from wallet and issuing ticket. Please don&apos;t close this window.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ────────────────���────────────── */}
          {step === "success" && bookingResult && (
            <div className="p-5 space-y-4">
              {/* Celebration header */}
              <div className="text-center py-4">
                <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <p className="text-xl font-black">Booking Confirmed!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your ticket has been issued successfully
                </p>
              </div>

              {/* Booking reference card */}
              <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Booking Ref", value: bookingResult.bookingRef, mono: true },
                    { label: "PNR", value: bookingResult.pnr || "Processing", mono: true },
                    { label: "Flight", value: `${bookingResult.airline} ${bookingResult.flightNo}` },
                    { label: "Status", value: bookingResult.status?.replace("_", " ") || "Confirmed" },
                    { label: "Route", value: `${bookingResult.from} → ${bookingResult.to}` },
                    { label: "Amount Paid", value: fmtINR(bookingResult.totalAmount) },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="bg-white/40 dark:bg-black/20 rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className={cn("text-sm font-bold mt-0.5", mono && "font-mono tracking-wider text-primary")}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/b2b/bookings/${bookingResult.bookingRef}`)}
                  className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
                >
                  View E-Ticket
                </button>
                <button
                  onClick={onClose}
                  className="h-11 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        {(step === "passengers" || step === "review") && (
          <div className="px-5 py-4 border-t border-border bg-card flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-black">{fmtINR(totalFare)}</p>
              </div>
              {step === "passengers" ? (
                <button
                  onClick={handleNextToReview}
                  className="flex-1 h-12 max-w-[200px] rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  Review Booking <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={
                    (!hasBalance && walletBalance !== null) ||
                    step === "confirming"
                  }
                  className="flex-1 h-12 max-w-[200px] rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {step === "confirming" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Confirming…</>
                  ) : (
                    <><Wallet className="h-4 w-4" />Pay from Wallet</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════���════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

const DEFAULT_SEARCH: SearchParams = {
  origin: "", originLabel: "",
  destination: "", destinationLabel: "",
  departureDate: todayISO(),
  returnDate: "",
  adults: 1, children: 0, infants: 0,
  cabinClass: "ECONOMY",
  tripType: "OneWay",
};

export default function FlightsPage() {
  usePlatformStore().fetchIfStale();

  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH);
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement>(null);

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Filter state — persisted across visits so an agent's last-used choices
  // survive page reloads / cross-page navigation.
  const [sortKey, setSortKey]               = usePersistedState<SortKey>("tramps:flights:sort", "price");
  const [filterStops, setFilterStops]       = usePersistedState<number | null>("tramps:flights:stops", null);
  const [filterAirline, setFilterAirline]   = usePersistedState<string | null>("tramps:flights:airline", null);
  // maxPrice depends on the current result-set, don't persist it
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | null>(null);

  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  // ── Close pax picker on outside click ────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) setPaxOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Swap origin / destination ─────────────────────────────
  const handleSwap = () => {
    setSearchParams(p => ({
      ...p,
      origin: p.destination,
      originLabel: p.destinationLabel,
      destination: p.origin,
      destinationLabel: p.originLabel,
    }));
  };

  /**
   * runFlightSearch — actual API call. Takes explicit params so the auto-
   * search effect can run with values resolved from the URL before React
   * has flushed `setSearchParams` updates.
   */
  const runFlightSearch = async (p: SearchParams & { silent?: boolean }) => {
    setLoading(true);
    setSearchError(null);
    setFlights([]);
    setSearched(true);
    setSelectedFlight(null);
    try {
      const res = await searchApi.searchFlights({
        origin: p.origin,
        destination: p.destination,
        departureDate: p.departureDate,
        adults: p.adults,
        children: p.children,
        infants: p.infants,
        cabinClass: p.cabinClass,
        tripType: p.tripType,
        returnDate: p.returnDate || undefined,
      });
      const data = res.data as any;
      const list: Flight[] = data?.flights || [];
      if (list.length === 0) {
        setSearchError("No flights found for this route. Try different dates or nearby airports.");
      }
      setFlights(list);
    } catch (err) {
      const msg = isNetworkError(err)
        ? "No internet connection. Please check your network and try again."
        : getErrorMessage(err, "Flight search failed. Please try again.");
      setSearchError(msg);
      if (!p.silent) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Search ────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination) {
      toast.error("Please select both origin and destination"); return;
    }
    if (!searchParams.departureDate) {
      toast.error("Please select a departure date"); return;
    }
    if (searchParams.origin === searchParams.destination) {
      toast.error("Origin and destination cannot be the same"); return;
    }
    return runFlightSearch(searchParams);
  };

  // ── Auto-search on mount ─────────────────────────────────────────────
  // Reads `?origin=…&destination=…&date=…&adults=…&tripType=…` from the
  // URL (passed by the home-page hero search), or falls back to a sensible
  // default (DEL→BOM today). Either way, the agent lands on results
  // immediately — no need to click Search a second time.
  const urlSearchParams = useSearchParams();
  useEffect(() => {
    const qp = urlSearchParams;
    const origin        = (qp.get("origin")        || "DEL").toUpperCase();
    const destination   = (qp.get("destination")   || "BOM").toUpperCase();
    const departureDate = qp.get("date") || qp.get("departureDate") || todayISO();
    const adults        = Math.max(1, Number(qp.get("adults") || 1));
    const tripTypeRaw   = (qp.get("tripType") || "OneWay").toLowerCase();
    const tripType: TripType = tripTypeRaw.includes("round") ? "RoundTrip" : "OneWay";
    const returnDate    = qp.get("returnDate") || "";

    const next: SearchParams = {
      origin,
      originLabel:      origin,
      destination,
      destinationLabel: destination,
      departureDate,
      returnDate:       tripType === "RoundTrip" ? returnDate : "",
      adults,
      children:         0,
      infants:          0,
      cabinClass:       "ECONOMY",
      tripType,
    };
    setSearchParams(next);

    if (origin && destination && origin !== destination) {
      runFlightSearch({ ...next, silent: true } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sort + filter ───────────────────────���─────────────────
  const displayed = useMemo(() => {
    let list = [...flights];
    if (filterStops !== null) list = list.filter(f => f.stops === filterStops);
    if (filterAirline) list = list.filter(f => f.airline === filterAirline);
    if (filterMaxPrice !== null) list = list.filter(f => (f.fare?.totalFare || f.price) <= filterMaxPrice);
    list.sort((a, b) => {
      if (sortKey === "price") return (a.fare?.totalFare || a.price) - (b.fare?.totalFare || b.price);
      if (sortKey === "duration") return a.duration.localeCompare(b.duration);
      if (sortKey === "departure") return a.departure.localeCompare(b.departure);
      if (sortKey === "arrival") return a.arrival.localeCompare(b.arrival);
      return 0;
    });
    return list;
  }, [flights, filterStops, filterAirline, filterMaxPrice, sortKey]);

  const airlines = useMemo(() => [...new Set(flights.map(f => f.airline))].sort(), [flights]);
  const minPrice = useMemo(() => flights.reduce((m, f) => Math.min(m, f.fare?.totalFare || f.price), Infinity), [flights]);
  const maxPrice = useMemo(() => flights.reduce((m, f) => Math.max(m, f.fare?.totalFare || f.price), 0), [flights]);

  const totalPax = searchParams.adults + searchParams.children + searchParams.infants;
  const paxLabel = `${totalPax} Pax · ${CABIN_LABELS[searchParams.cabinClass]}`;

  return (
    <PublicPageChrome>
    <div className="space-y-5">

      {/* Markup status — shows whether agent's markup is being applied */}
      <MarkupBanner product="flight" />

      {/* ── Search bar ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Trip type toggle */}
        <div className="flex gap-2">
          {(["OneWay", "RoundTrip"] as const).map(t => (
            <button key={t} onClick={() => setSearchParams(p => ({ ...p, tripType: t }))}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                searchParams.tripType === t
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}>
              {t === "OneWay" ? "One Way" : "Round Trip"}
            </button>
          ))}
        </div>

        {/* Airports row */}
        <div className="flex items-end gap-2">
          <AirportInput
            label="From"
            placeholder="City or airport"
            value={searchParams.originLabel || searchParams.origin}
            onChange={v => setSearchParams(p => ({ ...p, origin: v, originLabel: v }))}
            onSelect={a => setSearchParams(p => ({
              ...p, origin: a.code, originLabel: `${a.city} (${a.code})`
            }))}
          />
          {/* Swap button */}
          <button
            onClick={handleSwap}
            className="h-12 w-12 rounded-xl border border-border flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-all flex-shrink-0 mb-0"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <AirportInput
            label="To"
            placeholder="City or airport"
            value={searchParams.destinationLabel || searchParams.destination}
            onChange={v => setSearchParams(p => ({ ...p, destination: v, destinationLabel: v }))}
            onSelect={a => setSearchParams(p => ({
              ...p, destination: a.code, destinationLabel: `${a.city} (${a.code})`
            }))}
          />
        </div>

        {/* Dates + PAX row */}
        <div className="flex flex-wrap gap-3">
          {/* Departure date */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Departure
            </label>
            <input
              type="date"
              value={searchParams.departureDate}
              min={todayISO()}
              onChange={e => setSearchParams(p => ({ ...p, departureDate: e.target.value }))}
              className="w-full h-12 px-3.5 rounded-xl border border-border bg-background text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* Return date */}
          {searchParams.tripType === "RoundTrip" && (
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                Return
              </label>
              <input
                type="date"
                value={searchParams.returnDate}
                min={searchParams.departureDate || todayISO()}
                onChange={e => setSearchParams(p => ({ ...p, returnDate: e.target.value }))}
                className="w-full h-12 px-3.5 rounded-xl border border-border bg-background text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          )}

          {/* Passengers + cabin */}
          <div className="flex-1 min-w-[180px]" ref={paxRef}>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Passengers
            </label>
            <button
              onClick={() => setPaxOpen(v => !v)}
              className="w-full h-12 px-3.5 rounded-xl border border-border bg-background text-sm font-semibold flex items-center justify-between hover:border-primary/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {paxLabel}
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {paxOpen && (
              <div className="absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-xl p-4 min-w-[280px]">
                <PaxCounter label="Adults" sublabel="12+ years" value={searchParams.adults} min={1} max={9}
                  onChange={v => setSearchParams(p => ({ ...p, adults: v }))} />
                <PaxCounter label="Children" sublabel="2–11 years" value={searchParams.children} min={0} max={6}
                  onChange={v => setSearchParams(p => ({ ...p, children: v }))} />
                <PaxCounter label="Infants" sublabel="Under 2" value={searchParams.infants} min={0} max={searchParams.adults}
                  onChange={v => setSearchParams(p => ({ ...p, infants: v }))} />
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Cabin Class</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(CABIN_LABELS) as [CabinClass, string][]).map(([k, v]) => (
                      <button key={k} onClick={() => setSearchParams(p => ({ ...p, cabinClass: k }))}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all",
                          searchParams.cabinClass === k
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground"
                        )}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setPaxOpen(false)}
                  className="w-full mt-3 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Search button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-60 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Results section ─────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && searched && searchError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            {isNetworkError({ message: searchError }) ? (
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Plane className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="font-bold text-foreground mb-1">No Flights Found</p>
          <p className="text-sm text-muted-foreground max-w-sm">{searchError}</p>
          <button onClick={handleSearch} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </div>
      )}

      {!loading && flights.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">

          {/* Filter sidebar — sticky on scroll */}
          <div className="lg:w-60 flex-shrink-0 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm">Filters</span>
                </div>
                {(filterStops !== null || filterAirline || filterMaxPrice !== null) && (
                  <button onClick={() => { setFilterStops(null); setFilterAirline(null); setFilterMaxPrice(null); }}
                    className="text-[10px] text-red-500 font-semibold hover:underline">Clear all</button>
                )}
              </div>

              {/* Stops */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Stops</p>
                <div className="space-y-1.5">
                  {([null, 0, 1, 2] as const).map(s => (
                    <button key={String(s)} onClick={() => setFilterStops(s === filterStops ? null : s)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all",
                        filterStops === s
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      )}>
                      {s === null ? "All" : STOP_LABELS[s]}
                      {filterStops === s && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Airlines */}
              {airlines.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Airlines</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {airlines.map(a => (
                      <button key={a} onClick={() => setFilterAirline(filterAirline === a ? null : a)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-left",
                          filterAirline === a
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        )}>
                        <span className="truncate">{a}</span>
                        {filterAirline === a && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Sort + count bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{displayed.length}</span> flights found
                {(filterStops !== null || filterAirline) && (
                  <span className="text-muted-foreground"> (filtered)</span>
                )}
              </p>
              <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
                {([
                  { key: "price", label: "Price" },
                  { key: "duration", label: "Duration" },
                  { key: "departure", label: "Departure" },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <button key={key} onClick={() => setSortKey(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      sortKey === key
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {displayed.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl py-16 text-center">
                <Filter className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-semibold">No flights match your filters</p>
                <button onClick={() => { setFilterStops(null); setFilterAirline(null); }}
                  className="mt-3 text-sm text-primary hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              displayed.map(f => (
                <FlightCard
                  key={f.id || f.resultToken}
                  flight={f}
                  onBook={setSelectedFlight}
                  selected={selectedFlight?.id === f.id}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Booking sheet ───────────────────────────────────── */}
      {selectedFlight && (
        <BookingSheet
          flight={selectedFlight}
          searchParams={searchParams}
          onClose={() => setSelectedFlight(null)}
        />
      )}
    </div>
    </PublicPageChrome>
  );
}
