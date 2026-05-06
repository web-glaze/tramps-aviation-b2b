"use client";

/**
 * MultiCityResults
 * ────────────────
 * Renders multi-city flight search results as one column PER LEG, with an
 * independent "select one flight" picker per leg and a combined-total bar
 * at the top. The "Continue to booking" button is disabled until every
 * leg has a chosen flight.
 *
 * Why a separate component?
 *   The single-leg results UI in app/flights/page.tsx is already large
 *   (~1900 lines). Multi-city has different UX requirements — N parallel
 *   columns, per-leg selection state, combined summary — so it gets its
 *   own file. The page just delegates to this component when
 *   `searchParams.tripType === "MultiCity"`.
 *
 * Pre-fix:
 *   The first multi-city pass flattened all legs into one list and tagged
 *   each flight with `_legIndex` so the user couldn't tell which result
 *   belonged to which leg. Now each leg gets its own column.
 */

import { useMemo, useState } from "react";
import { Plane, Check, ChevronRight, Calendar, Clock } from "lucide-react";

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
};

interface FlightLite {
  id: string;
  resultToken?: string;
  airline?: string;
  airlineCode?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  stops?: number;
  price?: number;
  fare?: { customerFare?: number; totalFare?: number };
  // markers added by app/flights/page.tsx multi-city flatten step
  _legIndex?: number;
  _legFrom?: string;
  _legTo?: string;
  _legDate?: string;
}

interface Props {
  flights: FlightLite[];
  /**
   * Called when the agent clicks "Continue to booking" with one flight
   * picked per leg. Receives the chosen flight per leg in order.
   */
  onContinue?: (selections: FlightLite[]) => void;
}

export function MultiCityResults({ flights, onContinue }: Props) {
  // ── Group flights by leg ──────────────────────────────────────────
  const legs = useMemo(() => {
    const grouped: Record<number, { from: string; to: string; date: string; flights: FlightLite[] }> = {};
    for (const f of flights || []) {
      const idx = f._legIndex ?? 0;
      if (!grouped[idx]) {
        grouped[idx] = {
          from: f._legFrom || f.from || "",
          to: f._legTo || f.to || "",
          date: f._legDate || "",
          flights: [],
        };
      }
      grouped[idx].flights.push(f);
    }
    return Object.keys(grouped)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b)
      .map((k) => ({ index: k, ...grouped[k] }));
  }, [flights]);

  // ── Per-leg selection state ───────────────────────────────────────
  // Maps legIndex → flightId
  const [picks, setPicks] = useState<Record<number, string>>({});

  const allLegsPicked = legs.length > 0 && legs.every((l) => !!picks[l.index]);

  const totalFare = useMemo(() => {
    return legs.reduce((sum, leg) => {
      const picked = leg.flights.find((f) => f.id === picks[leg.index]);
      const price =
        picked?.fare?.customerFare ?? picked?.price ?? picked?.fare?.totalFare ?? 0;
      return sum + (price || 0);
    }, 0);
  }, [legs, picks]);

  if (!flights || flights.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl py-16 text-center">
        <Plane className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-semibold">No flights found for this multi-city itinerary</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try different dates or different sectors.
        </p>
      </div>
    );
  }

  if (legs.length === 0) {
    // Defensive — flights present but no leg metadata. Bail to a single
    // list so the agent isn't stranded with no UI.
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
        Search returned flights but the multi-city leg metadata is missing.
        Please re-run the search. (See backend/flights.service → searchMultiCity.)
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Combined total bar ──────────────────────────────────── */}
      <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Itinerary Total
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {legs.map((leg, i) => {
              const picked = leg.flights.find((f) => f.id === picks[leg.index]);
              return (
                <span key={leg.index} className="flex items-center gap-1.5 text-xs">
                  <span className={`px-2 py-0.5 rounded-md font-bold ${
                    picked
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {leg.from} → {leg.to}
                  </span>
                  {picked ? (
                    <span className="font-semibold">{fmtINR(picked.fare?.customerFare ?? picked.price ?? 0)}</span>
                  ) : (
                    <span className="text-muted-foreground italic">not picked</span>
                  )}
                  {i < legs.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </span>
              );
            })}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Combined fare</p>
          <p className="text-2xl font-bold text-primary font-display">{fmtINR(totalFare)}</p>
        </div>
        <button
          onClick={() => {
            if (!allLegsPicked || !onContinue) return;
            const selections = legs.map((l) => l.flights.find((f) => f.id === picks[l.index])!).filter(Boolean);
            onContinue(selections);
          }}
          disabled={!allLegsPicked}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all"
        >
          {allLegsPicked
            ? "Continue to booking →"
            : `Pick ${legs.length - Object.keys(picks).length} more flight(s)`}
        </button>
      </div>

      {/* ── Per-leg result columns ──────────────────────────────────
          Responsive grid that auto-adapts to the number of legs:
            1 leg  → full width (no point splitting a single column)
            2 legs → 50/50 from `lg` upward
            3 legs → 33/33/33 from `lg` upward
            4-6 legs → max 3 per row; extras wrap to a new row
          Mobile stays single-column throughout so each leg's flight
          list keeps a sensible touch-friendly width. */}
      <div
        className={
          legs.length === 1
            ? "grid grid-cols-1 gap-4"
            : legs.length === 2
              ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {legs.map((leg) => (
          <div key={leg.index} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Leg header */}
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Leg {leg.index + 1}
                </span>
                <span className="text-sm font-bold">
                  {leg.from} → {leg.to}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(leg.date)}
                </span>
                <span>·</span>
                <span>
                  {leg.flights.length} option{leg.flights.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Flight options */}
            {leg.flights.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No flights available for this leg.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {leg.flights.map((f) => {
                  const isPicked = picks[leg.index] === f.id;
                  const price = f.fare?.customerFare ?? f.price ?? 0;
                  return (
                    <button
                      key={f.id}
                      onClick={() =>
                        setPicks((p) => ({ ...p, [leg.index]: f.id }))
                      }
                      className={`w-full text-left p-3 transition-all ${
                        isPicked
                          ? "bg-primary/5 border-l-4 border-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-bold">{f.airline}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {f.flightNo}
                            </span>
                            {isPicked && (
                              <span className="ml-auto h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <span>{f.departure}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{f.arrival}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {f.duration || "—"}
                            </span>
                            <span>·</span>
                            <span>
                              {f.stops === 0 || f.stops === undefined
                                ? "Non-stop"
                                : `${f.stops} stop`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{fmtINR(price)}</p>
                          <p className="text-[10px] text-muted-foreground">per pax</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
