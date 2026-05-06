"use client";

/**
 * useDisplayPrice — single source of truth for "what price do I render?"
 *
 * Markup is fully ADMIN-CONTROLLED. Agents (and sub-agents and anonymous
 * visitors) all see the same final price for a given product, computed as:
 *
 *     final = base + (base × adminMarkupPercent / 100)
 *
 * The admin's per-product percent comes from `usePlatformStore` (synced
 * from /admin/public-settings). The admin's per-product enable flag
 * (`markupEnabledProducts`) gates whether the markup is applied at all —
 * disabled products fall through with `applied: false`, and the search
 * pages just render the base supplier fare.
 *
 * Agent-level markup rules have been retired — they are no longer read
 * here, no longer set on the markup page, and the UI for configuring them
 * has been hidden. This keeps pricing predictable for everyone and is the
 * model the platform owner asked for.
 *
 * Usage in a card:
 *   const priceFor = useDisplayPrice("flight");
 *   const p = priceFor(flight.fare.totalFare);
 *   return <p>₹{p.display.toLocaleString("en-IN")}</p>;
 */

import { useCallback } from "react";
import { useEffect } from "react";
import { usePlatformStore } from "@/lib/store";
import { useAdminProductFlags } from "@/lib/hooks/useAdminProductFlags";

export type Product = "flight" | "hotel" | "series";

export interface PriceBreakdown {
  /** Number to actually render to the user (base + admin markup if applied). */
  display: number;
  /** Original supplier fare (before admin markup). */
  base: number;
  /** Markup amount in INR (0 when admin disabled markup or % is 0). */
  markup: number;
  /** True when the admin markup actually changed the displayed price. */
  applied: boolean;
  /** Echo of the admin's percent for this product (for debugging / display). */
  percent: number;
}

const PERCENT_FIELD: Record<Product, keyof PercentSettings> = {
  flight: "flightMarkupPercent",
  hotel:  "hotelMarkupPercent",
  series: "seriesMarkupPercent",
};

interface PercentSettings {
  flightMarkupPercent?: number;
  hotelMarkupPercent?:  number;
  seriesMarkupPercent?: number;
}

export function useDisplayPrice(product: Product) {
  const { ps, fetchIfStale } = usePlatformStore();
  const { isMarkupEnabled }  = useAdminProductFlags();

  // Lazy-fetch in case some entry-point rendered the page before the store
  // got primed. fetchIfStale is a no-op if data is fresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIfStale(); }, []);

  const adminPercent =
    Number((ps as PercentSettings)?.[PERCENT_FIELD[product]]) || 0;

  const priceFor = useCallback(
    (baseAmount: number): PriceBreakdown => {
      const base = Number(baseAmount) || 0;
      const noop = (): PriceBreakdown => ({
        display: base, base, markup: 0, applied: false, percent: adminPercent,
      });

      if (base <= 0) return noop();
      // Admin globally disabled markup for this product — never apply.
      if (!isMarkupEnabled(product)) return noop();
      // Admin set 0% — applying would be a no-op anyway, skip the math.
      if (adminPercent <= 0) return noop();

      const markup = Math.round((base * adminPercent) / 100);
      return {
        display: base + markup,
        base,
        markup,
        applied: markup > 0,
        percent: adminPercent,
      };
    },
    [adminPercent, isMarkupEnabled, product],
  );

  return priceFor;
}
