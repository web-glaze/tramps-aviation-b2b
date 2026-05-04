'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ════════════════════════════════════════════════════════════════════════════
// SEARCH STATE STORE — persists last search inputs + results
// localStorage key: 'tp-search-state'
// ════════════════════════════════════════════════════════════════════════════

// Pre-hydration sanity check: if the stored JSON has a 'from' field that is
// not a plain string (e.g. an object from an incompatible old store shape),
// remove the entire key so Zustand starts fresh with DEFAULTS instead of
// trying to merge corrupt data. This runs once synchronously before the store
// is created, in the browser only.
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('tp-search-state')
    if (raw) {
      const parsed = JSON.parse(raw)
      const f = parsed?.state?.flight?.from
      const sf = parsed?.state?.seriesFare?.from
      const h = parsed?.state?.hotel?.city
      // If any field is not a string (object, array, number, etc.) wipe the key
      if (
        (f !== undefined && typeof f !== 'string') ||
        (sf !== undefined && typeof sf !== 'string') ||
        (h !== undefined && typeof h !== 'string')
      ) {
        localStorage.removeItem('tp-search-state')
      }
    }
  } catch {
    // JSON.parse failed — also corrupt, remove it
    localStorage.removeItem('tp-search-state')
  }
}

// ── Shared search params shapes ──────────────────────────────────────────────

export interface FlightSearchParams {
  from: string
  to: string
  date: string
  retDate: string
  adults: number
  tripType: 'oneway' | 'roundtrip'
}

export interface SeriesFareSearchParams {
  from: string
  to: string
  date: string
  adults: number
  tripType: 'oneway' | 'roundtrip'
  returnDate: string
}

export interface HotelSearchParams {
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
}

// ── Store state ───────────────────────────────────────────────────────────────

interface SearchStateStore {
  // ── Flights ────────────────────────────────────────────────────────────────
  flight: FlightSearchParams & { results: any[]; searched: boolean }
  setFlightSearch: (params: Partial<FlightSearchParams>) => void
  setFlightResults: (results: any[], searched?: boolean) => void
  clearFlightResults: () => void

  // ── Series Fare ────────────────────────────────────────────────────────────
  seriesFare: SeriesFareSearchParams & { results: any[]; searched: boolean }
  setSeriesFareSearch: (params: Partial<SeriesFareSearchParams>) => void
  setSeriesFareResults: (results: any[], searched?: boolean) => void
  clearSeriesFareResults: () => void

  // ── Hotels ─────────────────────────────────────────────────────────────────
  hotel: HotelSearchParams & { results: any[]; searched: boolean }
  setHotelSearch: (params: Partial<HotelSearchParams>) => void
  setHotelResults: (results: any[], searched?: boolean) => void
  clearHotelResults: () => void
}

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

const dayAfter = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

const FLIGHT_DEFAULTS: FlightSearchParams & { results: any[]; searched: boolean } = {
  from: 'DEL',
  to: 'BOM',
  date: '',
  retDate: '',
  adults: 1,
  tripType: 'oneway',
  results: [],
  searched: false,
}

const SERIES_DEFAULTS: SeriesFareSearchParams & { results: any[]; searched: boolean } = {
  from: 'DEL',
  to: 'BOM',
  date: '',
  adults: 1,
  tripType: 'oneway',
  returnDate: '',
  results: [],
  searched: false,
}

const HOTEL_DEFAULTS: HotelSearchParams & { results: any[]; searched: boolean } = {
  city: '',
  checkIn: '',
  checkOut: '',
  rooms: 1,
  adults: 2,
  results: [],
  searched: false,
}

// Strip any non-serializable values (DOM nodes, React events, functions, etc.)
// from an incoming partial-update object. Prevents localStorage crashes with
// "Converting circular structure to JSON" when callers accidentally pass an
// event object instead of a plain string/number (e.g. `onClick={onSearch}`
// where `onSearch` receives the MouseEvent as its first argument).
function sanitizeParams<T extends Record<string, any>>(params: T): Partial<T> {
  const out: any = {};
  for (const k in params) {
    const v = params[k];
    const t = typeof v;
    if (v === null || v === undefined) continue;
    if (t === "string" || t === "number" || t === "boolean") {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = v;  // arrays are allowed (results)
    }
    // objects, functions, DOM nodes → silently dropped
  }
  return out;
}

export const useSearchStateStore = create<SearchStateStore>()(
  persist(
    (set) => ({
      // ── Flights ──────────────────────────────────────────────────────────
      flight: { ...FLIGHT_DEFAULTS },
      setFlightSearch: (params) =>
        set((s) => ({ flight: { ...s.flight, ...sanitizeParams(params) } })),
      setFlightResults: (results, searched = true) =>
        set((s) => ({ flight: { ...s.flight, results: Array.isArray(results) ? results : [], searched } })),
      clearFlightResults: () =>
        set((s) => ({ flight: { ...s.flight, results: [], searched: false } })),

      // ── Series Fare ───────────────────────────────────────────────────────
      seriesFare: { ...SERIES_DEFAULTS },
      setSeriesFareSearch: (params) =>
        set((s) => ({ seriesFare: { ...s.seriesFare, ...sanitizeParams(params) } })),
      setSeriesFareResults: (results, searched = true) =>
        set((s) => ({ seriesFare: { ...s.seriesFare, results: Array.isArray(results) ? results : [], searched } })),
      clearSeriesFareResults: () =>
        set((s) => ({ seriesFare: { ...s.seriesFare, results: [], searched: false } })),

      // ── Hotels ─────────────────────────────────────────────────────────────
      hotel: { ...HOTEL_DEFAULTS },
      setHotelSearch: (params) =>
        set((s) => ({ hotel: { ...s.hotel, ...sanitizeParams(params) } })),
      setHotelResults: (results, searched = true) =>
        set((s) => ({ hotel: { ...s.hotel, results: Array.isArray(results) ? results : [], searched } })),
      clearHotelResults: () =>
        set((s) => ({ hotel: { ...s.hotel, results: [], searched: false } })),
    }),
    {
      name: 'tp-search-state',
      // Limit the stored results to 50 items per module to avoid bloating localStorage.
      // Full result sets can be large (100+ flights); we only need enough to restore UX.
      partialize: (state) => ({
        flight: {
          ...state.flight,
          results: state.flight.results.slice(0, 50),
        },
        seriesFare: {
          ...state.seriesFare,
          results: state.seriesFare.results.slice(0, 50),
        },
        hotel: {
          ...state.hotel,
          results: state.hotel.results.slice(0, 50),
        },
      }),
      // Migration: sanitize any stale values that were stored as objects
      // (can happen if old code stored searchParams objects directly)
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const safeStr = (v: any, fallback: string) =>
          typeof v === 'string' ? v : fallback;
        const safeNum = (v: any, fallback: number) =>
          typeof v === 'number' && !isNaN(v) ? v : fallback;
        state.flight = {
          ...state.flight,
          from: safeStr(state.flight?.from, 'DEL'),
          to: safeStr(state.flight?.to, 'BOM'),
          date: safeStr(state.flight?.date, ''),
          retDate: safeStr(state.flight?.retDate, ''),
          adults: safeNum(state.flight?.adults, 1),
          tripType: (state.flight?.tripType === 'roundtrip' ? 'roundtrip' : 'oneway'),
          results: Array.isArray(state.flight?.results) ? state.flight.results : [],
          searched: !!state.flight?.searched,
        };
        state.seriesFare = {
          ...state.seriesFare,
          from: safeStr(state.seriesFare?.from, 'DEL'),
          to: safeStr(state.seriesFare?.to, 'BOM'),
          date: safeStr(state.seriesFare?.date, ''),
          adults: safeNum(state.seriesFare?.adults, 1),
          tripType: (state.seriesFare?.tripType === 'roundtrip' ? 'roundtrip' : 'oneway'),
          returnDate: safeStr(state.seriesFare?.returnDate, ''),
          results: Array.isArray(state.seriesFare?.results) ? state.seriesFare.results : [],
          searched: !!state.seriesFare?.searched,
        };
        state.hotel = {
          ...state.hotel,
          city: safeStr(state.hotel?.city, ''),
          checkIn: safeStr(state.hotel?.checkIn, ''),
          checkOut: safeStr(state.hotel?.checkOut, ''),
          rooms: safeNum(state.hotel?.rooms, 1),
          adults: safeNum(state.hotel?.adults, 2),
          results: Array.isArray(state.hotel?.results) ? state.hotel.results : [],
          searched: !!state.hotel?.searched,
        };
      },
    }
  )
)