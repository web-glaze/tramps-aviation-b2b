"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Tag, AlertCircle, Filter } from "lucide-react";
import { searchApi, unwrap } from "@/lib/api/services";
import { getErrorMessage } from "@/lib/utils/errors";
import { toast } from "sonner";
import { MarkupBanner } from "@/components/shared/MarkupBanner";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { useSearchParams } from "next/navigation";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { SeriesFareBookingDialog } from "@/components/booking/SeriesFareBookingDialog";
import { useAuthStore } from "@/lib/store";
import { SeriesFare, SearchForm } from "./types";
import { todayISO, minDurationMins } from "./utils";
import { SearchBar } from "./SearchBar";
import { FilterPanel } from "./FilterPanel";
import { SeriesFareCard, FareSkeleton } from "./SeriesFareCard";
import { EmptyState } from "./EmptyState";

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
  // review → confirm. The old behaviour (redirect to /flights) was
  // wrong — it lost the series-fare context and made the agent search
  // again. This is the same booking surface as flights, scoped to a
  // single series fare.
  const [bookingFare, setBookingFare] = useState<SeriesFare | null>(null);
  const { isAuthenticated } = useAuthStore();

  const handleBook = (fare: SeriesFare) => {
    if (!isAuthenticated) {
      // Anonymous visitor — series-fare booking needs an agent wallet.
      toast.info("Please sign in as an agent to book this fare");
      router.push(`/login?redirect=${encodeURIComponent("/series-fare")}`);
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
      <SearchBar
        form={form}
        onFormChange={setForm}
        loading={loading}
        onSubmit={handleSearch}
      />

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
              <FilterPanel
                priceBounds={priceBounds}
                maxPrice={maxPrice}
                onMaxPriceChange={setMaxPrice}
                sortBy={sortBy}
                onSortChange={setSortBy}
                stopsFilter={stopsFilter}
                onStopsChange={setStopsFilter}
                refundFilter={refundFilter}
                onRefundChange={setRefundFilter}
                airlinesFilter={airlinesFilter}
                onAirlinesChange={setAirlinesFilter}
                airlineCounts={airlineCounts}
              />

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
                      <SeriesFareCard key={f.id || f._id || f.resultToken || f.flightNo} fare={f} onBook={handleBook} />
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
      {!searched && !loading && <EmptyState />}

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


export default function SeriesFarePage() {
  return (
    <Suspense fallback={null}>
      <SeriesFarePageContent />
    </Suspense>
  );
}