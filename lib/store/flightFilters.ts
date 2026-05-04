'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ════════════════════════════════════════════════════════════════════════════
// STORE — FLIGHT / SERIES-FARE FILTERS
// localStorage key: 'tp-flight-filters'
//
// Why a dedicated store:
//   The filters used to live in local useState on the search page. When the
//   agent navigated away (e.g. into the booking dialog, to dashboard, or to
//   My Bookings) and came back, every selection was lost because the page
//   unmounted. Persisting through Zustand survives unmounts AND reloads.
//
// Usage:
//   const {
//     sortBy, setSortBy,
//     filterStop, setFilterStop,
//     ...etc
//     resetFilters,
//   } = useFlightFiltersStore()
// ════════════════════════════════════════════════════════════════════════════

export interface FlightFiltersState {
  sortBy:        string
  filterStop:    string
  filterRef:     string
  filterCabin:   string
  filterAirline: string
  maxPrice:      number   // 0 = no cap (defaults to route max)

  setSortBy:        (v: string) => void
  setFilterStop:    (v: string) => void
  setFilterRef:     (v: string) => void
  setFilterCabin:   (v: string) => void
  setFilterAirline: (v: string) => void
  setMaxPrice:      (v: number) => void

  hasActiveFilters: () => boolean
  resetFilters:     () => void
}

const DEFAULTS = {
  sortBy:        'price',
  filterStop:    'all',
  filterRef:     'all',
  filterCabin:   'all',
  filterAirline: 'all',
  maxPrice:      0,
}

export const useFlightFiltersStore = create<FlightFiltersState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setSortBy:        (v) => set({ sortBy: v }),
      setFilterStop:    (v) => set({ filterStop: v }),
      setFilterRef:     (v) => set({ filterRef: v }),
      setFilterCabin:   (v) => set({ filterCabin: v }),
      setFilterAirline: (v) => set({ filterAirline: v }),
      setMaxPrice:      (v) => set({ maxPrice: v }),

      hasActiveFilters: () => {
        const s = get()
        return (
          s.sortBy        !== DEFAULTS.sortBy        ||
          s.filterStop    !== DEFAULTS.filterStop    ||
          s.filterRef     !== DEFAULTS.filterRef     ||
          s.filterCabin   !== DEFAULTS.filterCabin   ||
          s.filterAirline !== DEFAULTS.filterAirline ||
          s.maxPrice      !== DEFAULTS.maxPrice
        )
      },

      resetFilters: () => set({ ...DEFAULTS }),
    }),
    { name: 'tp-flight-filters' }
  )
)
