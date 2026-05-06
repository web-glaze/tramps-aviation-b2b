"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import {
  Hotel,
  Search,
  Star,
  Calendar,
  Users,
  Loader2,
  MapPin,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Check,
  ArrowUpDown,
  AlertCircle,
  BedDouble,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { searchApi, hotelsApi, agentApi, unwrap } from "@/lib/api/services";
import { getErrorMessage } from "@/lib/utils/errors";
import { toast } from "sonner";
import { MarkupBanner } from "@/components/shared/MarkupBanner";
import { useDisplayPrice } from "@/lib/hooks/useDisplayPrice";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { useSearchParams } from "next/navigation";
import { usePersistedState } from "@/lib/hooks/usePersistedState";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotelResult {
  hotelCode: string;
  resultToken?: string;
  name: string;
  address?: string;
  city?: string;
  starRating: number;
  pricePerNight: number;
  totalPrice?: number;
  currency?: string;
  refundable?: boolean;
  images?: string[];
  amenities?: string[];
  agentCommission?: number;
  roomsAvailable?: number;
}

interface SearchForm {
  cityCode: string;
  cityName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
}

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const todayISO = () => new Date().toISOString().split("T")[0];
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const toDisplayDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ─── Amenity icons ────────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  restaurant: Utensils,
  gym: Dumbbell,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "Free WiFi",
  parking: "Parking",
  breakfast: "Breakfast",
  restaurant: "Restaurant",
  gym: "Gym",
};

// ─── City Search ──────────────────────────────────────────────────────────────
function CitySearchInput({
  value,
  onChange,
}: {
  value: { code: string; name: string };
  onChange: (v: { code: string; name: string }) => void;
}) {
  const [query, setQuery] = useState(value.name);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    clearTimeout(timerRef.current);
    if (v.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await hotelsApi.searchCities(v);
        const d = unwrap(res) as any;
        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.cities)
            ? d.cities
            : [];
        setResults(list.slice(0, 8));
        setOpen(true);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-52">
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        City / Destination
      </label>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Delhi, Mumbai, Goa..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {results.map((city: any) => (
            <button
              key={city.cityCode || city.code}
              type="button"
              onMouseDown={() => {
                onChange({
                  code: city.cityCode || city.code,
                  name: city.cityName || city.name,
                });
                setQuery(city.cityName || city.name);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted flex items-center gap-3 text-sm"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">
                  {city.cityName || city.name}
                </span>
                {city.countryName && (
                  <span className="text-muted-foreground text-xs ml-1">
                    · {city.countryName}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Star rating display ──────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < count
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

// ─── Hotel Image with fallback ────────────────────────────────────────────────
function HotelImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-20 w-24 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Hotel className="h-8 w-8 text-muted-foreground/40" />
      )}
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────
function HotelCard({
  hotel,
  nights,
  onBook,
}: {
  hotel: HotelResult;
  nights: number;
  onBook: (h: HotelResult) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const commission = hotel.agentCommission || 0;
  const totalPrice = hotel.totalPrice || hotel.pricePerNight * nights;

  // Per-night and total prices both run through the markup hook so the
  // expanded "Price Summary" stays internally consistent.
  const priceFor = useDisplayPrice("hotel");
  const perNight = priceFor(hotel.pricePerNight);
  const total = priceFor(totalPrice);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-5">
        {/* Hotel image with icon fallback */}
        <HotelImage src={hotel.images?.[0]} alt={hotel.name} />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">
                {hotel.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Stars count={hotel.starRating} />
                {hotel.city && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {hotel.city}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold">{fmtINR(perNight.display)}</p>
              <p className="text-xs text-muted-foreground">per night</p>
              {perNight.applied && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {fmtINR(perNight.base)}{" "}
                  <span className="text-[hsl(var(--brand-orange))] font-semibold">
                    + {fmtINR(perNight.markup)}
                  </span>
                </p>
              )}
              {commission > 0 && (
                <p className="text-xs font-semibold text-emerald-500 mt-0.5">
                  +{fmtINR(commission)} earned
                </p>
              )}
            </div>
          </div>

          {hotel.address && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {hotel.address}
            </p>
          )}

          {/* Quick amenities */}
          <div className="flex gap-3 flex-wrap">
            {(hotel.amenities || []).slice(0, 4).map((a) => {
              const Icon = AMENITY_ICONS[a.toLowerCase()] || Check;
              const label = AMENITY_LABELS[a.toLowerCase()] || a;
              return (
                <span
                  key={a}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              );
            })}
            {hotel.refundable !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  hotel.refundable
                    ? "text-emerald-500"
                    : "text-muted-foreground",
                )}
              >
                <Check className="h-3 w-3" />
                {hotel.refundable ? "Free cancellation" : "Non-refundable"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mx-5 mb-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Price Summary
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per night</span>
              <span>{fmtINR(perNight.display)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {nights} night{nights > 1 ? "s" : ""}
              </span>
              <span className="font-semibold">{fmtINR(total.display)}</span>
            </div>
            {total.applied && (
              <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-border">
                <span className="text-muted-foreground">
                  Includes your markup
                </span>
                <span className="text-[hsl(var(--brand-orange))] font-semibold">
                  +{fmtINR(total.markup)}
                </span>
              </div>
            )}
          </div>
          {commission > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Your Earnings
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission</span>
                <span className="text-emerald-500">{fmtINR(commission)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 px-5 pb-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded ? "Less" : "Details"}
        </button>
        {hotel.roomsAvailable !== undefined && hotel.roomsAvailable <= 5 && (
          <span className="text-xs text-amber-600 font-medium">
            Only {hotel.roomsAvailable} rooms left!
          </span>
        )}
        <div className="flex-1" />
        <div className="text-right mr-3">
          <p className="text-base font-bold">{fmtINR(totalPrice)}</p>
          <p className="text-xs text-muted-foreground">
            for {nights} night{nights > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => onBook(hotel)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Wallet className="h-4 w-4" />
          Select Room
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function HotelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-muted rounded-2xl h-32" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function HotelsPageContent() {
  const [form, setForm] = useState<SearchForm>({
    cityCode: "",
    cityName: "",
    checkIn: tomorrowISO(),
    checkOut: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split("T")[0];
    })(),
    rooms: 1,
    adults: 2,
    children: 0,
  });
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Persist sort + min-star filters so they survive cross-page navigation.
  const [sortBy, setSortBy] = usePersistedState<"price" | "rating">(
    "tramps:hotels:sort",
    "price",
  );
  const [minStars, setMinStars] = usePersistedState<number>(
    "tramps:hotels:minStars",
    0,
  );

  const nights = useMemo(() => {
    const d1 = new Date(form.checkIn);
    const d2 = new Date(form.checkOut);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }, [form.checkIn, form.checkOut]);

  /**
   * runHotelSearch — actual API call. Takes explicit params so the auto-
   * search effect can run with values resolved from the URL before React
   * has flushed `setForm` updates.
   */
  const runHotelSearch = async (p: {
    cityCode: string;
    cityName: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    adults: number;
    children: number;
    silent?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await searchApi.searchHotels({
        cityCode: p.cityCode,
        cityName: p.cityName,
        checkIn: toDisplayDate(p.checkIn),
        checkOut: toDisplayDate(p.checkOut),
        rooms: p.rooms,
        adults: p.adults,
        children: p.children,
        nationality: "IN",
      });
      const d = unwrap(res) as any;
      const list: HotelResult[] = Array.isArray(d?.hotels)
        ? d.hotels
        : Array.isArray(d)
          ? d
          : [];
      setHotels(list);
      if (list.length === 0 && !p.silent)
        toast.info("No hotels found for your search");
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to search hotels");
      setError(msg);
      if (!p.silent) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.cityCode) {
      toast.error("Please select a city");
      return;
    }
    if (form.checkIn >= form.checkOut) {
      toast.error("Check-out must be after check-in");
      return;
    }
    return runHotelSearch(form);
  };

  // ── Auto-search on mount ─────────────────────────────────────────────
  // Reads the home-page hero search's query params (?city=…&checkIn=…&
  // checkOut=…&guests=…) or falls back to a default Mumbai stay so the
  // agent never lands on an empty page.
  const urlSearchParams = useSearchParams();
  useEffect(() => {
    const qp = urlSearchParams;
    const cityName = qp.get("city") || form.cityName || "Mumbai";
    const checkIn = qp.get("checkIn") || form.checkIn || tomorrowISO();
    const checkOutQp = qp.get("checkOut");
    const checkOut =
      checkOutQp ||
      form.checkOut ||
      (() => {
        const d = new Date(checkIn);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })();
    const guests = Math.max(1, Number(qp.get("guests") || form.adults || 2));

    // The hotel search backend wants a TBO city *code* (e.g. "100764").
    // The home-page widget only has the user-typed name — we'll trigger a
    // city autocomplete lookup in the search-form component below; here
    // we still update the form name so the UX feels seeded.
    setForm((f) => ({
      ...f,
      cityName,
      checkIn,
      checkOut,
      adults: guests,
    }));

    // If we already have a cityCode from a previous session (or the form
    // default is already set), fire the search silently.
    if (form.cityCode) {
      runHotelSearch({
        cityCode: form.cityCode,
        cityName,
        checkIn,
        checkOut,
        rooms: form.rooms,
        adults: guests,
        children: form.children,
        silent: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBook = (hotel: HotelResult) => {
    toast.info(`Hotel booking flow coming soon — ${hotel.name}`);
  };

  const displayHotels = useMemo(() => {
    let list = [...hotels];
    if (minStars > 0) list = list.filter((h) => h.starRating >= minStars);
    list.sort((a, b) =>
      sortBy === "price"
        ? a.pricePerNight - b.pricePerNight
        : b.starRating - a.starRating,
    );
    return list;
  }, [hotels, sortBy, minStars]);

  return (
    <PublicPageChrome>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Hotel className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Hotels</h1>
            <p className="text-sm text-muted-foreground">
              Search and book hotels with instant wallet confirmation
            </p>
          </div>
        </div>

        {/* Markup status — shows whether agent's markup is being applied */}
        <MarkupBanner product="hotel" />

        {/* Search form */}
        <form
          onSubmit={handleSearch}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <div className="flex flex-wrap gap-4 items-end">
            <CitySearchInput
              value={{ code: form.cityCode, name: form.cityName }}
              onChange={(v) =>
                setForm((f) => ({ ...f, cityCode: v.code, cityName: v.name }))
              }
            />

            {/* Check-in */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Check-in
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={form.checkIn}
                  min={todayISO()}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, checkIn: e.target.value }))
                  }
                  className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Check-out */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Check-out
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={form.checkOut}
                  min={form.checkIn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, checkOut: e.target.value }))
                  }
                  className="h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Rooms & Guests */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">
                Rooms & Guests
              </label>
              <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border bg-background text-sm">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        rooms: Math.max(1, f.rooms - 1),
                      }))
                    }
                    className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs"
                  >
                    −
                  </button>
                  <span className="w-4 text-center">{form.rooms}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        rooms: Math.min(5, f.rooms + 1),
                      }))
                    }
                    className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        adults: Math.max(1, f.adults - 1),
                      }))
                    }
                    className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs"
                  >
                    −
                  </button>
                  <span className="w-4 text-center">{form.adults}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        adults: Math.min(10, f.adults + 1),
                      }))
                    }
                    className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
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
              Search Hotels
            </button>
          </div>

          {searched && !loading && (
            <p className="mt-3 text-xs text-muted-foreground">
              {nights} night{nights > 1 ? "s" : ""} · {form.rooms} room
              {form.rooms > 1 ? "s" : ""} · {form.adults} adult
              {form.adults > 1 ? "s" : ""}
            </p>
          )}
        </form>

        {/* Loading */}
        {loading && <HotelSkeleton />}

        {/* Results */}
        {!loading && searched && (
          <>
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {displayHotels.length > 0 && (
              <>
                {/* Filters — sticky on scroll */}
                <div className="flex flex-wrap items-center gap-3 sticky top-20 z-20 bg-background/95 backdrop-blur-md py-3 -mx-2 px-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Filter className="h-4 w-4" />
                    {displayHotels.length} hotels
                  </span>

                  {/* Star filter */}
                  <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
                    {[0, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setMinStars(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          minStars === s
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s === 0 ? "All" : `${s}★+`}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex gap-2">
                    {(["price", "rating"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                          sortBy === s
                            ? "border-primary text-primary bg-primary/5"
                            : "border-border text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {s === "price" ? "Lowest Price" : "Top Rated"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {displayHotels.map((h) => (
                    <HotelCard
                      key={h.hotelCode}
                      hotel={h}
                      nights={nights}
                      onBook={handleBook}
                    />
                  ))}
                </div>
              </>
            )}

            {!error && displayHotels.length === 0 && (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl">
                <Hotel className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No hotels found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try different dates, city, or fewer filters
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial state */}
        {!searched && !loading && (
          <div className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Hotel Search</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Search thousands of hotels across India and worldwide. Instant
              confirmation with wallet payment.
            </p>
          </div>
        )}
      </div>
    </PublicPageChrome>
  );
}

export default function HotelsPage() {
  return (
    <Suspense fallback={null}>
      <HotelsPageContent />
    </Suspense>
  );
}
