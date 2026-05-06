"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import {
  Plane, ArrowRight, ArrowLeftRight, Search, X, Plus,
  SlidersHorizontal, ChevronDown, Loader2, RefreshCw,
  Check, Filter, WifiOff, ChevronsUpDown, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { searchApi } from "@/lib/api/services";
import { usePlatformStore } from "@/lib/store";
import { getErrorMessage, isNetworkError } from "@/lib/utils/errors";
import { MarkupBanner } from "@/components/shared/MarkupBanner";
import { PublicPageChrome } from "@/components/layout/PublicPageChrome";
import { useSearchParams } from "next/navigation";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { MultiCityResults } from "@/components/flights/MultiCityResults";

import type { Flight, SearchParams, SortKey, TripType } from "./types";
import { CABIN_LABELS, POPULAR_AIRPORTS, STOP_LABELS } from "./constants";
import { fmtINR, todayISO, fmtDate } from "./utils";
import { AirportInput } from "./AirportInput";
import { PaxCounter } from "./PaxCounter";
import { FlightCard } from "./FlightCard";
import { BookingSheet } from "./BookingSheet";

const DEFAULT_SEARCH: SearchParams = {
  origin: "", originLabel: "",
  destination: "", destinationLabel: "",
  departureDate: todayISO(),
  returnDate: "",
  adults: 1, children: 0, infants: 0,
  cabinClass: "ECONOMY",
  tripType: "OneWay",
};

function FlightsPageContent() {
  // Trigger lazy platform-settings fetch — no-op when already fresh.
  // MUST live in an effect, NOT at the top level: calling a store action
  // during render schedules a state update during render, which can
  // produce "cannot update a component while rendering a different
  // component" warnings or, in the worst case, a render loop.
  const fetchPlatformIfStale = usePlatformStore((s) => s.fetchIfStale);
  useEffect(() => {
    fetchPlatformIfStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Pre-fix: only one-way / round-trip were sent to the backend; multi-city
      // and the new directOnly / airlines filters were never plumbed through.
      const isMultiCity = p.tripType === "MultiCity";
      const payload: any = {
        origin: p.origin,
        destination: p.destination,
        departureDate: p.departureDate,
        adults: p.adults,
        children: p.children,
        infants: p.infants,
        cabinClass: p.cabinClass,
        // Backend expects snake_case enum values
        tripType: isMultiCity
          ? "multi_city"
          : p.tripType === "RoundTrip"
            ? "round_trip"
            : "one_way",
        returnDate: p.returnDate || undefined,
        directFlightOnly: !!p.directOnly,
        airlines: p.airlines && p.airlines.length ? p.airlines : undefined,
      };
      if (isMultiCity) {
        payload.legs = (p.legs || []).map(l => ({
          origin: l.from,
          destination: l.to,
          departureDate: l.date,
        }));
      }
      const res = await searchApi.searchFlights(payload);
      const data = res.data as any;
      // Multi-city responds with { legs: [{flights, ...}] } — flatten to a
      // single list for now so the existing results UI keeps working. The
      // proper multi-leg picker is a future enhancement.
      let list: Flight[] = data?.flights || [];
      if (isMultiCity && Array.isArray(data?.legs)) {
        list = data.legs.flatMap((legResult: any, i: number) =>
          (legResult.flights || []).map((f: any) => ({
            ...f,
            _legIndex: i,
            _legFrom: legResult.from,
            _legTo: legResult.to,
            _legDate: legResult.date,
          })),
        );
      }
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
    // Multi-city: validate every leg has from/to/date
    if (searchParams.tripType === "MultiCity") {
      const legs = searchParams.legs || [];
      if (legs.length < 2) {
        toast.error("Multi-city needs at least 2 legs"); return;
      }
      for (let i = 0; i < legs.length; i++) {
        const l = legs[i];
        if (!l.from || !l.to || !l.date) {
          toast.error(`Leg ${i + 1}: please fill From, To and Date`); return;
        }
        if (l.from === l.to) {
          toast.error(`Leg ${i + 1}: From and To cannot be the same`); return;
        }
      }
      return runFlightSearch(searchParams);
    }

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

  // ── Sort + filter ───────────────────────────────────────────
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

  const airlines = useMemo(() => Array.from(new Set(flights.map(f => f.airline))).sort(), [flights]);
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
        <div className="flex flex-wrap gap-2 items-center">
          {(["OneWay", "RoundTrip", "MultiCity"] as const).map(t => (
            <button
              key={t}
              onClick={() =>
                setSearchParams(p => ({
                  ...p,
                  tripType: t,
                  // Seed two empty legs the first time multi-city is opened
                  legs:
                    t === "MultiCity" && (!p.legs || p.legs.length < 2)
                      ? [
                          {
                            from: p.origin,
                            fromLabel: p.originLabel,
                            to: p.destination,
                            toLabel: p.destinationLabel,
                            date: p.departureDate || todayISO(),
                          },
                          { from: "", fromLabel: "", to: "", toLabel: "", date: "" },
                        ]
                      : p.legs,
                }))
              }
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                searchParams.tripType === t
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {t === "OneWay" ? "One Way" : t === "RoundTrip" ? "Round Trip" : "Multi-City"}
            </button>
          ))}

          {/* Direct-only toggle — applies to all three trip types */}
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!searchParams.directOnly}
              onChange={e =>
                setSearchParams(p => ({ ...p, directOnly: e.target.checked }))
              }
              className="h-4 w-4 accent-primary"
            />
            Show only non-stop flights
          </label>
        </div>

        {searchParams.tripType !== "MultiCity" ? (
          /* Single airports row — One-Way / Round-Trip */
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
        ) : (
          /*
            Multi-city legs editor.
            – min 2 legs (otherwise just use one-way)
            – max 6 legs (TBO and Amadeus practical cap)
            – each leg is independent: From, To, Date
            – we auto-link consecutive legs: when leg N's "to" airport
              changes, leg N+1's "from" gets the same code so the agent
              doesn't have to retype it for a typical chain itinerary.
          */
          <div className="space-y-2.5">
            {(searchParams.legs || []).map((leg, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-12 mb-3.5 uppercase tracking-wide">
                  Leg {i + 1}
                </span>
                <AirportInput
                  label="From"
                  placeholder="City or airport"
                  value={leg.fromLabel || leg.from}
                  onChange={v =>
                    setSearchParams(p => {
                      const next = [...(p.legs || [])];
                      next[i] = { ...next[i], from: v, fromLabel: v };
                      return { ...p, legs: next };
                    })
                  }
                  onSelect={a =>
                    setSearchParams(p => {
                      const next = [...(p.legs || [])];
                      next[i] = { ...next[i], from: a.code, fromLabel: `${a.city} (${a.code})` };
                      return { ...p, legs: next };
                    })
                  }
                />
                <AirportInput
                  label="To"
                  placeholder="City or airport"
                  value={leg.toLabel || leg.to}
                  onChange={v =>
                    setSearchParams(p => {
                      const next = [...(p.legs || [])];
                      next[i] = { ...next[i], to: v, toLabel: v };
                      // Auto-fill next leg's "from" with this leg's "to"
                      if (next[i + 1] && !next[i + 1].from) {
                        next[i + 1] = { ...next[i + 1], from: v, fromLabel: v };
                      }
                      return { ...p, legs: next };
                    })
                  }
                  onSelect={a =>
                    setSearchParams(p => {
                      const next = [...(p.legs || [])];
                      const code = a.code;
                      const lbl  = `${a.city} (${a.code})`;
                      next[i] = { ...next[i], to: code, toLabel: lbl };
                      if (next[i + 1] && !next[i + 1].from) {
                        next[i + 1] = { ...next[i + 1], from: code, fromLabel: lbl };
                      }
                      return { ...p, legs: next };
                    })
                  }
                />
                <div className="flex-shrink-0">
                  {/* Show Date label on every leg row (not just the first)
                      so it's obvious what the date input is for. */}
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={leg.date}
                    min={i === 0 ? todayISO() : (searchParams.legs?.[i - 1]?.date || todayISO())}
                    onChange={e =>
                      setSearchParams(p => {
                        const next = [...(p.legs || [])];
                        next[i] = { ...next[i], date: e.target.value };
                        return { ...p, legs: next };
                      })
                    }
                    className="h-12 px-3.5 rounded-xl border border-border bg-background text-sm font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                {(searchParams.legs || []).length > 2 && (
                  <button
                    onClick={() =>
                      setSearchParams(p => ({
                        ...p,
                        legs: (p.legs || []).filter((_, idx) => idx !== i),
                      }))
                    }
                    className="h-12 w-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex-shrink-0"
                    aria-label={`Remove leg ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {/* "Add another city" / max-reached note — right-aligned so it
                sits above the Passengers + Search row that follows below,
                keeping the multi-city control cluster visually grouped to
                the right edge of the form. */}
            <div className="flex justify-end mt-1">
              {(searchParams.legs || []).length < 6 ? (
                <button
                  onClick={() =>
                    setSearchParams(p => ({
                      ...p,
                      legs: [
                        ...(p.legs || []),
                        { from: "", fromLabel: "", to: "", toLabel: "", date: "" },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-dashed border-primary/40 text-primary text-xs font-bold hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add another city
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (max 6 legs)
                  </span>
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Maximum 6 legs reached.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dates + PAX row */}
        <div className="flex flex-wrap gap-3">
          {/* Departure date — hidden in Multi-City mode because each leg
              already has its own date input above. Showing it here was
              confusing (which date is the "real" one?). */}
          {searchParams.tripType !== "MultiCity" && (
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
          )}

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
          <div className="relative flex-1 min-w-[180px]" ref={paxRef}>
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
              // Anchored to the right edge of the trigger (right-0) so the
              // 280px-wide panel grows leftward into the form area instead
              // of overflowing past the right margin of the search card.
              <div className="absolute right-0 top-full z-50 mt-1 bg-card border border-border rounded-xl shadow-xl p-4 min-w-[280px]">
                <PaxCounter label="Adults" sublabel="12+ years" value={searchParams.adults} min={1} max={9}
                  onChange={v => setSearchParams(p => ({ ...p, adults: v }))} />
                <PaxCounter label="Children" sublabel="2–11 years" value={searchParams.children} min={0} max={6}
                  onChange={v => setSearchParams(p => ({ ...p, children: v }))} />
                <PaxCounter label="Infants" sublabel="Under 2" value={searchParams.infants} min={0} max={searchParams.adults}
                  onChange={v => setSearchParams(p => ({ ...p, infants: v }))} />
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Cabin Class</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.entries(CABIN_LABELS) as [any, string][]).map(([k, v]) => (
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

      {/*
        Multi-city results render as N columns (one per leg) with an
        independent flight picker per leg and a combined-total header.
        Single-leg (One-Way / Round-Trip) keeps the existing list+filter
        layout below.
      */}
      {!loading && flights.length > 0 && searchParams.tripType === "MultiCity" && (
        <MultiCityResults
          flights={flights as any}
          onContinue={(selections) => {
            // Pre-fill the booking sheet with the first leg; the booking
            // dialog itself handles the multi-leg payload going to the
            // backend (via segments[]). For now, surface the chosen flight
            // count as confirmation; full multi-leg booking dialog is a
            // follow-up enhancement once supplier APIs accept it.
            toast.success(
              `Selected ${selections.length} flight(s) for multi-city itinerary. Multi-leg booking dialog coming next — for now, please book each leg separately.`,
            );
            if (selections[0]) setSelectedFlight(selections[0] as any);
          }}
        />
      )}

      {!loading && flights.length > 0 && searchParams.tripType !== "MultiCity" && (
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

// ─── Default export — Suspense wrapper required by Next.js ──────────────────
// `useSearchParams()` inside a client component triggers a CSR-bailout error
// during `next build` unless the consumer is wrapped in a Suspense boundary.
// We render `null` as the fallback because the inner page already handles
// its own loading states; the wrapper exists only to satisfy the build.
export default function FlightsPage() {
  return (
    <Suspense fallback={null}>
      <FlightsPageContent />
    </Suspense>
  );
}
